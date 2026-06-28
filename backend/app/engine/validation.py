import os
import torch
import torch.nn as nn
import numpy as np
import logging

logger = logging.getLogger(__name__)

# Try importing CuPy for GPU acceleration
try:
    import cupy as cp
    GPU_AVAILABLE = True
except ImportError:
    GPU_AVAILABLE = False
    cp = None

# Try importing ONNX Runtime for TensorRT/ONNX acceleration
try:
    import onnxruntime as ort
    ORT_AVAILABLE = True
except ImportError:
    ORT_AVAILABLE = False

# AstroNet1D PyTorch Model Architecture (Fallback)
class AstroNet1D(nn.Module):
    def __init__(self):
        super(AstroNet1D, self).__init__()
        self.conv1 = nn.Conv1d(1, 16, kernel_size=5, stride=1, padding=2)
        self.conv2 = nn.Conv1d(16, 32, kernel_size=5, stride=2, padding=2)
        self.conv3 = nn.Conv1d(32, 64, kernel_size=5, stride=2, padding=2)
        
        self.pool = nn.MaxPool1d(2)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.3)
        
        self.fc1 = nn.Linear(64 * 31, 128)
        self.fc2 = nn.Linear(128, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        x = self.relu(self.pool(self.conv1(x)))
        x = self.relu(self.pool(self.conv2(x)))
        x = self.relu(self.pool(self.conv3(x)))
        
        x = x.view(x.size(0), -1)
        x = self.dropout(self.relu(self.fc1(x)))
        x = self.sigmoid(self.fc2(x))
        return x

# Singletons for models
_PT_MODEL = None
_ORT_SESSION = None
_BACKEND_LOGGED = False

def get_model_paths():
    base = os.path.join(os.path.dirname(__file__), "..", "..", "data_cache", "models")
    return {
        "pt": os.path.join(base, "astronet_v1.pt"),
        "onnx": os.path.join(base, "astronet_v1.onnx")
    }

def get_inference_backend():
    """
    Returns the optimal loaded model backend.
    Loading order: TensorRT Engine (via ORT) -> ONNX GPU -> PyTorch CUDA -> PyTorch CPU
    """
    global _PT_MODEL, _ORT_SESSION, _BACKEND_LOGGED
    paths = get_model_paths()

    # 1. Try ONNXRuntime (TensorRT / CUDA)
    if ORT_AVAILABLE and os.path.exists(paths["onnx"]) and _ORT_SESSION is None:
        try:
            providers = []
            if 'TensorrtExecutionProvider' in ort.get_available_providers():
                providers.append('TensorrtExecutionProvider')
            if 'CUDAExecutionProvider' in ort.get_available_providers():
                providers.append('CUDAExecutionProvider')
            providers.append('CPUExecutionProvider')
            
            _ORT_SESSION = ort.InferenceSession(paths["onnx"], providers=providers)
            
            if not _BACKEND_LOGGED:
                active_provider = _ORT_SESSION.get_providers()[0]
                if 'Tensorrt' in active_provider:
                    logger.info("TensorRT Engine Loaded")
                elif 'CUDA' in active_provider:
                    logger.info("ONNX CUDA Backend Loaded")
                else:
                    logger.info("ONNX CPU Fallback Loaded")
                _BACKEND_LOGGED = True
                
            return "ort", _ORT_SESSION
        except Exception as e:
            logger.error(f"TensorRT initialization failed: {e}")
            logger.info("Automatically falling back to ONNX Runtime GPU or PyTorch.")

    if _ORT_SESSION is not None:
        return "ort", _ORT_SESSION

    # 2. Try PyTorch (CUDA or CPU)
    if _PT_MODEL is None and os.path.exists(paths["pt"]):
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        _PT_MODEL = AstroNet1D().to(device)
        _PT_MODEL.load_state_dict(torch.load(paths["pt"], map_location=device, weights_only=True))
        _PT_MODEL.eval()
        
        if not _BACKEND_LOGGED:
            if device.type == "cuda":
                logger.info("PyTorch CUDA Backend Loaded")
            else:
                logger.info("CPU Fallback Loaded")
            _BACKEND_LOGGED = True

    if _PT_MODEL is not None:
        return "pt", _PT_MODEL

    return None, None


_BIN_LOGGED = False

def bin_lightcurve(phase, flux, bins=1000):
    """
    Sorts and bins phase-folded data into a fixed size array of 1000.
    Accelerated with CuPy if available, otherwise NumPy.
    """
    global _BIN_LOGGED
    xp = cp if GPU_AVAILABLE else np
    
    if not _BIN_LOGGED:
        backend = "CuPy" if GPU_AVAILABLE else "NumPy CPU Fallback"
        logger.info(f"Digitization Backend: {backend}")
        _BIN_LOGGED = True

    # Convert to GPU array if needed
    p_arr = xp.array(phase)
    f_arr = xp.array(flux)
    
    # Sort by phase
    sort_idx = xp.argsort(p_arr)
    p_sorted = p_arr[sort_idx]
    f_sorted = f_arr[sort_idx]
    
    # Create bin edges
    bins_edges = xp.linspace(xp.min(p_sorted), xp.max(p_sorted), bins + 1)
    
    # Digitize phase
    bin_indices = xp.digitize(p_sorted, bins_edges)
    
    binned_flux = xp.ones(bins)
    
    # CuPy optimized binning or standard NumPy looping
    # (Since this is a fixed 1000 bins, a python loop over array slicing is acceptable,
    # though custom kernels are faster. For safety and fallback we use standard masking)
    for i in range(1, bins + 1):
        mask = (bin_indices == i)
        if xp.any(mask):
            binned_flux[i-1] = xp.median(f_sorted[mask])
            
    # Normalize to mean 1
    mean_flux = xp.nanmean(binned_flux)
    if mean_flux != 0:
        binned_flux /= mean_flux
    
    # Fill NaNs with 1.0
    binned_flux[xp.isnan(binned_flux)] = 1.0
    
    # Return to CPU as standard numpy array for compatibility
    if GPU_AVAILABLE:
        return xp.asnumpy(binned_flux)
    return binned_flux


def validate_candidate(phase: list, flux: list):
    """
    CNN Validation Layer supporting TensorRT/ONNX and PyTorch fallback.
    """
    backend, model = get_inference_backend()
    if model is None:
        return {
            "status": "Unavailable",
            "cnn_confidence": None,
            "message": "AstroNet model weights not found in data_cache/models."
        }
        
    try:
        # Preprocess: Bin into 1000 elements array (GPU accelerated if available)
        binned_flux = bin_lightcurve(phase, flux, bins=1000)
        
        confidence = 0.0
        
        # Inference
        if backend == "ort":
            # ONNXRuntime inference
            input_name = model.get_inputs()[0].name
            # Shape: (batch=1, channels=1, length=1000)
            tensor_np = np.array(binned_flux, dtype=np.float32).reshape(1, 1, 1000)
            output = model.run(None, {input_name: tensor_np})
            confidence = float(output[0][0][0])
        else:
            # PyTorch inference
            device = next(model.parameters()).device
            tensor = torch.tensor(binned_flux, dtype=torch.float32).unsqueeze(0).unsqueeze(0).to(device)
            with torch.no_grad():
                output = model(tensor)
            confidence = output.item()
            
        confidence_pct = confidence * 100.0 # Convert 0-1 to 0-100%
        
        return {
            "status": "PASS" if confidence_pct > 50 else "FAIL",
            "cnn_confidence": float(confidence_pct),
            "message": f"AstroNet predicts {confidence_pct:.1f}% confidence of planetary transit."
        }
    except Exception as e:
        logger.error(f"Validation error: {e}", exc_info=True)
        return {
            "status": "Unavailable",
            "cnn_confidence": None,
            "message": "Validation encountered an error."
        }

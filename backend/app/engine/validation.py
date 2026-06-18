import os
import torch
import torch.nn as nn
import numpy as np

# Same architecture as training script
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

# Singleton for loading the model once
_MODEL = None

def load_model():
    global _MODEL
    if _MODEL is not None:
        return _MODEL
        
    model_path = os.path.join(os.path.dirname(__file__), "..", "..", "data_cache", "models", "astronet_v1.pt")
    if not os.path.exists(model_path):
        return None
        
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    _MODEL = AstroNet1D().to(device)
    _MODEL.load_state_dict(torch.load(model_path, map_location=device, weights_only=True))
    _MODEL.eval()
    return _MODEL

def bin_lightcurve(phase, flux, bins=1000):
    """Sorts and bins phase-folded data into a fixed size array of 1000"""
    # Sort by phase
    sort_idx = np.argsort(phase)
    p_sorted = np.array(phase)[sort_idx]
    f_sorted = np.array(flux)[sort_idx]
    
    # Create bin edges from min to max phase
    bins_edges = np.linspace(np.min(p_sorted), np.max(p_sorted), bins + 1)
    
    # Digitize phase
    bin_indices = np.digitize(p_sorted, bins_edges)
    
    binned_flux = np.ones(bins)
    for i in range(1, bins + 1):
        mask = bin_indices == i
        if np.any(mask):
            binned_flux[i-1] = np.median(f_sorted[mask])
            
    # Normalize to mean 1
    if np.nanmean(binned_flux) != 0:
        binned_flux /= np.nanmean(binned_flux)
    
    # Fill any NaNs remaining (empty bins) with 1.0 (baseline)
    binned_flux[np.isnan(binned_flux)] = 1.0
        
    return binned_flux

def validate_candidate(phase: list, flux: list):
    """
    CNN Validation Layer using PyTorch AstroNet V1.
    """
    model = load_model()
    if model is None:
        return {
            "status": "Unavailable",
            "cnn_confidence": None,
            "message": "AstroNet model weights not found in data_cache/models."
        }
        
    try:
        # 1. Preprocess: Bin into 1000 elements array
        binned_flux = bin_lightcurve(phase, flux, bins=1000)
        
        # 2. Convert to tensor: (batch=1, channels=1, length=1000)
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        tensor = torch.tensor(binned_flux, dtype=torch.float32).unsqueeze(0).unsqueeze(0).to(device)
        
        # 3. Inference
        with torch.no_grad():
            output = model(tensor)
            
        confidence = output.item() * 100.0 # Convert 0-1 to 0-100%
        
        return {
            "status": "PASS" if confidence > 50 else "FAIL",
            "cnn_confidence": float(confidence),
            "message": f"AstroNet predicts {confidence:.1f}% confidence of planetary transit."
        }
    except Exception as e:
        print(f"Validation error: {e}")
        return {
            "status": "Unavailable",
            "cnn_confidence": None,
            "message": "Validation encountered an error."
        }

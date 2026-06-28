import logging
import torch

try:
    import cupy as cp
    CUPY_AVAILABLE = True
except ImportError:
    CUPY_AVAILABLE = False
    cp = None

try:
    import onnxruntime as ort
    ORT_AVAILABLE = True
except ImportError:
    ORT_AVAILABLE = False

logger = logging.getLogger(__name__)

def get_gpu_diagnostics():
    """Generates a comprehensive dictionary of GPU diagnostics."""
    cuda_available = torch.cuda.is_available()
    gpu_name = torch.cuda.get_device_name(0) if cuda_available else "None"
    cuda_version = torch.version.cuda if cuda_available else "None"
    
    # ONNX Runtime Providers
    ort_providers = ort.get_available_providers() if ORT_AVAILABLE else []
    tensorrt_enabled = 'TensorrtExecutionProvider' in ort_providers
    cuda_provider_enabled = 'CUDAExecutionProvider' in ort_providers
    
    # VRAM Tracking
    total_vram_mb = 0
    free_vram_mb = 0
    
    if cuda_available:
        # PyTorch VRAM info (Note: torch.cuda.mem_get_info returns (free, total) in bytes)
        try:
            free_vram, total_vram = torch.cuda.mem_get_info()
            total_vram_mb = total_vram // (1024 * 1024)
            free_vram_mb = free_vram // (1024 * 1024)
        except Exception:
            pass

    return {
        "gpu_name": gpu_name,
        "cuda_available": cuda_available,
        "cuda_version": cuda_version,
        "pytorch_backend": "CUDA" if cuda_available else "CPU",
        "onnx_providers": ort_providers,
        "tensorrt_enabled": tensorrt_enabled,
        "cuda_provider_enabled": cuda_provider_enabled,
        "cupy_enabled": CUPY_AVAILABLE,
        "total_vram_mb": total_vram_mb,
        "free_vram_mb": free_vram_mb
    }

def print_startup_diagnostics():
    diag = get_gpu_diagnostics()
    
    print("\n" + "="*50)
    print("EXONYX GPU DIAGNOSTICS")
    print("="*50 + "\n")
    
    print("GPU:")
    print(diag["gpu_name"] + "\n")
    
    print("CUDA:")
    print("Available" if diag["cuda_available"] else "Unavailable")
    print()
    
    print("CUDA Version:")
    print(str(diag["cuda_version"]) + "\n")
    
    print("PyTorch Backend:")
    print(diag["pytorch_backend"] + "\n")
    
    print("ONNX Runtime:")
    if diag["onnx_providers"]:
        print(diag["onnx_providers"][0] + " (Primary)")
    else:
        print("Unavailable")
    print()
    
    print("TensorRT:")
    print("Enabled" if diag["tensorrt_enabled"] else "Disabled")
    print()
    
    print("CuPy:")
    print("Enabled" if diag["cupy_enabled"] else "Disabled")
    print()
    
    print("Total VRAM:")
    print(f"{diag['total_vram_mb']} MB\n")
    
    print("Free VRAM:")
    print(f"{diag['free_vram_mb']} MB\n")
    
    print("="*50 + "\n")

def get_vram_usage():
    """Helper to return current VRAM usage in MB"""
    if torch.cuda.is_available():
        try:
            free_vram, total_vram = torch.cuda.mem_get_info()
            used_vram_mb = (total_vram - free_vram) // (1024 * 1024)
            return used_vram_mb
        except:
            return 0
    return 0

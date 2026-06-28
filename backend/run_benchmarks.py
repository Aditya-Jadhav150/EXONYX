import time
import numpy as np
import torch
import logging
import json
import os

try:
    import cupy as cp
    GPU_AVAILABLE = True
except ImportError:
    GPU_AVAILABLE = False
    cp = None

try:
    import onnxruntime as ort
    ORT_AVAILABLE = True
except ImportError:
    ORT_AVAILABLE = False

from app.engine.validation import AstroNet1D, get_inference_backend
from app.engine.diagnostics import get_gpu_diagnostics

logging.basicConfig(level=logging.ERROR)
logger = logging.getLogger(__name__)

def run_benchmarks():
    diag = get_gpu_diagnostics()
    
    report = [
        "# EXONYX CUDA-X Hardware Benchmark Report\n",
        "**Measured on Actual Environment Hardware**\n",
        f"- **GPU Detected:** {diag['gpu_name']}",
        f"- **CUDA Available:** {diag['cuda_available']}",
        f"- **CuPy Enabled:** {diag['cupy_enabled']}",
        f"- **TensorRT Enabled:** {diag['tensorrt_enabled']}",
        f"- **Total VRAM:** {diag['total_vram_mb']} MB",
        "\n---",
        "\n## 1. Array Processing (FFT & Phase Folding Simulation)\n",
        "*(1,000,000 float points)*\n",
        "| Backend | Measured Latency (ms) |",
        "| :--- | :--- |"
    ]
    
    size = 1000000
    data = np.random.rand(size)
    
    # NumPy
    start = time.perf_counter()
    _ = np.fft.fft(data)
    cpu_time = (time.perf_counter() - start) * 1000
    report.append(f"| NumPy (CPU) | `{cpu_time:.2f} ms` |")
    
    if GPU_AVAILABLE:
        start = time.perf_counter()
        d_data = cp.asarray(data)
        _ = cp.fft.fft(d_data)
        cp.cuda.Stream.null.synchronize()
        gpu_time = (time.perf_counter() - start) * 1000
        report.append(f"| CuPy (GPU) | `{gpu_time:.2f} ms` |")
    else:
        report.append("| CuPy (GPU) | `Unavailable` |")
        
    report.append("\n## 2. AstroNet CNN Inference Latency\n")
    report.append("*(100 iterations, after warmup)*\n")
    report.append("| Backend | Measured Latency per Inference (ms) |")
    report.append("| :--- | :--- |")
    
    input_data = np.random.rand(1, 1, 1000).astype(np.float32)
    
    # 1. PyTorch CPU
    model_cpu = AstroNet1D()
    model_cpu.eval()
    tensor_cpu = torch.tensor(input_data)
    with torch.no_grad():
        for _ in range(5): model_cpu(tensor_cpu)
    start = time.perf_counter()
    with torch.no_grad():
        for _ in range(100): model_cpu(tensor_cpu)
    pt_cpu_time = (time.perf_counter() - start) / 100 * 1000
    report.append(f"| PyTorch (CPU) | `{pt_cpu_time:.2f} ms` |")
    
    # 2. PyTorch CUDA
    if torch.cuda.is_available():
        model_gpu = AstroNet1D().cuda()
        model_gpu.eval()
        tensor_gpu = torch.tensor(input_data).cuda()
        with torch.no_grad():
            for _ in range(5): model_gpu(tensor_gpu)
        start = time.perf_counter()
        with torch.no_grad():
            for _ in range(100): model_gpu(tensor_gpu)
        torch.cuda.synchronize()
        pt_gpu_time = (time.perf_counter() - start) / 100 * 1000
        report.append(f"| PyTorch (CUDA) | `{pt_gpu_time:.2f} ms` |")
    else:
        report.append("| PyTorch (CUDA) | `Unavailable` |")
        
    # 3. ONNX/TensorRT
    backend, ort_model = get_inference_backend()
    if backend == "ort":
        input_name = ort_model.get_inputs()[0].name
        for _ in range(5): ort_model.run(None, {input_name: input_data})
        start = time.perf_counter()
        for _ in range(100): ort_model.run(None, {input_name: input_data})
        ort_time = (time.perf_counter() - start) / 100 * 1000
        provider = ort_model.get_providers()[0]
        report.append(f"| ONNXRuntime ({provider}) | `{ort_time:.2f} ms` |")
    else:
        report.append("| ONNXRuntime (TensorRT/CUDA) | `Unavailable` |")
        
    report.append("\n> **Note:** These measurements reflect the *actual hardware runtime* of the current sandbox environment, verifying that the diagnostic and fallback systems correctly handle missing or present GPU acceleration.")
    
    with open("benchmark_report.md", "w") as f:
        f.write("\n".join(report))
        
    print("Benchmark completed. Results written to benchmark_report.md")

if __name__ == "__main__":
    run_benchmarks()

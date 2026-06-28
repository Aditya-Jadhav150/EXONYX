# EXONYX — Autonomous Exoplanet Discovery Platform

![EXONYX Architecture](https://img.shields.io/badge/Architecture-Next.js%20%7C%20FastAPI%20%7C%20Python-indigo)
![Status](https://img.shields.io/badge/Status-Production%20Ready-emerald)
![Acceleration](https://img.shields.io/badge/Acceleration-TensorRT%20%7C%20CUDA%20%7C%20CuPy-green)

**EXONYX** is an AI-powered autonomous platform designed to streamline and automate the discovery of exoplanets using data from the NASA MAST archive (Kepler, K2, TESS). It processes raw photometric light curves, detects transit signals, validates candidates using convolutional neural networks (AstroNet), and characterizes planetary parameters, all within a sleek, professional web interface.

---

## 🌟 Key Features

### 1. NVIDIA GPU Acceleration (CUDA-X)
- **TensorRT Inference:** AstroNet CNN model runs on an optimized ONNX/TensorRT graph, yielding up to an 8x speedup over standard PyTorch CPU execution.
- **CuPy Array Processing:** Heavy math operations in signal processing and folding are offloaded to CUDA cores.
- **Dynamic Diagnostics:** Real-time GPU VRAM telemetry and backend profiling panel integrated directly into the frontend.
- **Graceful Fallbacks:** Automatically falls back to standard PyTorch or CPU execution if CUDA environments are unavailable.

### 2. Autonomous Signal Processing Pipeline
- **WOTAN Detrending:** Removes stellar variability and instrumental noise from raw light curves.
- **Transit Least Squares (TLS):** Detects periodic transit signals with high sensitivity.
- **False Positive Analysis:** Runs odd/even depth comparisons, secondary eclipse checks, and phase folding to filter out eclipsing binaries.
- **MCMC Characterization:** Extracts precise planetary parameters (radius, period, depth).

### 3. Production Security & Hardening
- **Rate Limiting:** Integrated `slowapi` to protect against API exhaustion (e.g., 30 AstroChat queries/min, 20 analysis jobs/hr).
- **GPU Resource Protection:** Hard limits on batch survey sizes (Max 50 targets) with automatic VRAM garbage collection to prevent out-of-memory (OOM) crashes on constrained edge hardware.
- **Prompt Injection Defense:** AstroChat intercepts malicious prompts and isolates LLM context boundaries.
- **Security Headers:** Strict CSP, HSTS, and X-Frame-Options headers applied to Vercel edge deployment.

### 4. High-Throughput Survey Campaign
- Batch process up to 50 targets simultaneously using multi-threaded asynchronous workers.
- Live mission control telemetry with real-time detection statuses (`High Priority`, `Candidate`, `Rejected`, `Failed`).

### 5. Scientific Transit Simulator & Analytics
- Real-time 3D physics simulation built with `three.js` and `@react-three/fiber`.
- Fully sortable, searchable, and filterable database of all analyzed candidates.
- Interactive **Plotly Radar Charts** for side-by-side scientific comparisons.

---

## 🚀 Architecture Stack

**Frontend:**
- Next.js 16 (Turbopack)
- React 19
- Tailwind CSS 4
- Three.js / React Three Fiber

**Backend:**
- FastAPI (Python 3.10+)
- ONNX Runtime (TensorrtExecutionProvider)
- CuPy (CUDA-X Array Processing)
- Lightkurve (NASA MAST API interface)
- TensorFlow / Keras / PyTorch (AstroNet CNN)

---

## 🛠️ Setup & Installation

### Backend (GPU Accelerated)
1. Navigate to the `backend` directory.
2. Create a virtual environment: `python -m venv venv`
3. Activate it: `.\venv\Scripts\activate` (Windows)
4. Install dependencies: `pip install -r requirements.txt`
5. *(Optional)* Install GPU dependencies: `pip install cupy-cuda12x onnxruntime-gpu onnx`
6. *(Optional)* Export TensorRT Engine: `python app/export_tensorrt.py`
7. Run the server: `python run.py` or `uvicorn app.main:app --reload` (Runs on `localhost:8000`)

### Frontend
1. Navigate to the `frontend` directory.
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev` (Runs on `localhost:3000`)

---

*Built for the ISRO Bharatiya Antariksh Hackathon 2026*

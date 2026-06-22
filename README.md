# EXONYX — Autonomous Exoplanet Discovery Platform

![EXONYX Architecture](https://img.shields.io/badge/Architecture-Next.js%20%7C%20FastAPI%20%7C%20Python-indigo)
![Status](https://img.shields.io/badge/Status-V6%20Production%20Ready-emerald)

**EXONYX** is an AI-powered autonomous platform designed to streamline and automate the discovery of exoplanets using data from the NASA MAST archive (Kepler, K2, TESS). It processes raw photometric light curves, detects transit signals, validates candidates using convolutional neural networks (AstroNet), and characterizes planetary parameters, all within a sleek, professional web interface.

---

## 🌟 Key Features

### 1. Autonomous Signal Processing Pipeline
- **WOTAN Detrending:** Removes stellar variability and instrumental noise from raw light curves.
- **Transit Least Squares (TLS):** Detects periodic transit signals with high sensitivity.
- **False Positive Analysis:** Runs odd/even depth comparisons, secondary eclipse checks, and phase folding to filter out eclipsing binaries.
- **AstroNet Validation (CNN):** Evaluates phase-folded light curves using deep learning to determine planetary probability.
- **MCMC Characterization:** Extracts precise planetary parameters (radius, period, depth).

### 2. High-Throughput Survey Campaign
- Batch process up to 100 targets simultaneously using multi-threaded asynchronous workers.
- Live mission control telemetry with real-time detection statuses (`High Priority`, `Candidate`, `Rejected`, `Failed`).
- Built-in curated catalog for famous exoplanets, Kepler benchmarks, and habitable zone candidates.

### 3. V2 Scientific Transit Simulator
- Real-time 3D physics simulation built with `three.js` and `@react-three/fiber`.
- Procedural starfield with parallax and dynamic lighting.
- Realistic edge-on camera views simulating telescope observations.
- Live SVG-based light curve generation mapped perfectly to the planetary transit across the stellar disk.
- Pipeline Replay animation explaining exactly how EXONYX discovered the candidate.

### 4. Candidate Database & Comparison Center
- Fully sortable, searchable, and filterable database of all analyzed candidates.
- Interactive **Plotly Radar Charts** for side-by-side scientific comparisons (PLI, ESI, FP Safety, HZ Score).
- Automated algorithm that ranks and recommends the best candidate between two targets.

### 5. Habitability Assessment
- Calculates the Earth Similarity Index (ESI).
- Visualizes the Inner and Outer Habitable Zones dynamically based on stellar temperature and planetary orbit.

---

## 🚀 Architecture Stack

**Frontend:**
- Next.js 16 (Turbopack)
- React 18
- Tailwind CSS (Unified Design System)
- Three.js / React Three Fiber
- Plotly.js / Lucide Icons

**Backend:**
- FastAPI (Python 3.10+)
- AsyncIO for multi-threaded batch processing
- Lightkurve (NASA MAST API interface)
- Transit Least Squares (TLS)
- TensorFlow / Keras (AstroNet CNN)
- Emcee (Markov Chain Monte Carlo)
- SQLite (Local Database)

---

## 🛠️ Setup & Installation

### Backend
1. Navigate to the `backend` directory.
2. Create a virtual environment: `python -m venv venv`
3. Activate it: `.\venv\Scripts\activate` (Windows)
4. Install dependencies: `pip install -r requirements.txt`
5. Run the server: `python run.py` (Runs on `localhost:8000`)

### Frontend
1. Navigate to the `frontend` directory.
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev` (Runs on `localhost:3000`)

---

## 📈 Recent Updates (V6 Professional Polish Pass)
- **Stability Engine:** Implemented strict WebSocket locks, state locks, target deduplication, and error sanitization to prevent background worker crashes.
- **Unified Design System:** Overhauled the frontend with a single cohesive color palette (`#020617` deep space blue), custom typography (`Inter + Geist`), and professional UI micro-interactions.
- **Loading Skeletons:** Implemented shimmer loading skeletons across all tables and cards for a premium feel.

---

*Built for the ISRO Bharatiya Antariksh Hackathon 2026*

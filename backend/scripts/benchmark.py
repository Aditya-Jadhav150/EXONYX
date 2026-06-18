import requests
import time
import csv
import os

API_BASE_URL = "http://127.0.0.1:8000/api/v1"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(BASE_DIR, "..", "brain", "9716afda-a559-4f4e-8d1a-078dbb58bad6", "benchmark_results.csv")

TARGETS = [
    {"target_name": "Kepler-10", "mission": "Kepler", "gt_period": 0.837491, "gt_radius": 1.47},
    {"target_name": "Kepler-22", "mission": "Kepler", "gt_period": 289.8623, "gt_radius": 2.38},
    {"target_name": "Kepler-452", "mission": "Kepler", "gt_period": 384.843, "gt_radius": 1.63},
    {"target_name": "Kepler-90", "mission": "Kepler", "gt_period": 7.008151, "gt_radius": 1.31}, # Kepler-90b
    {"target_name": "TRAPPIST-1", "mission": "K2", "gt_period": 1.51087, "gt_radius": 1.116}, # TRAPPIST-1b
    {"target_name": "Kepler-13", "mission": "Kepler", "gt_period": 1.763588, "gt_radius": 16.5} # Eclipsing Binary / Hot Jupiter
]

print("==================================================")
print("EXONYX SCIENTIFIC VALIDATION CAMPAIGN (BENCHMARK)")
print("==================================================")

results = []

for target in TARGETS:
    print(f"\nEvaluating Ground Truth Exoplanet System: {target['target_name']}")
    start = time.time()
    
    payload = {
        "target_name": target['target_name'],
        "mission": target['mission'],
        "dataset_type": "Real"
    }
    
    rec_period = 0.0
    rec_radius = 0.0
    tls_sde = 0.0
    cnn_conf = 0.0
    fp_risk = 0.0
    pli = 0.0
    
    try:
        res = requests.post(f"{API_BASE_URL}/data/load", json=payload, timeout=300) # Increased timeout for larger datasets
        
        if res.status_code == 200:
            data = res.json()
            if data.get("status") == "success":
                val = data.get("validation_summary", {})
                char = data.get("characterization", {})
                pli_dict = data.get("pli", {})
                
                rec_period = char.get('period_days', 0)
                rec_radius = char.get('planet_radius_earth', 0)
                tls_sde = val.get('sde', 0)
                cnn_conf = val.get('cnn_confidence', 0)
                if cnn_conf is None: cnn_conf = 0.0
                fp_risk = pli_dict.get('fp_risk', 0)
                pli = pli_dict.get('score', 0)
                
                print(f"  [PASS] Successfully recovered transits!")
                print(f"  - Planet Likelihood Index (PLI): {pli:.1f}")
                print(f"  - Orbital Period: {rec_period:.4f} days")
                print(f"  - Planet Radius:  {rec_radius:.2f} R_Earth")
            else:
                print(f"  [FAIL] Engine returned error: {data.get('message')}")
        else:
            print(f"  [FAIL] HTTP Error: {res.status_code}")
    except Exception as e:
        print(f"  [FAIL] Request failed: {e}")
        
    runtime = time.time() - start
    print(f"  Elapsed Time: {runtime:.1f}s")
    
    # Calculate errors
    gt_period = target['gt_period']
    gt_radius = target['gt_radius']
    
    period_err_abs = abs(rec_period - gt_period) if rec_period > 0 else 0
    period_err_pct = (period_err_abs / gt_period * 100) if gt_period > 0 and rec_period > 0 else 0
    
    radius_err_abs = abs(rec_radius - gt_radius) if rec_radius > 0 else 0
    radius_err_pct = (radius_err_abs / gt_radius * 100) if gt_radius > 0 and rec_radius > 0 else 0
    
    results.append({
        "Target": target['target_name'],
        "GT_Period": gt_period,
        "Rec_Period": rec_period,
        "Period_Err_Abs": period_err_abs,
        "Period_Err_Pct": period_err_pct,
        "GT_Radius": gt_radius,
        "Rec_Radius": rec_radius,
        "Radius_Err_Abs": radius_err_abs,
        "Radius_Err_Pct": radius_err_pct,
        "TLS_SDE": tls_sde,
        "CNN_Conf": cnn_conf,
        "FP_Risk": fp_risk,
        "PLI": pli,
        "Runtime": runtime
    })

os.makedirs(os.path.dirname(CSV_PATH), exist_ok=True)
with open(CSV_PATH, 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=results[0].keys())
    writer.writeheader()
    writer.writerows(results)

print(f"\nBenchmark completed. Results written to {CSV_PATH}")

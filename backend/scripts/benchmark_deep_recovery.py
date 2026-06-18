import time
import psutil
import pandas as pd
from app.engine.data_hub import fetch_lightcurve, detrend_lightcurve
from app.engine.detection import run_tls

def measure_recovery(target, deep_mode=False):
    print(f"\n--- Testing {target} (Deep Mode: {deep_mode}) ---")
    start_time = time.time()
    mem_before = psutil.Process().memory_info().rss / (1024 * 1024)
    
    # Fetch Data
    raw_res = fetch_lightcurve(target, mission="Kepler", deep_recovery_mode=deep_mode)
    if raw_res["status"] == "error":
        print(f"Fetch Error: {raw_res['message']}")
        return None
        
    time_array = raw_res["time"]
    flux_array = raw_res["flux"]
    
    # Detrend
    detrend_res = detrend_lightcurve(time_array, flux_array)
    clean_flux = detrend_res["clean_flux"] if detrend_res["status"] == "success" else flux_array
    
    # TLS
    tls_result = run_tls(time_array, clean_flux, deep_recovery_mode=deep_mode)
    
    mem_after = psutil.Process().memory_info().rss / (1024 * 1024)
    runtime = time.time() - start_time
    mem_diff = max(0.1, mem_after - mem_before)
    
    print(f"Data Points: {len(time_array)}")
    print(f"Baseline: {time_array[-1] - time_array[0]:.1f} days")
    print(f"Recovered Period: {tls_result['period']:.4f} d")
    print(f"SDE: {tls_result['sde']:.1f}")
    print(f"Runtime: {runtime:.1f}s | Memory Spike: {mem_diff:.1f} MB")
    
    return {
        "Target": target,
        "Deep_Mode": deep_mode,
        "Period": tls_result['period'],
        "SDE": tls_result['sde'],
        "Runtime": runtime,
        "Memory_MB": mem_diff,
        "Data_Points": len(time_array)
    }

if __name__ == "__main__":
    targets = ["Kepler-22", "Kepler-452"]
    results = []
    
    for t in targets:
        # Fast Mode
        res_fast = measure_recovery(t, deep_mode=False)
        if res_fast: results.append(res_fast)
        
        # Deep Mode
        res_deep = measure_recovery(t, deep_mode=True)
        if res_deep: results.append(res_deep)
        
    df = pd.DataFrame(results)
    df.to_csv("deep_recovery_benchmark.csv", index=False)
    print("\nBenchmark complete. Saved to deep_recovery_benchmark.csv.")

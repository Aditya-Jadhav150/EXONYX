import lightkurve as lk
import numpy as np
from transitleastsquares import transitleastsquares
import time
import os

CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

def test_long_period_recovery(target_name):
    print(f"Testing {target_name}...")
    start = time.time()
    search_result = lk.search_lightcurve(target_name, mission="Kepler")
    print(f"Found {len(search_result)} quarters/sectors.")
    
    # Download all and stitch
    lc_collection = search_result.download_all(download_dir=CACHE_DIR)
    if lc_collection is None or len(lc_collection) == 0:
        print("Failed to download.")
        return
        
    lc = lc_collection.stitch().remove_nans()
    
    time_arr = lc.time.value
    flux_arr = lc.flux.value
    print(f"Total data points: {len(time_arr)}. Baseline span: {time_arr[-1] - time_arr[0]:.1f} days.")
    
    # Detrend using a simple rolling median or wotan
    import wotan
    flatten_lc, trend_lc = wotan.flatten(
        time_arr, flux_arr, window_length=0.5, return_trend=True, method='biweight'
    )
    
    # TLS
    print("Running TLS...")
    tls_start = time.time()
    model = transitleastsquares(time_arr, flatten_lc)
    results = model.power()
    print(f"TLS Time: {time.time() - tls_start:.1f}s")
    
    print(f"Recovered Period: {results.period:.4f} days")
    print(f"SDE: {results.SDE:.1f}")
    print(f"Total Time: {time.time() - start:.1f}s\n")

if __name__ == "__main__":
    test_long_period_recovery("Kepler-22")

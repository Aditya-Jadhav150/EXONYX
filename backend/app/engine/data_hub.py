import os
import lightkurve as lk
import numpy as np

CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

def fetch_lightcurve(target_name: str, mission: str = "Kepler", quarter: int = None, sector: int = None, deep_recovery_mode: bool = False):
    """
    Fetch a light curve from MAST using lightkurve.
    Downloads are cached locally to save bandwidth.
    """
    search_kwargs = {"target": target_name}
    if mission.lower() == "kepler":
        search_kwargs["mission"] = "Kepler"
        if quarter is not None:
            search_kwargs["quarter"] = quarter
    elif mission.lower() == "tess":
        search_kwargs["mission"] = "TESS"
        if sector is not None:
            search_kwargs["sector"] = sector
    elif mission.lower() == "k2":
        search_kwargs["mission"] = "K2"

    # Search for light curve files
    search_result = lk.search_lightcurve(**search_kwargs)
    
    if len(search_result) == 0:
        return {"status": "error", "message": f"No light curves found for {target_name} ({mission})."}

    try:
        if deep_recovery_mode:
            # Deep Recovery: stitch all available quarters together
            lc_collection = search_result.download_all(download_dir=CACHE_DIR)
            if lc_collection is None or len(lc_collection) == 0:
                return {"status": "error", "message": "Failed to load deep recovery light curves."}
            lc = lc_collection.stitch()
        else:
            # Fast Survey Mode: grab the first quarter/sector to avoid 60-second downloads
            lc = search_result[0].download(download_dir=CACHE_DIR)
            if lc is None:
                return {"status": "error", "message": "Failed to load light curve."}
    except Exception as e:
        return {"status": "error", "message": f"Error downloading data: {str(e)}"}

    if lc is None:
        return {"status": "error", "message": "Failed to load light curve."}

    # Clean the light curve (remove NaNs)
    lc = lc.remove_nans()
    
    # Extract arrays
    time = lc.time.value
    flux = lc.flux.value
    flux_err = lc.flux_err.value
    
    # Calculate basic metrics
    obs_count = len(time)
    obs_span = time[-1] - time[0] if obs_count > 0 else 0
    # Simple relative standard deviation as a proxy for inverse signal quality (lower std = better quality)
    rel_std = np.std(flux) / np.median(flux)
    signal_quality = max(0.0, 100.0 - (rel_std * 1000.0)) # Rough heuristic

    
    # Extract Stellar Parameters from FITS headers (or default to Solar values if missing)
    teff = lc.meta.get("TEFF")
    r_star = lc.meta.get("RADIUS")
    m_star = lc.meta.get("MASS")
    
    # Fallback to Solar values (1.0 R_sun, 1.0 M_sun, 5778 K) if missing from FITS header
    if teff is None:
        teff = 5778.0
    if r_star is None:
        r_star = 1.0
    if m_star is None:
        # Simple estimation: for main sequence stars near solar mass, M ~ R
        m_star = r_star if r_star else 1.0

    meta = {
        "targetid": lc.targetid,
        "label": lc.label,
        "mission": lc.mission,
        "ra": lc.ra,
        "dec": lc.dec,
        "teff": float(teff),
        "radius": float(r_star),
        "mass": float(m_star),
        "obs_count": int(obs_count),
        "obs_span_days": float(obs_span),
        "signal_quality": float(signal_quality)
    }

    return {
        "status": "success",
        "time": time.tolist(),
        "flux": flux.tolist(),
        "flux_err": flux_err.tolist(),
        "metadata": meta
    }

def detrend_lightcurve(time: list, flux: list, window_length: float = 0.5):
    """
    Detrend a light curve using Wōtan.
    """
    try:
        import wotan
        time_np = np.array(time)
        flux_np = np.array(flux)
        
        pre_std = np.std(flux_np)
        
        # Flatten using biweight method (robust to outliers/transits)
        flatten_lc, trend_lc = wotan.flatten(
            time_np, flux_np, window_length=window_length, return_trend=True, method='biweight'
        )
        
        post_std = np.std(flatten_lc)
        noise_reduction_pct = ((pre_std - post_std) / pre_std * 100.0) if pre_std > 0 else 0.0
        
        return {
            "status": "success",
            "clean_flux": flatten_lc.tolist(),
            "trend": trend_lc.tolist(),
            "noise_reduction_pct": float(noise_reduction_pct)
        }
    except Exception as e:
        return {"status": "error", "message": f"Wotan detrending failed: {str(e)}"}

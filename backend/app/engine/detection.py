import logging
import numpy as np
from transitleastsquares import transitleastsquares

logger = logging.getLogger(__name__)

SAFE_NO_DETECTION = {
    "transit_detected": False,
    "period": None,
    "depth": None,
    "duration": None,
    "sde": 0.0,
    "tls_confidence": 0.0,
    "power_spectrum": {"periods": [], "power": []},
    "transit_times": []
}

def run_tls(time: np.ndarray, flux: np.ndarray, deep_recovery_mode: bool = False):
    """
    Run Transit Least Squares (TLS) to detect transits.
    Finds the strongest periodic transit signal.
    """
    try:
        import io
        from contextlib import redirect_stdout
        
        with redirect_stdout(io.StringIO()):
            model = transitleastsquares(time, flux)
            
            if deep_recovery_mode and len(time) > 100:
                baseline = time[-1] - time[0]
                # In deep recovery, force search up to exactly half the baseline
                # Standard TLS sometimes defaults lower based on heuristics
                results = model.power(period_max=baseline / 2.01, oversampling_factor=3, use_threads=1, show_progress_bar=False)
            else:
                # Fast survey mode: use defaults
                results = model.power(use_threads=1, show_progress_bar=False)
        
        # SDE (Signal Detection Efficiency) > 7.0 is typically considered a significant detection
        transit_detected = bool(results.SDE > 7.0)
        
        # Safely convert transit_times to list
        if results.transit_times is None:
            t_times = []
        elif isinstance(results.transit_times, list):
            t_times = results.transit_times
        else:
            t_times = results.transit_times.tolist()

        return {
            "transit_detected": transit_detected,
            "period": float(results.period),
            "depth": float(1.0 - results.depth),
            "duration": float(results.duration),
            "sde": float(results.SDE),
            "tls_confidence": float(min(100.0, results.SDE * 10.0)), # Scale SDE to a 0-100 score roughly
            "power_spectrum": {
                "periods": results.periods.tolist(),
                "power": results.power.tolist()
            },
            "transit_times": t_times
        }
    except Exception as e:
        logger.error(f"TLS detection failed: {e}", exc_info=True)
        return SAFE_NO_DETECTION.copy()

from transitleastsquares import transit_mask

def run_multi_tls(time: np.ndarray, flux: np.ndarray, max_planets: int = 3):
    """
    Run iterative TLS to detect multiple planets.
    Masks out the transits of the strongest detected signal and searches again.
    Returns a list of candidate dictionaries.
    """
    try:
        candidates = []
        current_time = np.copy(time)
        current_flux = np.copy(flux)
        
        for i in range(max_planets):
            # Run TLS
            result = run_tls(current_time, current_flux)
            
            # Stop if no significant signal found
            if not result["transit_detected"]:
                break
                
            # Add candidate
            candidate = result.copy()
            candidate["candidate_number"] = i + 1
            candidates.append(candidate)
            
            # Mask out the detected transits for the next iteration
            if result["transit_times"]:
                t0 = result["transit_times"][0]
                # Create a boolean mask of in-transit points
                intransit = transit_mask(current_time, result["period"], result["duration"] * 1.5, t0)
                
                # Remove the in-transit points entirely to avoid TLS fitting to residuals
                valid_points = ~intransit
                current_time = current_time[valid_points]
                current_flux = current_flux[valid_points]
                
                if len(current_time) < 100:
                    break # Too few points left
            else:
                break
                
        return candidates
    except Exception as e:
        logger.error(f"Multi-TLS detection failed: {e}", exc_info=True)
        return []

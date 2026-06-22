import numpy as np

def run_false_positive_analysis(time: np.ndarray, flux: np.ndarray, period: float, duration: float, t0: float, depth: float):
    """
    Perform heuristic false positive analysis.
    1. Odd-Even Test
    2. Secondary Eclipse Test
    3. Transit Shape (V-shape vs U-shape)
    4. Variability Out-of-Transit
    """
    if period <= 0 or duration <= 0:
        return {
            "score": 0.0,
            "tests": {},
            "risk": 100.0,
            "status": "FAIL",
            "summary": "Invalid parameters for FP analysis."
        }

    tests = {
        "odd_even": "PASS",
        "secondary_eclipse": "PASS",
        "transit_shape": "PASS",
        "variability": "PASS"
    }
    
    score = 100.0
    warnings = []
    
    # 1. Odd-Even Test (Estimate depth of odd vs even transits)
    # Identify transit centers
    t_min, t_max = np.min(time), np.max(time)
    n_transits = int((t_max - t0) / period) + 1
    
    odd_depths = []
    even_depths = []
    
    for i in range(n_transits):
        t_center = t0 + i * period
        mask = np.abs(time - t_center) < (duration / 2)
        if np.sum(mask) > 3:
            local_depth = 1.0 - np.min(flux[mask])
            if i % 2 == 0:
                even_depths.append(local_depth)
            else:
                odd_depths.append(local_depth)
                
    if len(odd_depths) > 0 and len(even_depths) > 0:
        mean_odd = np.mean(odd_depths)
        mean_even = np.mean(even_depths)
        denominator = max(mean_odd, mean_even)
        diff_ratio = abs(mean_odd - mean_even) / denominator if denominator > 0 else 0.0
        if diff_ratio > 0.2: # >20% difference is highly suspicious
            tests["odd_even"] = "FAIL"
            score -= 40
            warnings.append("Significant odd-even depth difference (possible eclipsing binary).")
        elif diff_ratio > 0.1:
            tests["odd_even"] = "WARNING"
            score -= 10
            warnings.append("Minor odd-even depth variation.")
            
    # 2. Secondary Eclipse Test (Check phase 0.5)
    t_sec_center = t0 + 0.5 * period
    sec_mask = np.abs(time - t_sec_center) < (duration / 2)
    if np.sum(sec_mask) > 3:
        sec_depth = 1.0 - np.min(flux[sec_mask])
        if sec_depth > (0.1 * depth): # Sec eclipse > 10% of primary
            tests["secondary_eclipse"] = "FAIL"
            score -= 30
            warnings.append("Secondary eclipse detected (possible eclipsing binary).")
            
    # 3. Transit Shape (V-shape)
    # A true transit usually has a flat bottom. If it's V-shaped, it might be grazing.
    # We estimate this by checking the mean depth vs max depth
    transit_mask = np.abs(time - t0) < (duration / 2)
    if np.sum(transit_mask) > 5:
        t_flux = flux[transit_mask]
        mean_dip = 1.0 - np.mean(t_flux)
        max_dip = 1.0 - np.min(t_flux)
        if max_dip > 0 and mean_dip / max_dip < 0.6: # Highly V-shaped
            tests["transit_shape"] = "WARNING"
            score -= 15
            warnings.append("V-shaped transit (possible grazing binary).")

    # 4. Out-of-transit Variability
    oot_mask = ~transit_mask
    if np.sum(oot_mask) > 0:
        oot_std = np.std(flux[oot_mask])
        if oot_std > depth:
            tests["variability"] = "FAIL"
            score -= 20
            warnings.append("Stellar variability exceeds transit depth.")
            
    score = max(0.0, score)
    risk = 100.0 - score
    
    if score == 100.0:
        status = "PASS"
        summary = "Passed all false positive checks."
    elif score >= 70.0:
        status = "WARNING"
        summary = " ".join(warnings)
    else:
        status = "FAIL"
        summary = "High risk of false positive: " + " ".join(warnings)

    return {
        "score": float(score),
        "tests": tests,
        "risk": float(risk),
        "status": status,
        "summary": summary
    }

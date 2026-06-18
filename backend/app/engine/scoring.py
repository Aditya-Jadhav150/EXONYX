def calculate_pli(tls_score: float, cnn_confidence: float | None, signal_quality: float, consistency: float, fp_rejection: float) -> dict:
    """
    Calculate the Planet Likelihood Index (PLI) using the formalized formula.
    If CNN is missing, redistribute its 25% weight to TLS and FP Rejection.
    """
    
    if cnn_confidence is not None:
        tls_weight = 0.35
        cnn_weight = 0.25
        fp_weight = 0.10
        cnn_contrib = cnn_weight * cnn_confidence
    else:
        tls_weight = 0.45      # +10%
        cnn_weight = 0.0
        fp_weight = 0.25       # +15%
        cnn_contrib = 0.0
        
    qual_weight = 0.15
    consist_weight = 0.15
    
    tls_contrib = tls_weight * tls_score
    quality_contrib = qual_weight * signal_quality
    consistency_contrib = consist_weight * consistency
    fp_contrib = fp_weight * fp_rejection
    
    pli_score = tls_contrib + cnn_contrib + quality_contrib + consistency_contrib + fp_contrib
    
    # Ensure it's bounded 0-100
    pli_score = max(0.0, min(100.0, pli_score))
    
    return {
        "score": round(pli_score, 1),
        "breakdown": {
            "tls": round(tls_score, 1),
            "cnn": round(cnn_confidence, 1) if cnn_confidence is not None else None,
            "quality": round(signal_quality, 1),
            "consistency": round(consistency, 1),
            "fp_rejection": round(fp_rejection, 1)
        }
    }

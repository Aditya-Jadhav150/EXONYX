import numpy as np
import batman

def phase_fold(time: np.ndarray, period: float, t0: float):
    """
    Phase fold a light curve around a given period and epoch.
    Returns the phase array (-0.5 to 0.5) centered on transit.
    """
    if period <= 0:
        return time * 0.0
    phase = ((time - t0 + 0.5 * period) % period) - 0.5 * period
    phase = phase / period
    return phase

def fit_transit_model(time: np.ndarray, flux: np.ndarray, period: float, t0: float, 
                      depth: float, duration: float, r_star: float, m_star: float):
    """
    Fit a batman transit model to the light curve.
    Uses basic priors to initialize the model.
    """
    # Initialize parameters
    params = batman.TransitParams()
    params.t0 = t0                       # time of inferior conjunction
    params.per = period                  # orbital period
    params.rp = np.sqrt(depth) if depth > 0 else 0.01  # planet radius (in units of stellar radii)
    
    # Estimate semi-major axis (a) in stellar radii
    # a/R* = (G * M* / 4pi^2 * P^2)^(1/3) / R*
    # Roughly, duration = (P / pi) * arcsin(R* / a) -> a/R* ~ P / (pi * duration)
    a_rs = (period / (np.pi * duration)) if duration > 0 else 10.0
    params.a = a_rs                      # semi-major axis (in units of stellar radii)
    
    params.inc = 90.                     # orbital inclination (in degrees)
    params.ecc = 0.                      # eccentricity
    params.w = 90.                       # longitude of periastron (in degrees)
    params.u = [0.1, 0.3]                # limb darkening coefficients
    params.limb_dark = "quadratic"       # limb darkening model
    
    # Generate model
    m = batman.TransitModel(params, time)
    model_flux = m.light_curve(params)
    
    # Calculate fit quality
    residuals = flux - model_flux
    rms = np.std(residuals)
    
    # Simple chi-square (assuming uniform errors based on RMS)
    err = np.full_like(flux, rms) if rms > 0 else np.ones_like(flux)
    chi2 = np.sum((residuals / err)**2)
    dof = len(flux) - 4 # Roughly 4 free params (t0, per, rp, a)
    reduced_chi2 = chi2 / dof if dof > 0 else 0.0
    
    return {
        "model_flux": model_flux.tolist(),
        "residuals": residuals.tolist(),
        "rp_rs": float(params.rp),
        "a_rs": float(params.a),
        "impact_parameter": float(params.a * np.cos(np.radians(params.inc))),
        "chi_square": float(chi2),
        "reduced_chi_square": float(reduced_chi2),
        "rms": float(rms)
    }

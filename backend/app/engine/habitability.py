import math

def calculate_stellar_luminosity(stellar_radius_sun: float, teff_k: float) -> float:
    if stellar_radius_sun <= 0 or teff_k <= 0:
        return 1.0
    return (stellar_radius_sun ** 2) * ((teff_k / 5778.0) ** 4)

def calculate_habitable_zone(luminosity_sun: float):
    inner = 0.95 * math.sqrt(luminosity_sun)
    outer = 1.37 * math.sqrt(luminosity_sun)
    return (inner, outer)

def assess_habitability(planet_radius_earth: float, r_err: float, semi_major_axis_au: float, a_err: float, teff_k: float, stellar_radius_sun: float):
    luminosity = calculate_stellar_luminosity(stellar_radius_sun, teff_k)
    
    # Equilibrium Temp and Error
    if semi_major_axis_au > 0:
        t_eq = 255.0 * (math.pow(luminosity, 0.25)) / math.sqrt(semi_major_axis_au)
        # dT = T * 0.5 * (da/a)
        t_err = t_eq * 0.5 * (a_err / semi_major_axis_au) if a_err else 0.0
    else:
        t_eq = 0.0
        t_err = 0.0

    inner_hz, outer_hz = calculate_habitable_zone(luminosity)
    hz_center = (inner_hz + outer_hz) / 2.0
    hz_width = outer_hz - inner_hz
    
    if semi_major_axis_au == 0 or hz_width == 0:
        hz_score = 0.0
    else:
        dist_from_center = abs(semi_major_axis_au - hz_center)
        hz_score = max(0.0, 100.0 * (1.0 - (dist_from_center / (hz_width / 2.0))))

    # Earth Similarity Index
    radius_esi = 1.0 - abs(planet_radius_earth - 1.0) / (planet_radius_earth + 1.0)
    temp_esi = 1.0 - abs(t_eq - 255.0) / (t_eq + 255.0) if t_eq > 0 else 0.0
    
    esi = math.pow(radius_esi, 0.57) * math.pow(temp_esi, 5.58) * 100.0
    
    # Rough propagation for ESI error
    esi_err = esi * ((0.57 * r_err / max(0.1, planet_radius_earth)) + (5.58 * t_err / max(1.0, t_eq)))
    esi_err = min(esi_err, 100.0 - esi)

    is_habitable = False
    classification = "Non-Habitable"
    if hz_score > 0 and 0.5 <= planet_radius_earth <= 2.5:
        is_habitable = True
        classification = "Potentially Habitable (Rocky/Super-Earth)"
    elif hz_score > 0 and planet_radius_earth > 2.5:
        classification = "Habitable Zone Gas Giant"

    return {
        "esi": round(esi, 2),
        "esi_err": round(esi_err, 2),
        "hzScore": round(hz_score, 2),
        "isHabitable": is_habitable,
        "classification": classification,
        "temp": f"{int(t_eq)} K",
        "equilibrium_temperature_k": round(t_eq, 2),
        "equilibrium_temperature_err": round(t_err, 2),
        "hz_inner_au": round(inner_hz, 4),
        "hz_outer_au": round(outer_hz, 4),
        "stellar_luminosity_sun": round(luminosity, 4)
    }

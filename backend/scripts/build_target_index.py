import json
import os
try:
    from astroquery.ipac.nexsci.nasa_exoplanet_archive import NasaExoplanetArchive
    print("Querying NASA Exoplanet Archive for confirmed planetary systems...")
    
    # Query confirmed planets
    table = NasaExoplanetArchive.query_criteria(table="ps", select="hostname", where="default_flag=1")
    hosts = list(set(table['hostname']))
    
    # Clean and filter hosts
    kepler_targets = sorted([h for h in hosts if h.startswith("Kepler") or h.startswith("KOI") or h.startswith("KIC")])
    toi_targets = sorted([h for h in hosts if h.startswith("TOI") or h.startswith("TIC")])
    k2_targets = sorted([h for h in hosts if h.startswith("K2") or h.startswith("EPIC")])
    
    # Add some other famous ones that don't fit perfectly just in case
    other_targets = sorted([h for h in hosts if h not in kepler_targets and h not in toi_targets and h not in k2_targets])
    
    target_dict = {
        "Kepler": kepler_targets,
        "TESS": toi_targets,
        "K2": k2_targets,
        "Other": other_targets
    }
    
    # Create data directory if it doesn't exist
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app", "data")
    os.makedirs(data_dir, exist_ok=True)
    
    out_path = os.path.join(data_dir, "targets_index.json")
    with open(out_path, "w") as f:
        json.dump(target_dict, f, indent=2)
        
    print(f"Successfully wrote {len(hosts)} targets to {out_path}")
    print(f"Kepler targets: {len(kepler_targets)}")
    print(f"TESS/TOI targets: {len(toi_targets)}")
    print(f"K2/EPIC targets: {len(k2_targets)}")
    
except Exception as e:
    print(f"Error: {e}")

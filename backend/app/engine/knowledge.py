import requests

def fetch_knowledge_context(target_name: str) -> dict:
    """
    Fetch external context for a target from the NASA Exoplanet Archive.
    Uses the TAP service to query the Planetary Systems (ps) table.
    """
    base_url = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync"
    
    # Strip common prefixes like 'Kepler-' or 'K2-' if we just want the number,
    # but the archive usually accepts "Kepler-10" directly in hostname or pl_name.
    # We will search if the target is known as a host star.
    query = f"SELECT pl_name, discoverymethod, disc_year, pl_rade, pl_orbper FROM ps WHERE hostname = '{target_name}'"
    
    params = {
        "query": query,
        "format": "json"
    }
    
    try:
        response = requests.get(base_url, params=params, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if len(data) > 0:
                return {
                    "known_system": True,
                    "planet_count": len(data),
                    "planets": data,
                    "message": f"Target is a known host to {len(data)} exoplanet(s)."
                }
            else:
                return {
                    "known_system": False,
                    "planet_count": 0,
                    "planets": [],
                    "message": "No confirmed planets found in NASA Exoplanet Archive for this host."
                }
    except Exception as e:
        pass
        
    return {
        "known_system": False,
        "planet_count": 0,
        "planets": [],
        "message": "Could not connect to Knowledge Engine."
    }

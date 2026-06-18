import numpy as np
import pandas as pd
import os

def generate_mock_light_curve(
    num_points=5000, 
    duration_days=27, 
    noise_level="medium", 
    transit_injected=True,
    transit_period=5.5,
    transit_depth=0.01,
    transit_duration_hours=4.0
):
    """
    Generates a mock stellar light curve with optional injected transits.
    """
    # Time array (in days)
    time = np.linspace(0, duration_days, num_points)
    
    # Base flux (normalized around 1.0)
    flux = np.ones(num_points)
    
    # Add noise based on level
    if noise_level == "easy" or noise_level == "low":
        noise_std = 0.001
    elif noise_level == "medium":
        noise_std = 0.003
    elif noise_level == "hard" or noise_level == "high":
        noise_std = 0.008
    elif noise_level == "impossible" or noise_level == "extreme":
        noise_std = 0.02
    else:
        noise_std = 0.003
        
    # Gaussian noise
    noise = np.random.normal(0, noise_std, num_points)
    
    # Add low frequency stellar variability (stellar rotation/activity)
    # Combine a few sine waves
    variability = (
        0.005 * np.sin(2 * np.pi * time / 14.0) +
        0.002 * np.sin(2 * np.pi * time / 7.0)
    )
    
    raw_flux = flux + noise + variability
    clean_flux = flux.copy()
    
    # Inject transit
    is_transit = np.zeros(num_points, dtype=bool)
    
    if transit_injected:
        transit_duration_days = transit_duration_hours / 24.0
        
        # Calculate transit times
        t0 = 2.0 # First transit at day 2
        transit_times = np.arange(t0, duration_days, transit_period)
        
        for t_c in transit_times:
            # Simple box transit shape (could be improved with limb darkening later)
            transit_mask = np.abs(time - t_c) < (transit_duration_days / 2.0)
            raw_flux[transit_mask] -= transit_depth
            clean_flux[transit_mask] -= transit_depth
            is_transit[transit_mask] = True
            
    df = pd.DataFrame({
        'time': time,
        'raw_flux': raw_flux,
        'clean_flux': clean_flux,
        'is_transit': is_transit
    })
    
    return df

def save_mock_dataset(filename="mock_lightcurve.csv", **kwargs):
    df = generate_mock_light_curve(**kwargs)
    
    os.makedirs(os.path.dirname(filename) if os.path.dirname(filename) else '.', exist_ok=True)
    df.to_csv(filename, index=False)
    print(f"Saved mock dataset to {filename} with {len(df)} points.")
    return df

if __name__ == "__main__":
    # Generate a few mock datasets for the simulator presets
    save_mock_dataset("data/mock_easy.csv", noise_level="easy", transit_depth=0.02, transit_period=4.2)
    save_mock_dataset("data/mock_medium.csv", noise_level="medium", transit_depth=0.008, transit_period=7.1)
    save_mock_dataset("data/mock_hard.csv", noise_level="hard", transit_depth=0.004, transit_period=12.5)
    save_mock_dataset("data/mock_impossible.csv", noise_level="impossible", transit_depth=0.001, transit_period=8.4)
    save_mock_dataset("data/mock_no_transit.csv", noise_level="medium", transit_injected=False)

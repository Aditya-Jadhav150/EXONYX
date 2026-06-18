import os
import requests
import pandas as pd
from sklearn.model_selection import train_test_split

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_CACHE_DIR = os.path.join(BASE_DIR, "data_cache")
DATASETS_DIR = os.path.join(BASE_DIR, "datasets")

# Phase 1: Local Data Lake Structure
subdirs = [
    "kepler", "tess", "koi", "benchmarks", 
    "training", "models", "reports", "mcmc"
]

print("Initializing Phase 1: Local Data Lake...")
for sub in subdirs:
    p = os.path.join(DATA_CACHE_DIR, sub)
    os.makedirs(p, exist_ok=True)
    print(f"  Created: {p}")

os.makedirs(DATASETS_DIR, exist_ok=True)

# Phase 2: Dataset Curation Pipeline
print("\nInitializing Phase 2: Dataset Curation Pipeline...")
KOI_API_URL = "https://exoplanetarchive.ipac.caltech.edu/cgi-bin/nstedAPI/nph-nstedAPI?table=cumulative&select=kepid,kepoi_name,kepler_name,koi_disposition,koi_pdisposition,koi_score,koi_period,koi_depth,koi_duration,koi_prad,koi_sma,koi_teq,koi_model_snr&format=csv"
RAW_KOI_PATH = os.path.join(DATA_CACHE_DIR, "koi", "cumulative_raw.csv")

if not os.path.exists(RAW_KOI_PATH):
    print("  Fetching Kepler KOI cumulative table from NASA Exoplanet Archive (~5MB)...")
    res = requests.get(KOI_API_URL)
    with open(RAW_KOI_PATH, "wb") as f:
        f.write(res.content)
    print("  Download complete.")
else:
    print("  KOI cumulative table already exists in cache.")

# Process into confirmed planets and false positives
df = pd.read_csv(RAW_KOI_PATH)
print(f"  Total KOIs loaded: {len(df)}")

# Filter out targets with null period or depth as they are required for TLS simulation
df = df.dropna(subset=['koi_period', 'koi_depth', 'koi_duration'])

confirmed = df[df['koi_disposition'] == 'CONFIRMED']
false_pos = df[df['koi_disposition'] == 'FALSE POSITIVE']
candidates = df[df['koi_disposition'] == 'CANDIDATE']

confirmed.to_csv(os.path.join(DATASETS_DIR, "confirmed_planets.csv"), index=False)
false_pos.to_csv(os.path.join(DATASETS_DIR, "false_positives.csv"), index=False)

print(f"  Saved {len(confirmed)} Confirmed Planets")
print(f"  Saved {len(false_pos)} False Positives")
print(f"  Saved {len(candidates)} Candidates")

# Create Train / Val / Test splits (80 / 10 / 10)
# Label 1 = CONFIRMED, Label 0 = FALSE POSITIVE
confirmed_labeled = confirmed.copy()
confirmed_labeled['label'] = 1

false_pos_labeled = false_pos.copy()
false_pos_labeled['label'] = 0

# Limit false positives to balance dataset roughly 2:1 or 1:1 if desired, but for now take all to let network learn
combined = pd.concat([confirmed_labeled, false_pos_labeled]).sample(frac=1, random_state=42).reset_index(drop=True)

train_df, temp_df = train_test_split(combined, test_size=0.2, random_state=42, stratify=combined['label'])
val_df, test_df = train_test_split(temp_df, test_size=0.5, random_state=42, stratify=temp_df['label'])

train_df.to_csv(os.path.join(DATASETS_DIR, "train_split.csv"), index=False)
val_df.to_csv(os.path.join(DATASETS_DIR, "validation_split.csv"), index=False)
test_df.to_csv(os.path.join(DATASETS_DIR, "test_split.csv"), index=False)

print(f"  Created Splits: Train({len(train_df)}), Val({len(val_df)}), Test({len(test_df)})")
print("\nPhase 1 and 2 Initialization Complete!")

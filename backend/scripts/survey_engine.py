import os
import sys
import time
import requests
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASETS_DIR = os.path.join(BASE_DIR, "datasets")
API_BASE_URL = "http://127.0.0.1:8000/api/v1"

def run_survey(batch_size=100):
    print(f"EXONYX Autonomous Survey Engine (Batch Size: {batch_size})")
    
    csv_path = os.path.join(DATASETS_DIR, "test_split.csv")
    if not os.path.exists(csv_path):
        print(f"Error: Dataset {csv_path} not found. Run setup_v5_env.py first.")
        return
        
    df = pd.read_csv(csv_path)
    
    # Shuffle and pick batch_size targets
    targets = df.sample(n=min(batch_size, len(df)), random_state=42)
    
    print(f"Loaded {len(targets)} targets for batch processing.")
    
    success_count = 0
    fail_count = 0
    candidates_found = 0
    
    start_time = time.time()
    
    for i, row in targets.iterrows():
        target_name = row['kepid']
        mission = "Kepler"
        
        print(f"[{success_count + fail_count + 1}/{len(targets)}] Processing Kepler ID {target_name}...")
        
        try:
            # 1. Fetch Data
            # Note: We simulate the POST payload the frontend sends to the pipeline
            payload = {
                "target_name": str(target_name),
                "mission": mission,
                "dataset_type": "Real"
            }
            
            # The API automatically performs Detrending -> TLS -> CNN -> MCMC -> DB Save
            res = requests.post(f"{API_BASE_URL}/data/load", json=payload, timeout=60)
            
            if res.status_code == 200:
                data = res.json()
                if data.get("status") == "success":
                    success_count += 1
                    pli = data.get("pli", {}).get("score", 0)
                    if pli > 50:
                        candidates_found += 1
                        print(f"  --> CANDIDATE FOUND! PLI: {pli:.1f}")
                else:
                    fail_count += 1
                    print(f"  --> Failed to process: {data.get('message')}")
            else:
                fail_count += 1
                print(f"  --> API Error: HTTP {res.status_code}")
                
        except requests.exceptions.RequestException as e:
            fail_count += 1
            print(f"  --> Network/Timeout Error: {e}")
            
    elapsed = time.time() - start_time
    avg_time = elapsed / len(targets) if len(targets) > 0 else 0
    
    print("\n" + "="*40)
    print("SURVEY CAMPAIGN COMPLETE")
    print("="*40)
    print(f"Targets Processed:   {len(targets)}")
    print(f"Successful Runs:     {success_count}")
    print(f"Failed Runs:         {fail_count}")
    print(f"Candidates Found:    {candidates_found}")
    print(f"Total Time elapsed:  {elapsed:.1f}s")
    print(f"Average Target Time: {avg_time:.1f}s")
    print("="*40)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="EXONYX Batch Survey Engine")
    parser.add_argument("--batch", type=int, default=10, help="Number of targets to process (gradual scaling)")
    args = parser.parse_args()
    
    run_survey(batch_size=args.batch)

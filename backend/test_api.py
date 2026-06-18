import requests

res = requests.get('http://127.0.0.1:8000/api/v1/candidates')
print("Candidates status:", res.status_code)
if res.status_code == 200:
    data = res.json()
    cands = data.get('candidates', [])
    print("Num candidates:", len(cands))
    if cands:
        cand = cands[0]
        payload = {
            "target_name": cand.get('target_id', 'Unknown'),
            "mission": cand.get('mission', 'Kepler'),
            "analysis_data": cand
        }
        res2 = requests.post('http://127.0.0.1:8000/api/v1/report/download', json=payload)
        print("Report status:", res2.status_code)
        if res2.status_code != 200:
            print("Error:", res2.text)

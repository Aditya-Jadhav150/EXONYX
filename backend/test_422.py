import requests

payload1 = {
    "target_name": 8311864,
    "mission": "Kepler",
    "analysis_data": {}
}
res1 = requests.post('http://127.0.0.1:8000/api/v1/report/download', json=payload1)
print("Payload 1:", res1.status_code, res1.text)

payload2 = {
    "target_name": "8311864",
    "mission": None,
    "analysis_data": {}
}
res2 = requests.post('http://127.0.0.1:8000/api/v1/report/download', json=payload2)
print("Payload 2:", res2.status_code, res2.text)


import httpx

url = "http://localhost:8000/api/query"
payload = {
    "question": "What is COVID-19?",
    "session_id": "default"
}

print(f"Querying: {payload['question']} (session: {payload['session_id']})...")

with httpx.Client(timeout=60.0) as client:
    response = client.post(url, json=payload)

print(f"Status: {response.status_code}")
print(f"Response: {response.text}")

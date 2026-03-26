import requests

url = "http://localhost:11434/api/chat"

payload = {
    "model": "deepseek-r1:8b",
    "messages": [
        {
            "role": "system",
            "content": "You are an expert website auditor."
        },
        {
            "role": "user",
            "content": "Analyze a webpage with 1200 words, 1 H1, no H2, and 1 CTA. Give 3 recommendations."
        }
    ],
    "stream": False
}

try:
    r = requests.post(url, json=payload, timeout=180)
    data = r.json()

    if r.status_code == 200:
        print(data["message"]["content"])
    else:
        print(f"Error {r.status_code}:", data)

except Exception as e:
    print("Request failed:", str(e))
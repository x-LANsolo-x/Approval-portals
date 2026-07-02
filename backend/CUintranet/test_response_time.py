import urllib.request
import time
import json

def measure_request(url):
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(url) as response:
            content = response.read()
            t1 = time.perf_counter()
            duration_ms = (t1 - t0) * 1000
            print(f"URL: {url:85} | Time: {duration_ms:6.1f} ms | Status: {response.status}")
    except Exception as e:
        print(f"URL: {url:85} | Failed: {e}")

print("--- Measuring API Response Times ---")
measure_request("http://127.0.0.1:8000/api/events?club=ASTRONOMY+CLUB&role=Club")
measure_request("http://127.0.0.1:8000/api/events?club=BIO-TECHNOLOGY&role=Department")
measure_request("http://127.0.0.1:8000/api/club-details")
measure_request("http://127.0.0.1:8000/api/department-details")
measure_request("http://127.0.0.1:8000/api/community-details")

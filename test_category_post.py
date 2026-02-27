
import requests
from requests.auth import HTTPBasicAuth
import json

url = "http://localhost:8081/wp-json/wc/v3/products/categories"
consumer_key = "ck_1d948ab5af225784a4c0545e0e8fbc735b7440d1"
consumer_secret = "cs_903da4d006d7939f2e59caecc8068e178d61afc9"

headers = {
    "X-Forwarded-Proto": "https",
    "Content-Type": "application/json"
}

data = {
    "name": "Test Category",
    "description": "Testing category creation"
}

try:
    resp = requests.post(
        url,
        auth=HTTPBasicAuth(consumer_key, consumer_secret),
        json=data,
        headers=headers,
        verify=False
    )
    print(f"Status Code: {resp.status_code}")
    print(f"Response: {resp.text}")
except Exception as e:
    print(f"Error: {e}")

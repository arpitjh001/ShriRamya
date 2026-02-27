import requests

url = "http://localhost:8000/api/auth/login"
data = {"email": "admin-user@example.com", "password": "AdminPassword123!"}
resp = requests.post(url, json=data)
token = resp.json()["access_token"]

url = "http://localhost:8000/api/wc/categories"
headers = {"Authorization": f"Bearer {token}"}
cat_data = {"name": "New Test Category"}
resp = requests.post(url, json=cat_data, headers=headers)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.text}")

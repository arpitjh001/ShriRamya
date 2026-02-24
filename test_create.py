import requests

BACKEND = "http://localhost:8000/api"

print("Logging in...")
res = requests.post(f"{BACKEND}/auth/login", json={
    "email": "admin-user@example.com",
    "password": "AdminPassword123!"
})
if not res.ok:
    print("Login failed:", res.text)
    exit(1)

token = res.json()["access_token"]
print("Logged in, token received.")

print("Creating product...")
res = requests.post(f"{BACKEND}/wc/products", headers={
    "Authorization": f"Bearer {token}"
}, json={
    "name": "Test Script Product",
    "regular_price": "999",
    "stock_quantity": 5,
    "status": "publish"
})

if res.ok:
    print("SUCCESS! Product created:")
    print(res.json().get("id"))
else:
    print("FAILED! error:", res.status_code, res.text)

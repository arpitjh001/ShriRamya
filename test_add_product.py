import requests
import json

BASE_URL = "http://localhost:8002/api/v1"

def test_add_product():
    # 1. Login
    login_data = {
        "email": "admin-user@example.com",
        "password": "AdminPassword123!"
    }
    print("Logging in...")
    resp = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if resp.status_code != 200:
        print(f"Login failed: {resp.status_code} - {resp.text}")
        return
    
    token = resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Login successful.")

    # 2. Add product
    product_data = {
        "name": "Test Product Script",
        "regular_price": 999.0,
        "description": "A test product created via script",
        "short_description": "Test product",
        "categories": [{"id": 25}],
        "images": [],
        "stock_quantity": 10,
        "size_stock": [{"size": "M", "qty": 10}],
        "color_stock": [{"color": "Red", "qty": 10}]
    }
    print("Adding product...")
    resp = requests.post(f"{BASE_URL}/products", json=product_data, headers=headers)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text}")

if __name__ == "__main__":
    test_add_product()

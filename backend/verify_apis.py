import requests
import sys
import uuid

BASE_URL = "http://localhost:8000/api"
UNIQUE_ID = str(uuid.uuid4())[:8]

API_ENDPOINTS = [
    ("GET", "/health", None),
    ("GET", "/products", None),
    ("POST", "/auth/login", {"email": "admin-user@example.com", "password": "AdminPassword123!"}),
    ("GET", "/wc/products", None),
    ("GET", "/wc/categories", None),
    ("POST", "/wc/categories", {"name": f"Test Category {UNIQUE_ID}"}),
    ("POST", "/wc/products", {"name": f"Test Product {UNIQUE_ID}", "regular_price": "99.99", "status": "publish"})
]

def main():
    print(f"Starting API Verification Tool against {BASE_URL}")
    print("-" * 50)
    
    allItemPass = True
    token = None
    created_product_id = None
    
    for method, path, data in API_ENDPOINTS:
        url = f"{BASE_URL}{path}"
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method == "GET":
                res = requests.get(url, headers=headers, timeout=5)
            elif method == "POST":
                res = requests.post(url, json=data, headers=headers, timeout=5)
                
            status = res.status_code
            if status >= 200 and status < 400:
                print(f"✅ {method} {path} -> {status} OK")
                if path == "/auth/login":
                    token = res.json().get("access_token")
                elif path == "/wc/products":
                    created_product_id = res.json().get("id")
            else:
                print(f"❌ {method} {path} -> {status} ERROR")
                print(f"   Response: {res.text[:200]}")
                allItemPass = False
                
        except Exception as e:
            print(f"❌ {method} {path} -> {type(e).__name__}: {str(e)}")
            allItemPass = False

    if created_product_id and token:
        try:
            print("Testing PUT update endpoint...")
            url = f"{BASE_URL}/wc/products/{created_product_id}"
            headers = {"Authorization": f"Bearer {token}"}
            res = requests.put(url, json={"name": f"Updated Test Product {UNIQUE_ID}", "regular_price": "199.99"}, headers=headers, timeout=5)
            if res.ok:
                print(f"✅ PUT /wc/products/{created_product_id} -> {res.status_code} OK")
            else:
                print(f"❌ PUT /wc/products/{created_product_id} -> {res.status_code} ERROR")
                print(f"   Response: {res.text[:200]}")
                allItemPass = False

            print("Testing DELETE product endpoint...")
            res_del = requests.delete(url, headers=headers, timeout=5)
            if res_del.ok:
                print(f"✅ DELETE /wc/products/{created_product_id} -> {res_del.status_code} OK")
            else:
                print(f"❌ DELETE /wc/products/{created_product_id} -> {res_del.status_code} ERROR")
                print(f"   Response: {res_del.text[:200]}")
                allItemPass = False
                
        except Exception as e:
            print(f"❌ API Action on /wc/products/{created_product_id} -> {type(e).__name__}: {str(e)}")
            allItemPass = False
            
    print("-" * 50)
    if allItemPass:
        print("All APIs are working properly!")
        sys.exit(0)
    else:
        print("Some APIs are failing.")
        sys.exit(1)

if __name__ == "__main__":
    main()

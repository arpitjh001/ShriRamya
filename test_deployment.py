#!/usr/bin/env python3
"""
Comprehensive deployment test suite for Shri Ramya eCommerce Platform
Tests all services: Backend API, Frontend, Database, Authentication
"""

import requests
import json
from datetime import datetime
from typing import Dict, List
import random
import string

class DeploymentTester:
    def __init__(self):
        self.base_url = "http://localhost:8000/api"
        self.frontend_url = "http://localhost:3000"
        self.results = []
        self.test_token = None
        self.test_user_email = None
        
    def log_test(self, name: str, status: str, message: str = ""):
        """Log test result"""
        self.results.append({
            "test": name,
            "status": status,
            "message": message,
            "timestamp": datetime.now().isoformat()
        })
        symbol = "✓" if status == "PASS" else "✗"
        print(f"{symbol} {name}: {status} {message}")
    
    def test_backend_health(self) -> bool:
        """Test backend health check endpoint"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") in ["healthy", "degraded"]:
                    self.log_test(
                        "Backend Health Check",
                        "PASS",
                        f"Status: {data.get('status')}, MongoDB: {data.get('mongodb')}"
                    )
                    return True
        except Exception as e:
            self.log_test("Backend Health Check", "FAIL", str(e))
        return False
    
    def test_root_endpoint(self) -> bool:
        """Test root API endpoint"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Root Endpoint",
                    "PASS",
                    f"Version: {data.get('version')}, Service: {data.get('service')}"
                )
                return True
        except Exception as e:
            self.log_test("Root Endpoint", "FAIL", str(e))
        return False
    
    def test_get_products(self) -> bool:
        """Test get products endpoint"""
        try:
            response = requests.get(f"{self.base_url}/products?limit=5", timeout=10)
            if response.status_code == 200:
                products = response.json()
                if isinstance(products, list):
                    self.log_test(
                        "Get Products",
                        "PASS",
                        f"Retrieved {len(products)} products"
                    )
                    return True
        except Exception as e:
            self.log_test("Get Products", "FAIL", str(e))
        return False
    
    def test_get_categories(self) -> bool:
        """Test get categories endpoint"""
        try:
            response = requests.get(f"{self.base_url}/categories", timeout=5)
            if response.status_code == 200:
                data = response.json()
                categories = data.get("categories", [])
                if isinstance(categories, list):
                    self.log_test(
                        "Get Categories",
                        "PASS",
                        f"Retrieved {len(categories)} categories"
                    )
                    return True
        except Exception as e:
            self.log_test("Get Categories", "FAIL", str(e))
        return False
    
    def test_user_registration(self) -> bool:
        """Test user registration"""
        try:
            random_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
            self.test_user_email = f"test_{random_id}@example.com"
            
            payload = {
                "email": self.test_user_email,
                "name": "Test User",
                "phone": "1234567890",
                "password": "TestPass123!"
            }
            
            response = requests.post(
                f"{self.base_url}/auth/register",
                json=payload,
                timeout=5,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 201:
                data = response.json()
                self.test_token = data.get("access_token")
                self.log_test(
                    "User Registration",
                    "PASS",
                    f"User created: {self.test_user_email}"
                )
                return True
            else:
                self.log_test(
                    "User Registration",
                    "FAIL",
                    f"Status: {response.status_code}"
                )
        except Exception as e:
            self.log_test("User Registration", "FAIL", str(e))
        return False
    
    def test_user_login(self) -> bool:
        """Test user login"""
        try:
            payload = {
                "email": self.test_user_email,
                "password": "TestPass123!"
            }
            
            response = requests.post(
                f"{self.base_url}/auth/login",
                json=payload,
                timeout=5,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.log_test(
                        "User Login",
                        "PASS",
                        "Login successful"
                    )
                    return True
            self.log_test("User Login", "FAIL", f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("User Login", "FAIL", str(e))
        return False
    
    def test_get_current_user(self) -> bool:
        """Test get current user endpoint"""
        if not self.test_token:
            self.log_test("Get Current User", "SKIP", "No valid token")
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.test_token}",
                "Content-Type": "application/json"
            }
            
            response = requests.get(
                f"{self.base_url}/auth/me",
                headers=headers,
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Get Current User",
                    "PASS",
                    f"User: {data.get('email')}"
                )
                return True
            self.log_test("Get Current User", "FAIL", f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get Current User", "FAIL", str(e))
        return False
    
    def test_shopping_cart(self) -> bool:
        """Test shopping cart operations"""
        try:
            import uuid
            session_id = str(uuid.uuid4())
            
            # Get products first
            products_response = requests.get(
                f"{self.base_url}/products?limit=1",
                timeout=5
            )
            
            if products_response.status_code != 200 or not products_response.json():
                self.log_test("Shopping Cart", "FAIL", "No products available")
                return False
            
            product = products_response.json()[0]
            product_id = product.get("id")
            
            # Add to cart
            payload = {
                "product_id": product_id,
                "quantity": 1
            }
            
            params = {"session_id": session_id}
            
            add_response = requests.post(
                f"{self.base_url}/cart",
                json=payload,
                params=params,
                timeout=5
            )
            
            if add_response.status_code == 200:
                # Get cart
                get_response = requests.get(
                    f"{self.base_url}/cart",
                    params=params,
                    timeout=5
                )
                
                if get_response.status_code == 200:
                    cart = get_response.json()
                    if cart.get("items"):
                        self.log_test(
                            "Shopping Cart",
                            "PASS",
                            f"Added item to cart, items: {len(cart.get('items', []))}"
                        )
                        return True
            
            self.log_test("Shopping Cart", "FAIL", f"Status: {add_response.status_code}")
        except Exception as e:
            self.log_test("Shopping Cart", "FAIL", str(e))
        return False
    
    def test_frontend_accessibility(self) -> bool:
        """Test frontend is accessible"""
        try:
            response = requests.get(self.frontend_url, timeout=5)
            if response.status_code == 200:
                self.log_test(
                    "Frontend Accessibility",
                    "PASS",
                    f"Frontend running on port 3000 (HTTP {response.status_code})"
                )
                return True
        except Exception as e:
            self.log_test("Frontend Accessibility", "FAIL", str(e))
        return False
    
    def run_all_tests(self):
        """Run all tests"""
        print("\n" + "="*60)
        print("DEPLOYMENT TEST SUITE - SHRI RAMYA ECOMMERCE")
        print("="*60 + "\n")
        
        print("[1/11] Testing Backend Health...")
        self.test_backend_health()
        
        print("\n[2/11] Testing Root Endpoint...")
        self.test_root_endpoint()
        
        print("\n[3/11] Testing Products Endpoint...")
        self.test_get_products()
        
        print("\n[4/11] Testing Categories Endpoint...")
        self.test_get_categories()
        
        print("\n[5/11] Testing Frontend Accessibility...")
        self.test_frontend_accessibility()
        
        print("\n[6/11] Testing User Registration...")
        self.test_user_registration()
        
        print("\n[7/11] Testing User Login...")
        self.test_user_login()
        
        print("\n[8/11] Testing Get Current User...")
        self.test_get_current_user()
        
        print("\n[9/11] Testing Shopping Cart Operations...")
        self.test_shopping_cart()
        
        # Summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        
        passed = sum(1 for r in self.results if r["status"] == "PASS")
        failed = sum(1 for r in self.results if r["status"] == "FAIL")
        skipped = sum(1 for r in self.results if r["status"] == "SKIP")
        total = len(self.results)
        
        print(f"\nTotal Tests: {total}")
        print(f"✓ Passed: {passed}")
        print(f"✗ Failed: {failed}")
        print(f"⊘ Skipped: {skipped}")
        print(f"\nSuccess Rate: {(passed/total*100):.1f}%" if total > 0 else "N/A")
        
        print("\n" + "="*60)
        print("DEPLOYMENT STATUS: " + ("✓ ALL TESTS PASSED" if failed == 0 else "✗ SOME TESTS FAILED"))
        print("="*60 + "\n")
        
        return failed == 0

if __name__ == "__main__":
    tester = DeploymentTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)

import requests
import sys
import json
from datetime import datetime

class ShriRamyaAPITester:
    def __init__(self, base_url="https://shri-ramya-preview.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session_id = f"test_session_{datetime.now().strftime('%H%M%S')}"

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, params=data)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoints"""
        print("\n=== HEALTH CHECK TESTS ===")
        self.run_test("Root endpoint", "GET", "", 200)
        self.run_test("Health check", "GET", "health", 200)

    def test_authentication(self):
        """Test user registration and login"""
        print("\n=== AUTHENTICATION TESTS ===")
        
        # Test registration
        test_user = {
            "email": f"test_{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "TestPass123!",
            "name": "Test User",
            "phone": "9876543210"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   Token obtained: {self.token[:20]}...")
            
            # Test login with same credentials
            login_data = {
                "email": test_user["email"],
                "password": test_user["password"]
            }
            self.run_test("User Login", "POST", "auth/login", 200, data=login_data)
            
            # Test get current user
            self.run_test("Get Current User", "GET", "auth/me", 200)
        else:
            print("❌ Registration failed, skipping auth-dependent tests")
            return False
            
        return True

    def test_products(self):
        """Test product endpoints"""
        print("\n=== PRODUCT TESTS ===")
        
        # Get all products
        success, products = self.run_test("Get All Products", "GET", "products", 200)
        
        if success and products:
            product_id = products[0]['id'] if products else None
            
            if product_id:
                # Test get single product
                self.run_test("Get Single Product", "GET", f"products/{product_id}", 200)
                
                # Test recommendations
                self.run_test("Get Recommendations", "GET", f"recommendations/{product_id}", 200)
            
            # Test category filter
            self.run_test("Get Products by Category", "GET", "products", 200, 
                         data={"category": "Sarees"})
            
            # Test featured products
            self.run_test("Get Featured Products", "GET", "products", 200, 
                         data={"featured": True})
            
            # Test trending products
            self.run_test("Get Trending Products", "GET", "products", 200, 
                         data={"trending": True})
        
        # Test categories
        self.run_test("Get Categories", "GET", "categories", 200)
        
        return product_id

    def test_cart_functionality(self, product_id):
        """Test cart operations"""
        print("\n=== CART TESTS ===")
        
        if not product_id:
            print("❌ No product ID available for cart tests")
            return
        
        # Add item to cart
        cart_item = {
            "product_id": product_id,
            "quantity": 2
        }
        
        self.run_test("Add to Cart", "POST", "cart", 200, data=cart_item)
        
        # Get cart
        self.run_test("Get Cart", "GET", "cart", 200)
        
        # Remove item from cart
        self.run_test("Remove from Cart", "DELETE", f"cart/item/{product_id}", 200)
        
        # Clear cart
        self.run_test("Clear Cart", "DELETE", "cart", 200)

    def test_wishlist_functionality(self, product_id):
        """Test wishlist operations"""
        print("\n=== WISHLIST TESTS ===")
        
        if not product_id or not self.token:
            print("❌ Authentication or product ID required for wishlist tests")
            return
        
        # Add to wishlist
        self.run_test("Add to Wishlist", "POST", f"wishlist/{product_id}", 200)
        
        # Get wishlist
        self.run_test("Get Wishlist", "GET", "wishlist", 200)
        
        # Remove from wishlist
        self.run_test("Remove from Wishlist", "DELETE", f"wishlist/{product_id}", 200)

    def test_order_functionality(self, product_id):
        """Test order creation"""
        print("\n=== ORDER TESTS ===")
        
        if not product_id:
            print("❌ No product ID available for order tests")
            return
        
        # Create order
        order_data = {
            "items": [
                {
                    "product_id": product_id,
                    "quantity": 1
                }
            ],
            "shipping_address": {
                "name": "Test User",
                "phone": "9876543210",
                "address_line1": "123 Test Street",
                "city": "Test City",
                "state": "Test State",
                "pincode": "123456"
            },
            "email": "test@example.com"
        }
        
        success, order_response = self.run_test("Create Order", "POST", "orders/create", 200, data=order_data)
        
        if success and 'order_id' in order_response:
            order_id = order_response['order_id']
            
            # Test payment confirmation
            payment_data = {
                "razorpay_payment_id": "pay_test123",
                "razorpay_order_id": order_response.get('razorpay_order_id'),
                "razorpay_signature": "test_signature"
            }
            
            self.run_test("Confirm Payment", "POST", f"orders/{order_id}/payment", 200, data=payment_data)
            
            # Get order details
            self.run_test("Get Order Details", "GET", f"orders/{order_id}", 200)
            
            # Get user orders (requires auth)
            if self.token:
                self.run_test("Get User Orders", "GET", "orders", 200)

    def test_blog_functionality(self):
        """Test blog endpoints"""
        print("\n=== BLOG TESTS ===")
        
        # Get all blog posts
        success, posts = self.run_test("Get Blog Posts", "GET", "blog", 200)
        
        if success and posts:
            # Test get single blog post by slug
            first_post = posts[0]
            if 'slug' in first_post:
                self.run_test("Get Blog Post by Slug", "GET", f"blog/{first_post['slug']}", 200)

    def test_order_tracking(self):
        """Test order tracking"""
        print("\n=== ORDER TRACKING TESTS ===")
        
        # Test with dummy order number
        self.run_test("Track Order (Not Found)", "GET", "orders/track/DUMMY123", 404)

def main():
    print("🚀 Starting Shri Ramya eCommerce API Tests")
    print("=" * 50)
    
    tester = ShriRamyaAPITester()
    
    # Run all tests
    tester.test_health_check()
    
    auth_success = tester.test_authentication()
    product_id = tester.test_products()
    
    if product_id:
        tester.test_cart_functionality(product_id)
        
        if auth_success:
            tester.test_wishlist_functionality(product_id)
            tester.test_order_functionality(product_id)
    
    tester.test_blog_functionality()
    tester.test_order_tracking()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
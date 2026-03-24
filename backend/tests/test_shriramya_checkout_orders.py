"""
ShriRamya E-commerce API Tests - Checkout, Orders, and Auth Features
Tests for: Customer registration, login, order creation, payment confirmation, my orders
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://category-filters-2.preview.emergentagent.com').rstrip('/')
API_URL = f"{BASE_URL}/api/v1"

# Test credentials
ADMIN_EMAIL = "admin@shriramya.com"
ADMIN_PASSWORD = "Admin@123"
CUSTOMER_EMAIL = "customer@test.com"
CUSTOMER_PASSWORD = "Test@123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{API_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("data", {}).get("access_token") or data.get("access_token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def customer_token(api_client):
    """Get customer authentication token"""
    response = api_client.post(f"{API_URL}/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("data", {}).get("access_token") or data.get("access_token")
    pytest.skip("Customer authentication failed")


class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self, api_client):
        """Test health endpoint returns success"""
        response = api_client.get(f"{API_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("status") == "ok"
        print(f"Health check passed: {data}")


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self, api_client):
        """Test admin login with valid credentials"""
        response = api_client.post(f"{API_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Verify response structure
        user_data = data.get("data", {})
        assert "access_token" in user_data or "tokens" in user_data
        assert "user" in user_data
        assert user_data["user"]["email"] == ADMIN_EMAIL
        assert user_data["user"]["role"] == "admin"
        print(f"Admin login successful: {user_data['user']['email']}")
    
    def test_customer_login_success(self, api_client):
        """Test customer login with valid credentials"""
        response = api_client.post(f"{API_URL}/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        user_data = data.get("data", {})
        assert "access_token" in user_data or "tokens" in user_data
        assert "user" in user_data
        assert user_data["user"]["email"] == CUSTOMER_EMAIL
        assert user_data["user"]["role"] == "customer"
        print(f"Customer login successful: {user_data['user']['email']}")
    
    def test_login_invalid_credentials(self, api_client):
        """Test login with invalid credentials returns 401"""
        response = api_client.post(f"{API_URL}/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        data = response.json()
        assert data.get("success") == False
        print("Invalid credentials correctly rejected")
    
    def test_customer_registration(self, api_client):
        """Test customer registration endpoint"""
        unique_email = f"test_user_{int(time.time())}@example.com"
        response = api_client.post(f"{API_URL}/auth/register", json={
            "name": "Test User",
            "email": unique_email,
            "password": "TestPass@123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        user_data = data.get("data", {})
        assert "access_token" in user_data or "tokens" in user_data
        assert "user" in user_data
        assert user_data["user"]["email"] == unique_email
        assert user_data["user"]["role"] == "customer"
        print(f"Registration successful for: {unique_email}")
    
    def test_registration_duplicate_email(self, api_client):
        """Test registration with existing email returns error"""
        response = api_client.post(f"{API_URL}/auth/register", json={
            "name": "Duplicate User",
            "email": CUSTOMER_EMAIL,  # Already exists
            "password": "TestPass@123"
        })
        assert response.status_code == 409
        data = response.json()
        assert data.get("success") == False
        print("Duplicate email correctly rejected")
    
    def test_auth_me_endpoint(self, api_client, customer_token):
        """Test /auth/me returns current user"""
        response = api_client.get(
            f"{API_URL}/auth/me",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("data", {}).get("email") == CUSTOMER_EMAIL
        print(f"Auth me returned: {data.get('data', {}).get('email')}")
    
    def test_check_admin_endpoint(self, api_client, admin_token):
        """Test /auth/check-admin returns admin status"""
        response = api_client.get(
            f"{API_URL}/auth/check-admin",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        admin_data = data.get("data", {})
        assert admin_data.get("isAdmin") == True or admin_data.get("is_admin") == True
        print("Admin check passed")


class TestProductsAPI:
    """Products API tests"""
    
    def test_get_products(self, api_client):
        """Test getting products list"""
        response = api_client.get(f"{API_URL}/products")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        products = data.get("data", {}).get("products", [])
        assert len(products) > 0
        
        # Verify product structure
        product = products[0]
        assert "id" in product
        assert "name" in product
        assert "basePrice" in product or "price" in product
        print(f"Got {len(products)} products")
    
    def test_get_single_product(self, api_client):
        """Test getting single product by ID"""
        response = api_client.get(f"{API_URL}/products/1")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        product = data.get("data", {})
        assert product.get("id") == 1
        assert "name" in product
        assert "variants" in product or "sizes" in product
        print(f"Got product: {product.get('name')}")
    
    def test_product_filtering_by_size(self, api_client):
        """Test product filtering by size"""
        response = api_client.get(f"{API_URL}/products", params={"size": "S"})
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        products = data.get("data", {}).get("products", [])
        # All returned products should have size S
        for product in products:
            sizes = product.get("sizes", [])
            assert "S" in sizes, f"Product {product.get('name')} doesn't have size S"
        print(f"Size filter returned {len(products)} products")


class TestCartAPI:
    """Cart API tests"""
    
    def test_get_cart(self, api_client):
        """Test getting cart"""
        session_id = f"test_session_{int(time.time())}"
        response = api_client.get(
            f"{API_URL}/cart",
            headers={"x-session-id": session_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("Cart retrieved successfully")
    
    def test_add_to_cart(self, api_client):
        """Test adding item to cart"""
        session_id = f"test_session_{int(time.time())}"
        response = api_client.post(
            f"{API_URL}/cart/add",
            json={"productId": 1, "quantity": 1},
            headers={"x-session-id": session_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        cart = data.get("data", {})
        assert len(cart.get("items", [])) > 0
        print(f"Added to cart, items: {len(cart.get('items', []))}")
    
    def test_cart_with_variant(self, api_client):
        """Test adding item with variant to cart"""
        session_id = f"test_session_variant_{int(time.time())}"
        response = api_client.post(
            f"{API_URL}/cart/add",
            json={"productId": 1, "quantity": 1, "color": "Red", "size": "M"},
            headers={"x-session-id": session_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        cart = data.get("data", {})
        items = cart.get("items", [])
        assert len(items) > 0
        
        # Verify item has attributes
        item = items[0]
        assert "name" in item
        assert "price" in item
        print(f"Added variant to cart: {item.get('name')}")


class TestOrdersAPI:
    """Orders API tests - NEW FEATURES"""
    
    def test_create_order(self, api_client):
        """Test creating an order"""
        order_data = {
            "items": [
                {
                    "productId": 1,
                    "name": "Test Product",
                    "price": 2999,
                    "quantity": 1,
                    "image": "/test.jpg"
                }
            ],
            "shipping_address": {
                "name": "Test User",
                "phone": "9876543210",
                "address_line1": "123 Test Street",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode": "400001"
            },
            "email": "test@example.com",
            "amount": 2999
        }
        
        response = api_client.post(f"{API_URL}/orders", json=order_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        order_response = data.get("data", {})
        assert "order_id" in order_response
        assert "razorpay_order_id" in order_response
        assert "amount" in order_response
        assert "razorpay_key_id" in order_response
        
        print(f"Order created: {order_response.get('order_id')}")
        return order_response.get("order_id")
    
    def test_create_order_empty_cart_fails(self, api_client):
        """Test creating order with empty cart fails"""
        order_data = {
            "items": [],
            "shipping_address": {
                "name": "Test User",
                "phone": "9876543210",
                "address_line1": "123 Test Street",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode": "400001"
            },
            "email": "test@example.com",
            "amount": 0
        }
        
        response = api_client.post(f"{API_URL}/orders", json=order_data)
        assert response.status_code == 400
        data = response.json()
        assert data.get("success") == False
        print("Empty cart order correctly rejected")
    
    def test_confirm_payment(self, api_client):
        """Test confirming payment for an order"""
        # First create an order
        order_data = {
            "items": [
                {
                    "productId": 1,
                    "name": "Test Product",
                    "price": 2999,
                    "quantity": 1
                }
            ],
            "shipping_address": {
                "name": "Test User",
                "phone": "9876543210",
                "address_line1": "123 Test Street",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode": "400001"
            },
            "email": "test@example.com",
            "amount": 2999
        }
        
        create_response = api_client.post(f"{API_URL}/orders", json=order_data)
        assert create_response.status_code == 200
        order_id = create_response.json().get("data", {}).get("order_id")
        razorpay_order_id = create_response.json().get("data", {}).get("razorpay_order_id")
        
        # Confirm payment (mock mode)
        payment_data = {
            "razorpay_payment_id": f"pay_mock_{int(time.time())}",
            "razorpay_order_id": razorpay_order_id,
            "razorpay_signature": "mock_signature"
        }
        
        response = api_client.post(f"{API_URL}/orders/{order_id}/payment", json=payment_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        payment_response = data.get("data", {})
        assert payment_response.get("status") == "paid"
        print(f"Payment confirmed for order: {order_id}")
    
    def test_get_my_orders(self, api_client):
        """Test getting user's orders"""
        response = api_client.get(f"{API_URL}/orders/my")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        orders = data.get("data", [])
        assert isinstance(orders, list)
        print(f"Got {len(orders)} orders")
    
    def test_get_order_by_id(self, api_client):
        """Test getting order by ID"""
        # First create an order
        order_data = {
            "items": [{"productId": 1, "name": "Test", "price": 999, "quantity": 1}],
            "shipping_address": {"name": "Test", "phone": "1234567890", "address_line1": "Test", "city": "Test", "state": "Test", "pincode": "123456"},
            "email": "test@example.com",
            "amount": 999
        }
        
        create_response = api_client.post(f"{API_URL}/orders", json=order_data)
        order_id = create_response.json().get("data", {}).get("order_id")
        
        # Get order by ID
        response = api_client.get(f"{API_URL}/orders/{order_id}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        order = data.get("data", {})
        assert order.get("id") == order_id
        print(f"Retrieved order: {order_id}")
    
    def test_get_nonexistent_order_returns_404(self, api_client):
        """Test getting non-existent order returns 404"""
        response = api_client.get(f"{API_URL}/orders/NONEXISTENT_ORDER_123")
        assert response.status_code == 404
        print("Non-existent order correctly returns 404")
    
    def test_order_tracking(self, api_client):
        """Test order tracking endpoint"""
        # First create an order
        order_data = {
            "items": [{"productId": 1, "name": "Test", "price": 999, "quantity": 1}],
            "shipping_address": {"name": "Test", "phone": "1234567890", "address_line1": "Test", "city": "Test", "state": "Test", "pincode": "123456"},
            "email": "test@example.com",
            "amount": 999
        }
        
        create_response = api_client.post(f"{API_URL}/orders", json=order_data)
        order_id = create_response.json().get("data", {}).get("order_id")
        
        # Get tracking
        response = api_client.get(f"{API_URL}/orders/{order_id}/tracking")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        tracking = data.get("data", {})
        assert "tracking" in tracking
        assert isinstance(tracking.get("tracking"), list)
        print(f"Got tracking for order: {order_id}")


class TestCouponAPI:
    """Coupon API tests"""
    
    def test_apply_valid_coupon(self, api_client):
        """Test applying a valid coupon"""
        session_id = f"test_coupon_{int(time.time())}"
        
        # First add item to cart
        api_client.post(
            f"{API_URL}/cart/add",
            json={"productId": 1, "quantity": 1},
            headers={"x-session-id": session_id}
        )
        
        # Apply coupon
        response = api_client.post(
            f"{API_URL}/cart/coupon/apply",
            json={"couponCode": "WELCOME10"},
            headers={"x-session-id": session_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        cart = data.get("data", {})
        assert cart.get("coupon") is not None
        assert cart.get("discount", 0) > 0
        print(f"Coupon applied, discount: {cart.get('discount')}")
    
    def test_apply_invalid_coupon(self, api_client):
        """Test applying invalid coupon returns error"""
        session_id = f"test_invalid_coupon_{int(time.time())}"
        
        response = api_client.post(
            f"{API_URL}/cart/coupon/apply",
            json={"couponCode": "INVALID_CODE"},
            headers={"x-session-id": session_id}
        )
        assert response.status_code == 400
        data = response.json()
        assert data.get("success") == False
        print("Invalid coupon correctly rejected")


class TestCategoriesAPI:
    """Categories API tests"""
    
    def test_get_categories(self, api_client):
        """Test getting categories list"""
        response = api_client.get(f"{API_URL}/categories")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        categories = data.get("data", {}).get("categories", [])
        assert len(categories) > 0
        
        # Verify category structure
        category = categories[0]
        assert "id" in category
        assert "name" in category
        print(f"Got {len(categories)} categories")


class TestSearchAPI:
    """Search API tests"""
    
    def test_search_products(self, api_client):
        """Test searching products"""
        response = api_client.get(f"{API_URL}/search", params={"q": "silk"})
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        products = data.get("data", {}).get("products", [])
        print(f"Search returned {len(products)} products")
    
    def test_search_suggestions(self, api_client):
        """Test search suggestions"""
        response = api_client.get(f"{API_URL}/search/suggestions", params={"q": "sa"})
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("Search suggestions working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

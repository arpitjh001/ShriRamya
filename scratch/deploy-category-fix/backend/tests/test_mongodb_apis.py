"""
Backend API Tests for ShriRamya E-commerce - MongoDB Migration
Tests all MongoDB-backed APIs: Products, Auth, Orders, Wishlist, Cart, Blog, Admin
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ecommerce-audit-6.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api/v1"

# Test credentials
ADMIN_EMAIL = "admin@shriramya.com"
ADMIN_PASSWORD = "Admin@123"
CUSTOMER_EMAIL = "customer@test.com"
CUSTOMER_PASSWORD = "Test@123"

# Session for maintaining state
session = requests.Session()
session.headers.update({"Content-Type": "application/json"})


class TestHealthAndBasics:
    """Basic health checks and API availability"""
    
    def test_api_base_accessible(self):
        """Test that API base is accessible"""
        response = session.get(f"{API_BASE}/products?limit=1")
        assert response.status_code == 200, f"API not accessible: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print("✓ API base is accessible")


class TestAuthentication:
    """Authentication endpoints - login, register"""
    
    def test_admin_login(self):
        """Test admin login with correct credentials"""
        response = session.post(f"{API_BASE}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "data" in data
        assert "token" in data["data"]
        assert data["data"]["user"]["role"] == "admin"
        print(f"✓ Admin login successful - user: {data['data']['user']['email']}")
        return data["data"]["token"]
    
    def test_customer_login(self):
        """Test customer login with correct credentials"""
        response = session.post(f"{API_BASE}/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "data" in data
        assert "token" in data["data"]
        assert data["data"]["user"]["role"] == "user"
        print(f"✓ Customer login successful - user: {data['data']['user']['email']}")
        return data["data"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = session.post(f"{API_BASE}/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        data = response.json()
        assert data.get("success") == False
        print("✓ Invalid credentials correctly rejected")


class TestProducts:
    """Product endpoints - list, detail, featured, trending"""
    
    def test_get_products_list(self):
        """Test products list endpoint"""
        response = session.get(f"{API_BASE}/products?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "products" in data["data"]
        assert len(data["data"]["products"]) > 0
        assert "pagination" in data["data"]
        print(f"✓ Products list returned {len(data['data']['products'])} products")
    
    def test_get_products_with_filters(self):
        """Test products with category filter"""
        response = session.get(f"{API_BASE}/products?category=silk-sarees&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Products filter works - returned {len(data['data']['products'])} products")
    
    def test_get_featured_products(self):
        """Test featured products endpoint"""
        response = session.get(f"{API_BASE}/products/featured")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert isinstance(data["data"], list)
        print(f"✓ Featured products returned {len(data['data'])} items")
    
    def test_get_trending_products(self):
        """Test trending products endpoint"""
        response = session.get(f"{API_BASE}/products/trending")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Trending products returned {len(data['data'])} items")
    
    def test_get_new_arrivals(self):
        """Test new arrivals endpoint"""
        response = session.get(f"{API_BASE}/products/new-arrivals")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ New arrivals returned {len(data['data'])} items")
    
    def test_get_product_detail(self):
        """Test single product detail"""
        response = session.get(f"{API_BASE}/products/1")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        product = data["data"]
        assert "name" in product
        assert "salePrice" in product
        assert "productId" in product or "id" in product
        print(f"✓ Product detail: {product['name']}")
    
    def test_get_product_not_found(self):
        """Test product not found returns 404"""
        response = session.get(f"{API_BASE}/products/99999")
        assert response.status_code == 404
        print("✓ Product not found correctly returns 404")


class TestCategories:
    """Category endpoints"""
    
    def test_get_categories(self):
        """Test categories list"""
        response = session.get(f"{API_BASE}/categories")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert isinstance(data["data"], list)
        print(f"✓ Categories returned {len(data['data'])} items")


class TestCart:
    """Cart endpoints - add, update, remove, clear"""
    
    @pytest.fixture(autouse=True)
    def setup_session(self):
        """Setup session ID for cart tests"""
        self.session_id = f"test_session_{int(time.time())}"
        session.headers.update({"x-session-id": self.session_id})
    
    def test_add_to_cart(self):
        """Test adding product to cart"""
        response = session.post(f"{API_BASE}/cart/add", json={
            "productId": 1,
            "quantity": 2
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "items" in data["data"]
        print(f"✓ Added to cart - {len(data['data']['items'])} items in cart")
    
    def test_get_cart(self):
        """Test getting cart contents"""
        # First add an item
        session.post(f"{API_BASE}/cart/add", json={"productId": 1, "quantity": 1})
        
        response = session.get(f"{API_BASE}/cart")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "items" in data["data"]
        print(f"✓ Cart retrieved - {len(data['data']['items'])} items")
    
    def test_update_cart_quantity(self):
        """Test updating cart item quantity"""
        # First add an item
        session.post(f"{API_BASE}/cart/add", json={"productId": 2, "quantity": 1})
        
        response = session.put(f"{API_BASE}/cart/update", json={
            "productId": 2,
            "quantity": 5
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✓ Cart quantity updated")
    
    def test_remove_from_cart(self):
        """Test removing item from cart"""
        # First add an item
        session.post(f"{API_BASE}/cart/add", json={"productId": 3, "quantity": 1})
        
        response = session.delete(f"{API_BASE}/cart/remove/3")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✓ Item removed from cart")
    
    def test_clear_cart(self):
        """Test clearing entire cart"""
        response = session.delete(f"{API_BASE}/cart/clear")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✓ Cart cleared")


class TestWishlist:
    """Wishlist endpoints - add, remove, check"""
    
    def test_add_to_wishlist(self):
        """Test adding product to wishlist"""
        response = session.post(f"{API_BASE}/wishlist/add", json={
            "productId": 1,
            "userId": "test_user_wishlist"
        })
        assert response.status_code in [200, 201]
        data = response.json()
        assert data.get("success") == True
        print("✓ Added to wishlist")
    
    def test_add_to_wishlist_alias(self):
        """Test adding via alias endpoint POST /wishlist/:productId"""
        response = session.post(f"{API_BASE}/wishlist/2", json={
            "userId": "test_user_wishlist"
        })
        assert response.status_code in [200, 201]
        data = response.json()
        assert data.get("success") == True
        print("✓ Added to wishlist via alias endpoint")
    
    def test_get_wishlist(self):
        """Test getting wishlist"""
        response = session.get(f"{API_BASE}/wishlist?userId=test_user_wishlist")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert isinstance(data["data"], list)
        print(f"✓ Wishlist retrieved - {len(data['data'])} items")
    
    def test_check_wishlist_item(self):
        """Test checking if item is in wishlist"""
        response = session.get(f"{API_BASE}/wishlist/check/1?userId=test_user_wishlist")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "inWishlist" in data["data"]
        print(f"✓ Wishlist check - inWishlist: {data['data']['inWishlist']}")
    
    def test_remove_from_wishlist(self):
        """Test removing from wishlist"""
        response = session.delete(f"{API_BASE}/wishlist/remove/1?userId=test_user_wishlist")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✓ Removed from wishlist")


class TestOrders:
    """Order endpoints - create, list, detail, cancel"""
    
    def test_create_order(self):
        """Test creating a new order"""
        response = session.post(f"{API_BASE}/orders", json={
            "userId": "test_order_user",
            "email": "test@order.com",
            "name": "Test Order User",
            "items": [
                {"productId": 1, "quantity": 2, "price": 22999, "salePrice": 22999}
            ],
            "shippingAddress": {
                "name": "Test User",
                "phone": "+91-9876543210",
                "street": "123 Test Street",
                "city": "Jaipur",
                "state": "Rajasthan",
                "pincode": "302001"
            },
            "subtotal": 45998,
            "total": 45998,
            "paymentMethod": "razorpay"
        })
        assert response.status_code == 201
        data = response.json()
        assert data.get("success") == True
        assert "orderId" in data["data"]
        print(f"✓ Order created: {data['data']['orderId']}")
        return data["data"]["orderId"]
    
    def test_get_orders_list(self):
        """Test getting orders list"""
        response = session.get(f"{API_BASE}/orders?userId=test_order_user")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Orders list retrieved - {len(data['data'].get('orders', []))} orders")
    
    def test_get_my_orders(self):
        """Test getting user's orders via /orders/my"""
        response = session.get(f"{API_BASE}/orders/my?userId=test_order_user")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ My orders retrieved - {len(data['data'].get('orders', []))} orders")


class TestBlogs:
    """Blog endpoints - list, detail, categories"""
    
    def test_get_blogs_list(self):
        """Test getting blog posts list"""
        response = session.get(f"{API_BASE}/blogs")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "posts" in data["data"]
        print(f"✓ Blogs list retrieved - {len(data['data']['posts'])} posts")
    
    def test_get_blog_categories(self):
        """Test getting blog categories"""
        response = session.get(f"{API_BASE}/blogs/categories")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Blog categories retrieved - {len(data['data'])} categories")
    
    def test_get_blog_stats(self):
        """Test getting blog stats"""
        response = session.get(f"{API_BASE}/blogs/stats")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "total_posts" in data["data"]
        print(f"✓ Blog stats: {data['data']['total_posts']} total posts")
    
    def test_get_blog_by_slug(self):
        """Test getting blog by slug"""
        response = session.get(f"{API_BASE}/blogs/art-of-sanganeri-printing")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "title" in data["data"]
        print(f"✓ Blog detail: {data['data']['title']}")


class TestUserProfile:
    """User profile endpoints"""
    
    def test_get_user_profile(self):
        """Test getting user profile"""
        # First login to get a valid user
        login_resp = session.post(f"{API_BASE}/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        user_id = login_resp.json()["data"]["user"]["id"]
        
        response = session.get(f"{API_BASE}/users/profile?userId={user_id}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "email" in data["data"]
        print(f"✓ User profile retrieved: {data['data']['email']}")
    
    def test_update_user_profile(self):
        """Test updating user profile"""
        # First login to get a valid user
        login_resp = session.post(f"{API_BASE}/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        user_id = login_resp.json()["data"]["user"]["id"]
        
        response = session.put(f"{API_BASE}/users/profile", json={
            "userId": user_id,
            "name": "Updated Test Customer",
            "phone": "+91-9876543299",
            "address": {
                "street": "456 Updated Street",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode": "400001"
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ User profile updated: {data['data']['name']}")


class TestAdminOrders:
    """Admin order management endpoints"""
    
    def test_get_admin_orders(self):
        """Test getting admin orders list with stats"""
        response = session.get(f"{API_BASE}/admin/orders")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "orders" in data["data"]
        assert "stats" in data["data"]
        print(f"✓ Admin orders: {len(data['data']['orders'])} orders, stats: {data['data']['stats']}")
    
    def test_get_admin_orders_with_filter(self):
        """Test admin orders with status filter"""
        response = session.get(f"{API_BASE}/admin/orders?status=pending")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Admin orders filtered by pending: {len(data['data']['orders'])} orders")
    
    def test_get_admin_orders_with_search(self):
        """Test admin orders with search"""
        response = session.get(f"{API_BASE}/admin/orders?search=ORD")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Admin orders search: {len(data['data']['orders'])} orders found")


class TestAdminAnalytics:
    """Admin analytics endpoints"""
    
    def test_get_analytics_overview(self):
        """Test getting analytics overview"""
        response = session.get(f"{API_BASE}/admin/analytics/overview")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "total_orders" in data["data"]
        print(f"✓ Analytics overview: {data['data']['total_orders']} orders, Rs.{data['data']['total_revenue']} revenue")
    
    def test_get_analytics_revenue(self):
        """Test getting revenue analytics"""
        response = session.get(f"{API_BASE}/admin/analytics/revenue")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✓ Revenue analytics retrieved")
    
    def test_get_analytics_sales(self):
        """Test getting sales analytics"""
        response = session.get(f"{API_BASE}/admin/analytics/sales")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✓ Sales analytics retrieved")
    
    def test_get_analytics_products(self):
        """Test getting products analytics"""
        response = session.get(f"{API_BASE}/admin/analytics/products")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Products analytics: {data['data']['total']} total products")


class TestSearch:
    """Search endpoint"""
    
    def test_search_products(self):
        """Test product search"""
        response = session.get(f"{API_BASE}/search?q=silk")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "products" in data["data"]
        print(f"✓ Search 'silk': {len(data['data']['products'])} products found")
    
    def test_search_empty_query(self):
        """Test search with empty query"""
        response = session.get(f"{API_BASE}/search?q=")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✓ Empty search handled correctly")


class TestCoupons:
    """Coupon validation endpoint"""
    
    def test_validate_valid_coupon(self):
        """Test validating a valid coupon"""
        response = session.post(f"{API_BASE}/coupons/validate", json={
            "code": "WELCOME10",
            "cartTotal": 5000
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "discount" in data["data"]
        print(f"✓ Coupon WELCOME10 valid - discount: {data['data']['discount']}")
    
    def test_validate_invalid_coupon(self):
        """Test validating an invalid coupon"""
        response = session.post(f"{API_BASE}/coupons/validate", json={
            "code": "INVALIDCODE",
            "cartTotal": 5000
        })
        assert response.status_code == 404
        print("✓ Invalid coupon correctly rejected")


class TestRecommendations:
    """Recommendations endpoint"""
    
    def test_get_recommendations(self):
        """Test getting product recommendations"""
        response = session.get(f"{API_BASE}/recommendations")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert isinstance(data["data"], list)
        print(f"✓ Recommendations: {len(data['data'])} products")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

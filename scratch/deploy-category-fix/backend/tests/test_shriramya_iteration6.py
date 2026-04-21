"""
ShriRamya E-commerce Backend API Tests - Iteration 6
Tests for auth, products, categories, cart, orders, wishlist, blog, admin endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ecommerce-audit-6.preview.emergentagent.com').rstrip('/')
API_URL = f"{BASE_URL}/api/v1"

# Test credentials
ADMIN_EMAIL = "admin@shriramya.com"
ADMIN_PASSWORD = "Admin@123"
CUSTOMER_EMAIL = "customer@test.com"
CUSTOMER_PASSWORD = "Test@123"


class TestAuthEndpoints:
    """Authentication endpoint tests - CRITICAL for bug fix verification"""
    
    def test_admin_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "data" in data
        assert "token" in data["data"], "Token field missing - BUG FIX VERIFICATION"
        assert "user" in data["data"]
        assert data["data"]["user"]["role"] == "admin"
        assert data["data"]["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Admin login successful, token received")
    
    def test_customer_login_success(self):
        """Test customer login with correct credentials"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "token" in data["data"]
        assert data["data"]["user"]["role"] == "user"
        print(f"✓ Customer login successful")
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "WrongPassword123"
        })
        assert response.status_code == 401
        print(f"✓ Invalid credentials rejected correctly")
    
    def test_check_admin_with_admin_token(self):
        """Test check-admin returns is_admin:true for admin - BUG FIX VERIFICATION"""
        # First login to get token
        login_resp = requests.post(f"{API_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_resp.json()["data"]["token"]
        
        # Check admin endpoint
        response = requests.get(f"{API_URL}/auth/check-admin", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "is_admin" in data["data"], "is_admin field missing - BUG FIX VERIFICATION"
        assert data["data"]["is_admin"] == True, "Admin should have is_admin:true"
        print(f"✓ check-admin returns is_admin:true for admin")
    
    def test_check_admin_with_customer_token(self):
        """Test check-admin returns is_admin:false for customer"""
        # First login to get token
        login_resp = requests.post(f"{API_URL}/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        token = login_resp.json()["data"]["token"]
        
        # Check admin endpoint
        response = requests.get(f"{API_URL}/auth/check-admin", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["is_admin"] == False, "Customer should have is_admin:false"
        print(f"✓ check-admin returns is_admin:false for customer")
    
    def test_check_admin_without_token(self):
        """Test check-admin rejects unauthenticated requests"""
        response = requests.get(f"{API_URL}/auth/check-admin")
        assert response.status_code == 401
        print(f"✓ check-admin rejects unauthenticated requests")


class TestProductsEndpoints:
    """Products API tests"""
    
    def test_get_products_list(self):
        """Test products list endpoint"""
        response = requests.get(f"{API_URL}/products", params={"limit": 10})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "products" in data["data"]
        assert len(data["data"]["products"]) > 0
        assert "pagination" in data["data"]
        print(f"✓ Products list returned {len(data['data']['products'])} products")
    
    def test_get_products_with_category_filter(self):
        """Test products filtered by category including Kurti Material"""
        response = requests.get(f"{API_URL}/products", params={"category": "kurti-material"})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        products = data["data"]["products"]
        assert len(products) > 0, "Kurti Material category should have products"
        for p in products:
            assert p["categorySlug"] == "kurti-material"
        print(f"✓ Kurti Material category has {len(products)} products")
    
    def test_get_single_product(self):
        """Test single product endpoint"""
        # First get a product ID
        list_resp = requests.get(f"{API_URL}/products", params={"limit": 1})
        product_id = list_resp.json()["data"]["products"][0]["productId"]
        
        response = requests.get(f"{API_URL}/products/{product_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["data"]["productId"] == product_id
        print(f"✓ Single product retrieved: {data['data']['name']}")
    
    def test_get_featured_products(self):
        """Test featured products endpoint"""
        response = requests.get(f"{API_URL}/products/featured")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Featured products endpoint works")
    
    def test_get_trending_products(self):
        """Test trending products endpoint"""
        response = requests.get(f"{API_URL}/products/trending")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Trending products endpoint works")


class TestCategoriesEndpoints:
    """Categories API tests"""
    
    def test_get_all_categories(self):
        """Test categories list endpoint"""
        response = requests.get(f"{API_URL}/categories")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        categories = data["data"]
        assert len(categories) > 0
        
        # Check for Kurti Material category
        category_slugs = [c["slug"] for c in categories]
        assert "kurti-material" in category_slugs, "Kurti Material category should exist"
        print(f"✓ Categories returned: {', '.join(category_slugs)}")
    
    def test_get_category_by_slug(self):
        """Test single category endpoint"""
        response = requests.get(f"{API_URL}/categories/silk-sarees")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "products" in data["data"]
        print(f"✓ Category by slug works")


class TestCartEndpoints:
    """Cart API tests"""
    
    def test_get_empty_cart(self):
        """Test getting cart for new session"""
        response = requests.get(f"{API_URL}/cart", headers={"x-session-id": "test_session_123"})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Cart endpoint works")
    
    def test_add_to_cart(self):
        """Test adding product to cart"""
        # Get a product first
        products_resp = requests.get(f"{API_URL}/products", params={"limit": 1})
        product = products_resp.json()["data"]["products"][0]
        
        response = requests.post(f"{API_URL}/cart/add", 
            json={"productId": product["productId"], "quantity": 1},
            headers={"x-session-id": "test_cart_session"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "items" in data["data"]
        print(f"✓ Add to cart works")
    
    def test_clear_cart(self):
        """Test clearing cart"""
        response = requests.delete(f"{API_URL}/cart/clear", 
            headers={"x-session-id": "test_cart_session"}
        )
        assert response.status_code == 200
        print(f"✓ Clear cart works")


class TestWishlistEndpoints:
    """Wishlist API tests"""
    
    def test_get_wishlist(self):
        """Test getting wishlist"""
        response = requests.get(f"{API_URL}/wishlist", headers={"x-user-id": "test_user"})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Wishlist endpoint works")
    
    def test_add_to_wishlist(self):
        """Test adding to wishlist"""
        products_resp = requests.get(f"{API_URL}/products", params={"limit": 1})
        product = products_resp.json()["data"]["products"][0]
        
        response = requests.post(f"{API_URL}/wishlist/{product['productId']}", 
            headers={"x-user-id": "test_user"}
        )
        assert response.status_code in [200, 201]
        print(f"✓ Add to wishlist works")


class TestBlogEndpoints:
    """Blog API tests"""
    
    def test_get_blogs(self):
        """Test getting blog posts"""
        response = requests.get(f"{API_URL}/blogs")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "posts" in data["data"]
        print(f"✓ Blogs endpoint works, {len(data['data']['posts'])} posts")
    
    def test_get_blog_categories(self):
        """Test getting blog categories"""
        response = requests.get(f"{API_URL}/blogs/categories")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Blog categories endpoint works")


class TestAdminEndpoints:
    """Admin API tests - require authentication"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["data"]["token"]
    
    def test_admin_analytics_overview(self, admin_token):
        """Test admin analytics overview"""
        response = requests.get(f"{API_URL}/admin/analytics/overview", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "total_revenue" in data["data"]
        assert "total_orders" in data["data"]
        print(f"✓ Admin analytics overview works")
    
    def test_admin_orders(self, admin_token):
        """Test admin orders endpoint"""
        response = requests.get(f"{API_URL}/admin/orders", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "orders" in data["data"]
        print(f"✓ Admin orders endpoint works")
    
    def test_admin_warehouses(self, admin_token):
        """Test admin warehouses endpoint"""
        response = requests.get(f"{API_URL}/admin/warehouses", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Admin warehouses endpoint works")
    
    def test_admin_low_stock(self, admin_token):
        """Test admin low stock endpoint"""
        response = requests.get(f"{API_URL}/admin/inventory/low-stock", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Admin low stock endpoint works")


class TestOrdersEndpoints:
    """Orders API tests"""
    
    def test_get_my_orders(self):
        """Test getting user orders"""
        response = requests.get(f"{API_URL}/orders/my", headers={"x-user-id": "test_user"})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "orders" in data["data"]
        print(f"✓ My orders endpoint works")


class TestSearchEndpoints:
    """Search API tests"""
    
    def test_search_products(self):
        """Test search endpoint"""
        response = requests.get(f"{API_URL}/search", params={"q": "silk"})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "products" in data["data"]
        print(f"✓ Search endpoint works")


class TestCouponsEndpoints:
    """Coupons API tests"""
    
    def test_validate_valid_coupon(self):
        """Test validating a valid coupon"""
        response = requests.post(f"{API_URL}/coupons/validate", json={
            "code": "WELCOME10",
            "cartTotal": 1000
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "discount" in data["data"]
        print(f"✓ Coupon validation works")
    
    def test_validate_invalid_coupon(self):
        """Test validating an invalid coupon"""
        response = requests.post(f"{API_URL}/coupons/validate", json={
            "code": "INVALIDCODE",
            "cartTotal": 1000
        })
        assert response.status_code == 404
        print(f"✓ Invalid coupon rejected correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

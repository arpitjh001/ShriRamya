"""
ShriRamya E-commerce API Tests - Iteration 3
Testing: Admin Analytics, Admin Blogs CRUD, Admin Orders, Admin Products
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://ecommerce-audit-6.preview.emergentagent.com"

API_URL = f"{BASE_URL}/api/v1"

# Test credentials
ADMIN_EMAIL = "admin@shriramya.com"
ADMIN_PASSWORD = "Admin@123"
CUSTOMER_EMAIL = "customer@test.com"
CUSTOMER_PASSWORD = "Test@123"


class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self):
        """Test health check returns success"""
        response = requests.get(f"{API_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("status") == "ok"
        print(f"✓ Health check passed: {data}")


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login(self):
        """Test admin login returns token"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "access_token" in data.get("data", {})
        assert data["data"]["user"]["role"] == "admin"
        print(f"✓ Admin login successful: {data['data']['user']['email']}")
        return data["data"]["access_token"]
    
    def test_admin_check(self):
        """Test admin check endpoint"""
        token = self.test_admin_login()
        response = requests.get(f"{API_URL}/auth/check-admin", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data["data"]["isAdmin"] == True or data["data"]["is_admin"] == True
        print(f"✓ Admin check passed: isAdmin={data['data'].get('isAdmin', data['data'].get('is_admin'))}")


class TestAdminAnalytics:
    """Admin Analytics API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = response.json()["data"]["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_analytics_overview(self):
        """Test analytics overview endpoint"""
        response = requests.get(f"{API_URL}/admin/analytics/overview", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        analytics = data.get("data", {})
        # Verify expected fields
        assert "total_revenue" in analytics or "totalRevenue" in analytics
        assert "total_orders" in analytics or "totalOrders" in analytics
        print(f"✓ Analytics overview: revenue={analytics.get('total_revenue', analytics.get('totalRevenue'))}")
    
    def test_analytics_sales(self):
        """Test analytics sales endpoint"""
        response = requests.get(f"{API_URL}/admin/analytics/sales", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Analytics sales endpoint working")
    
    def test_analytics_products(self):
        """Test analytics products endpoint"""
        response = requests.get(f"{API_URL}/admin/analytics/products", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Analytics products endpoint working")
    
    def test_analytics_revenue(self):
        """Test analytics revenue endpoint"""
        response = requests.get(f"{API_URL}/admin/analytics/revenue", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Analytics revenue endpoint working")


class TestAdminBlogs:
    """Admin Blog CRUD API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = response.json()["data"]["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_blogs_list(self):
        """Test getting list of blog posts"""
        response = requests.get(f"{API_URL}/blogs", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        posts = data.get("data", {}).get("posts", [])
        assert isinstance(posts, list)
        print(f"✓ Blogs list: {len(posts)} posts found")
        return posts
    
    def test_get_blog_categories(self):
        """Test getting blog categories"""
        response = requests.get(f"{API_URL}/blogs/categories", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Blog categories endpoint working")
    
    def test_get_blog_analytics(self):
        """Test getting blog analytics"""
        response = requests.get(f"{API_URL}/blogs/admin/analytics", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Blog analytics endpoint working")
    
    def test_create_blog_post(self):
        """Test creating a new blog post"""
        new_post = {
            "title": "TEST_Blog Post for Testing",
            "content": "<p>This is a test blog post content.</p>",
            "excerpt": "Test excerpt for the blog post",
            "status": "draft",
            "tags": "test,automation",
            "categories": ["Traditional Crafts"]
        }
        response = requests.post(f"{API_URL}/blogs", json=new_post, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        created_post = data.get("data", {})
        assert created_post.get("title") == new_post["title"]
        assert "id" in created_post
        print(f"✓ Blog post created: id={created_post['id']}, title={created_post['title']}")
        return created_post["id"]
    
    def test_get_blog_by_id(self):
        """Test getting a blog post by ID"""
        # First create a post
        post_id = self.test_create_blog_post()
        
        # Then get it by ID
        response = requests.get(f"{API_URL}/blogs/{post_id}", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data["data"]["id"] == post_id
        print(f"✓ Blog post retrieved by ID: {post_id}")
    
    def test_update_blog_post(self):
        """Test updating a blog post"""
        # First create a post
        post_id = self.test_create_blog_post()
        
        # Update it
        update_data = {
            "title": "TEST_Updated Blog Post Title",
            "content": "<p>Updated content for the blog post.</p>"
        }
        response = requests.put(f"{API_URL}/blogs/{post_id}", json=update_data, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data["data"]["title"] == update_data["title"]
        print(f"✓ Blog post updated: {post_id}")
    
    def test_publish_blog_post(self):
        """Test publishing a blog post"""
        # First create a draft post
        post_id = self.test_create_blog_post()
        
        # Publish it
        response = requests.post(f"{API_URL}/blogs/{post_id}/publish", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data["data"]["status"] == "published"
        print(f"✓ Blog post published: {post_id}")
    
    def test_archive_blog_post(self):
        """Test archiving a blog post"""
        # First create and publish a post
        post_id = self.test_create_blog_post()
        requests.post(f"{API_URL}/blogs/{post_id}/publish", headers=self.headers)
        
        # Archive it
        response = requests.post(f"{API_URL}/blogs/{post_id}/archive", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data["data"]["status"] == "archived"
        print(f"✓ Blog post archived: {post_id}")
    
    def test_delete_blog_post(self):
        """Test deleting a blog post"""
        # First create a post
        post_id = self.test_create_blog_post()
        
        # Delete it
        response = requests.delete(f"{API_URL}/blogs/{post_id}", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Blog post deleted: {post_id}")
        
        # Verify it's deleted
        response = requests.get(f"{API_URL}/blogs/{post_id}", headers=self.headers)
        assert response.status_code == 404


class TestAdminOrders:
    """Admin Orders API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = response.json()["data"]["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_all_orders(self):
        """Test getting all orders (admin)"""
        response = requests.get(f"{API_URL}/orders/admin/all", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Admin orders endpoint working")


class TestAdminProducts:
    """Admin Products API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = response.json()["data"]["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_products(self):
        """Test getting products list"""
        response = requests.get(f"{API_URL}/products", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        products = data.get("data", {}).get("products", [])
        assert len(products) > 0
        print(f"✓ Products list: {len(products)} products found")
    
    def test_get_product_by_id(self):
        """Test getting a single product"""
        response = requests.get(f"{API_URL}/products/1", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        product = data.get("data", {})
        assert product.get("id") == 1
        print(f"✓ Product retrieved: id=1, name={product.get('name')}")


class TestCartAndAddToCart:
    """Cart API tests - specifically for Add to Cart functionality"""
    
    def test_add_to_cart_basic(self):
        """Test basic add to cart functionality"""
        # Create a new session
        response = requests.get(f"{API_URL}/cart")
        session_id = response.headers.get('x-session-id')
        
        # Add product to cart
        add_response = requests.post(f"{API_URL}/cart/add", 
            json={"productId": 1, "quantity": 1},
            headers={"x-session-id": session_id} if session_id else {}
        )
        assert add_response.status_code == 200
        data = add_response.json()
        assert data.get("success") == True
        cart = data.get("data", {})
        assert len(cart.get("items", [])) > 0
        print(f"✓ Add to cart successful: {len(cart['items'])} items in cart")
    
    def test_add_to_cart_with_variant(self):
        """Test add to cart with color and size variant"""
        # Create a new session
        response = requests.get(f"{API_URL}/cart")
        session_id = response.headers.get('x-session-id')
        
        # Add product with variant
        add_response = requests.post(f"{API_URL}/cart/add", 
            json={
                "productId": 1, 
                "quantity": 1,
                "color": "Red",
                "size": "M"
            },
            headers={"x-session-id": session_id} if session_id else {}
        )
        assert add_response.status_code == 200
        data = add_response.json()
        assert data.get("success") == True
        print(f"✓ Add to cart with variant successful")


class TestRecentlyViewedPrerequisites:
    """Test prerequisites for Recently Viewed feature"""
    
    def test_product_detail_endpoint(self):
        """Test product detail endpoint returns data needed for recently viewed"""
        response = requests.get(f"{API_URL}/products/1")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        product = data.get("data", {})
        assert "id" in product
        assert "name" in product
        print(f"✓ Product detail endpoint working for recently viewed: id={product['id']}")
    
    def test_multiple_products_for_recently_viewed(self):
        """Test fetching multiple products (simulating recently viewed)"""
        product_ids = [1, 2, 3]
        for pid in product_ids:
            response = requests.get(f"{API_URL}/products/{pid}")
            assert response.status_code == 200
            data = response.json()
            assert data.get("success") == True
            print(f"✓ Product {pid} fetched successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

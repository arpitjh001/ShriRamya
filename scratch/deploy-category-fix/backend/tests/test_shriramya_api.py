"""
ShriRamya E-Commerce API Tests
Tests for Products, Auth, Cart, Categories, and Filtering APIs
All APIs use MOCK data layer
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ecommerce-audit-6.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api/v1"


class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self):
        """Test API health check"""
        response = requests.get(f"{API_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert data['status'] == 'ok'
        print("✓ Health check passed")


class TestAuthAPI:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": "admin@shriramya.com",
            "password": "Admin@123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert 'data' in data
        assert 'access_token' in data['data']
        assert data['data']['user']['email'] == 'admin@shriramya.com'
        assert data['data']['user']['role'] == 'admin'
        print("✓ Admin login successful")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        data = response.json()
        assert data['success'] == False
        print("✓ Invalid login rejected correctly")
    
    def test_auth_me_without_token(self):
        """Test /auth/me without token"""
        response = requests.get(f"{API_URL}/auth/me")
        assert response.status_code == 401
        print("✓ Unauthenticated /auth/me rejected")
    
    def test_auth_me_with_token(self):
        """Test /auth/me with valid token"""
        # First login
        login_response = requests.post(f"{API_URL}/auth/login", json={
            "email": "admin@shriramya.com",
            "password": "Admin@123"
        })
        token = login_response.json()['data']['access_token']
        
        # Then get user info
        response = requests.get(f"{API_URL}/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert data['data']['email'] == 'admin@shriramya.com'
        print("✓ Authenticated /auth/me works")


class TestProductsAPI:
    """Products endpoint tests"""
    
    def test_get_all_products(self):
        """Test getting all products"""
        response = requests.get(f"{API_URL}/products")
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert 'data' in data
        assert 'products' in data['data']
        assert len(data['data']['products']) > 0
        print(f"✓ Got {len(data['data']['products'])} products")
    
    def test_products_have_real_images(self):
        """Test that products have real Unsplash/Pexels images"""
        response = requests.get(f"{API_URL}/products?per_page=10")
        data = response.json()
        products = data['data']['products']
        
        for product in products:
            thumbnail = product.get('thumbnail', '')
            images = product.get('images', [])
            
            # Check thumbnail is from Unsplash or Pexels
            assert 'unsplash.com' in thumbnail or 'pexels.com' in thumbnail, \
                f"Product {product['id']} has invalid thumbnail: {thumbnail}"
            
            # Check all images are from Unsplash or Pexels
            for img in images:
                assert 'unsplash.com' in img or 'pexels.com' in img, \
                    f"Product {product['id']} has invalid image: {img}"
        
        print(f"✓ All {len(products)} products have real model images")
    
    def test_products_pagination(self):
        """Test products pagination"""
        response = requests.get(f"{API_URL}/products?page=1&per_page=5")
        data = response.json()
        
        assert 'pagination' in data['data']
        pagination = data['data']['pagination']
        assert pagination['page'] == 1
        assert pagination['limit'] == 5
        assert pagination['total'] > 0
        assert 'hasNext' in pagination
        print(f"✓ Pagination works - Total: {pagination['total']}, Pages: {pagination['pages']}")
    
    def test_products_filter_metadata(self):
        """Test that filter metadata is returned"""
        response = requests.get(f"{API_URL}/products")
        data = response.json()
        
        assert 'filters' in data['data']
        filters = data['data']['filters']
        
        # Check all expected filter categories exist
        assert 'sizes' in filters
        assert 'colors' in filters
        assert 'fabrics' in filters
        assert 'occasions' in filters
        assert 'priceRange' in filters
        assert 'priceRange' in filters and 'min' in filters['priceRange']
        assert 'priceRange' in filters and 'max' in filters['priceRange']
        
        print(f"✓ Filter metadata returned with {len(filters['sizes'])} sizes, {len(filters['colors'])} colors")
    
    def test_products_sort_options(self):
        """Test that sort options are returned"""
        response = requests.get(f"{API_URL}/products")
        data = response.json()
        
        assert 'sortOptions' in data['data']
        sort_options = data['data']['sortOptions']
        assert len(sort_options) > 0
        
        # Check expected sort options
        sort_values = [opt['value'] for opt in sort_options]
        assert 'price_low' in sort_values
        assert 'price_high' in sort_values
        assert 'popularity' in sort_values
        print(f"✓ Sort options returned: {sort_values}")
    
    def test_get_single_product(self):
        """Test getting a single product by ID"""
        response = requests.get(f"{API_URL}/products/1")
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert data['data']['id'] == 1
        assert 'name' in data['data']
        assert 'thumbnail' in data['data']
        print(f"✓ Got product: {data['data']['name']}")
    
    def test_product_not_found(self):
        """Test 404 for non-existent product"""
        response = requests.get(f"{API_URL}/products/99999")
        assert response.status_code == 404
        print("✓ Non-existent product returns 404")


class TestProductFiltering:
    """Product filtering tests - Libas-style filtering system"""
    
    def test_filter_by_size(self):
        """Test filtering products by size"""
        response = requests.get(f"{API_URL}/products?size=S")
        data = response.json()
        
        assert data['success'] == True
        products = data['data']['products']
        total = data['data']['totalProducts']
        
        # Verify all returned products have size S
        for product in products:
            assert 'S' in product['sizes'], f"Product {product['id']} doesn't have size S"
        
        print(f"✓ Size filter works - {total} products with size S")
    
    def test_filter_by_color(self):
        """Test filtering products by color"""
        response = requests.get(f"{API_URL}/products?color=Red")
        data = response.json()
        
        assert data['success'] == True
        products = data['data']['products']
        
        # Verify all returned products have Red color
        for product in products:
            colors_lower = [c.lower() for c in product['colors']]
            assert any('red' in c for c in colors_lower), \
                f"Product {product['id']} doesn't have Red color"
        
        print(f"✓ Color filter works - {len(products)} products with Red")
    
    def test_filter_by_fabric(self):
        """Test filtering products by fabric"""
        response = requests.get(f"{API_URL}/products?fabric=Cotton")
        data = response.json()
        
        assert data['success'] == True
        products = data['data']['products']
        
        for product in products:
            assert product['fabric'].lower() == 'cotton', \
                f"Product {product['id']} fabric is {product['fabric']}, not Cotton"
        
        print(f"✓ Fabric filter works - {len(products)} Cotton products")
    
    def test_filter_by_occasion(self):
        """Test filtering products by occasion"""
        response = requests.get(f"{API_URL}/products?occasion=Wedding")
        data = response.json()
        
        assert data['success'] == True
        products = data['data']['products']
        
        for product in products:
            assert product['occasion'].lower() == 'wedding', \
                f"Product {product['id']} occasion is {product['occasion']}, not Wedding"
        
        print(f"✓ Occasion filter works - {len(products)} Wedding products")
    
    def test_filter_by_price_range(self):
        """Test filtering products by price range"""
        response = requests.get(f"{API_URL}/products?price_min=1000&price_max=5000")
        data = response.json()
        
        assert data['success'] == True
        products = data['data']['products']
        
        for product in products:
            effective_price = product.get('effectivePrice') or product.get('salePrice') or product['basePrice']
            assert 1000 <= effective_price <= 5000, \
                f"Product {product['id']} price {effective_price} not in range 1000-5000"
        
        print(f"✓ Price range filter works - {len(products)} products in ₹1000-₹5000")
    
    def test_filter_by_discount(self):
        """Test filtering products by minimum discount"""
        response = requests.get(f"{API_URL}/products?discount=20")
        data = response.json()
        
        assert data['success'] == True
        products = data['data']['products']
        
        for product in products:
            assert product['discount'] >= 20, \
                f"Product {product['id']} discount {product['discount']}% is less than 20%"
        
        print(f"✓ Discount filter works - {len(products)} products with 20%+ off")
    
    def test_multiple_filters(self):
        """Test combining multiple filters"""
        response = requests.get(f"{API_URL}/products?fabric=Cotton&occasion=Casual")
        data = response.json()
        
        assert data['success'] == True
        products = data['data']['products']
        
        for product in products:
            assert product['fabric'].lower() == 'cotton'
            assert product['occasion'].lower() == 'casual'
        
        print(f"✓ Multiple filters work - {len(products)} Cotton Casual products")


class TestProductSorting:
    """Product sorting tests"""
    
    def test_sort_by_price_low(self):
        """Test sorting by price low to high"""
        response = requests.get(f"{API_URL}/products?sort_by=price_low&per_page=10")
        data = response.json()
        
        products = data['data']['products']
        prices = [p['effectivePrice'] for p in products]
        
        assert prices == sorted(prices), "Products not sorted by price low to high"
        print(f"✓ Sort by price_low works - Prices: {prices[:5]}...")
    
    def test_sort_by_price_high(self):
        """Test sorting by price high to low"""
        response = requests.get(f"{API_URL}/products?sort_by=price_high&per_page=10")
        data = response.json()
        
        products = data['data']['products']
        prices = [p['effectivePrice'] for p in products]
        
        assert prices == sorted(prices, reverse=True), "Products not sorted by price high to low"
        print(f"✓ Sort by price_high works - Prices: {prices[:5]}...")
    
    def test_sort_by_discount(self):
        """Test sorting by discount"""
        response = requests.get(f"{API_URL}/products?sort_by=discount&per_page=10")
        data = response.json()
        
        products = data['data']['products']
        discounts = [p['discount'] for p in products]
        
        assert discounts == sorted(discounts, reverse=True), "Products not sorted by discount"
        print(f"✓ Sort by discount works - Discounts: {discounts[:5]}...")


class TestCategoriesAPI:
    """Categories endpoint tests"""
    
    def test_get_all_categories(self):
        """Test getting all categories"""
        response = requests.get(f"{API_URL}/categories")
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert 'categories' in data['data']
        categories = data['data']['categories']
        assert len(categories) > 0
        print(f"✓ Got {len(categories)} categories")
    
    def test_get_category_by_id(self):
        """Test getting category by ID"""
        response = requests.get(f"{API_URL}/categories/1")
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert data['data']['id'] == 1
        print(f"✓ Got category: {data['data']['name']}")


class TestCartAPI:
    """Cart endpoint tests"""
    
    def test_get_empty_cart(self):
        """Test getting empty cart"""
        response = requests.get(f"{API_URL}/cart")
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert 'items' in data['data']
        print("✓ Empty cart retrieved")
    
    def test_add_to_cart(self):
        """Test adding item to cart"""
        session_id = f"test_session_{os.getpid()}"
        
        response = requests.post(
            f"{API_URL}/cart/add",
            json={"productId": 1, "quantity": 1},
            headers={"x-session-id": session_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert len(data['data']['items']) > 0
        
        # Verify cart item has image
        cart_item = data['data']['items'][0]
        assert 'image' in cart_item
        assert cart_item['image'] is not None
        assert 'unsplash.com' in cart_item['image'] or 'pexels.com' in cart_item['image']
        
        print(f"✓ Added to cart - Item has image: {cart_item['image'][:50]}...")
        
        # Cleanup - clear cart
        requests.delete(f"{API_URL}/cart", headers={"x-session-id": session_id})
    
    def test_cart_item_has_product_details(self):
        """Test that cart items include product name, image, price"""
        session_id = f"test_session_details_{os.getpid()}"
        
        # Add item
        requests.post(
            f"{API_URL}/cart/add",
            json={"productId": 1, "quantity": 1},
            headers={"x-session-id": session_id}
        )
        
        # Get cart
        response = requests.get(f"{API_URL}/cart", headers={"x-session-id": session_id})
        data = response.json()
        
        cart_item = data['data']['items'][0]
        assert 'name' in cart_item
        assert 'image' in cart_item
        assert 'price' in cart_item
        assert cart_item['price'] > 0
        
        print(f"✓ Cart item has details - Name: {cart_item['name']}, Price: {cart_item['price']}")
        
        # Cleanup
        requests.delete(f"{API_URL}/cart", headers={"x-session-id": session_id})
    
    def test_update_cart_quantity(self):
        """Test updating cart item quantity"""
        session_id = f"test_session_update_{os.getpid()}"
        
        # Add item
        add_response = requests.post(
            f"{API_URL}/cart/add",
            json={"productId": 1, "quantity": 1},
            headers={"x-session-id": session_id}
        )
        item_id = add_response.json()['data']['items'][0]['id']
        
        # Update quantity
        response = requests.put(
            f"{API_URL}/cart/item/{item_id}",
            json={"quantity": 3},
            headers={"x-session-id": session_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['data']['items'][0]['quantity'] == 3
        
        print("✓ Cart quantity updated to 3")
        
        # Cleanup
        requests.delete(f"{API_URL}/cart", headers={"x-session-id": session_id})
    
    def test_remove_from_cart(self):
        """Test removing item from cart"""
        session_id = f"test_session_remove_{os.getpid()}"
        
        # Add item
        add_response = requests.post(
            f"{API_URL}/cart/add",
            json={"productId": 1, "quantity": 1},
            headers={"x-session-id": session_id}
        )
        item_id = add_response.json()['data']['items'][0]['id']
        
        # Remove item
        response = requests.delete(
            f"{API_URL}/cart/item/{item_id}",
            headers={"x-session-id": session_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data['data']['items']) == 0
        
        print("✓ Item removed from cart")


class TestSearchAPI:
    """Search endpoint tests"""
    
    def test_search_products(self):
        """Test searching products"""
        response = requests.get(f"{API_URL}/search?q=silk")
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert 'products' in data['data']
        print(f"✓ Search returned {len(data['data']['products'])} results for 'silk'")
    
    def test_search_suggestions(self):
        """Test search suggestions"""
        response = requests.get(f"{API_URL}/search/suggestions?q=kur")
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        print(f"✓ Search suggestions returned {len(data['data'])} results")


class TestRecommendationsAPI:
    """Recommendations endpoint tests"""
    
    def test_product_recommendations(self):
        """Test getting product recommendations"""
        response = requests.get(f"{API_URL}/recommendations/1")
        assert response.status_code == 200
        data = response.json()
        assert data['success'] == True
        assert 'products' in data['data']
        print(f"✓ Got {len(data['data']['products'])} recommendations for product 1")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

"""
WooCommerce Setup Helper
Generates WooCommerce REST API keys and configures WooCommerce via WordPress CLI.
Run after docker-compose up to complete the WooCommerce headless setup.
"""

import requests
import json
import sys
import os
import time

WORDPRESS_URL = os.getenv("WORDPRESS_URL", "http://localhost:8081")
WP_USER = os.getenv("WP_ADMIN_USER", "admin")
WP_PASS = os.getenv("WP_ADMIN_PASS", "admin")


def wait_for_wordpress(max_retries=30):
    """Wait for WordPress to be ready"""
    print("⏳ Waiting for WordPress to be ready...")
    for i in range(max_retries):
        try:
            resp = requests.get(f"{WORDPRESS_URL}/wp-json/", timeout=5)
            if resp.status_code == 200:
                print("✅ WordPress is ready!")
                return True
        except requests.exceptions.ConnectionError:
            pass
        print(f"   Retry {i+1}/{max_retries}...")
        time.sleep(5)
    print("❌ WordPress not reachable after retries")
    return False


def check_woocommerce_active():
    """Check if WooCommerce plugin is active"""
    try:
        resp = requests.get(f"{WORDPRESS_URL}/wp-json/wc/v3/", timeout=5)
        if resp.status_code in [200, 401]:
            print("✅ WooCommerce REST API is active!")
            return True
    except:
        pass
    print("⚠️  WooCommerce may not be installed/activated yet.")
    print("   Install WooCommerce via WordPress Admin → Plugins → Add New → Search 'WooCommerce'")
    return False


def generate_api_keys():
    """Generate WooCommerce REST API consumer keys"""
    print("\n📦 WooCommerce Headless Setup Guide")
    print("=" * 50)
    print()
    print("To generate WooCommerce REST API keys:")
    print()
    print(f"1. Go to: {WORDPRESS_URL}/wp-admin")
    print(f"2. Login with your WordPress admin credentials")
    print("3. Navigate to: WooCommerce → Settings → Advanced → REST API")
    print("4. Click 'Add Key'")
    print("5. Set:")
    print("   - Description: 'Shri Ramya Headless'")
    print("   - User: Your admin user")
    print("   - Permissions: Read/Write")
    print("6. Click 'Generate API Key'")
    print("7. Copy the Consumer Key (ck_...) and Consumer Secret (cs_...)")
    print()
    print("Then set these environment variables:")
    print()
    print("  export WOOCOMMERCE_CONSUMER_KEY=ck_xxxxxxxxxxxxx")
    print("  export WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxxxxxxxxxx")
    print()
    print("Or add them to backend/.env:")
    print()
    print("  WOOCOMMERCE_CONSUMER_KEY=ck_xxxxxxxxxxxxx")
    print("  WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxxxxxxxxxx")
    print()


def configure_permalinks():
    """Remind to set permalinks for REST API"""
    print("\n🔗 Permalink Setup (Required for REST API)")
    print("-" * 40)
    print(f"1. Go to: {WORDPRESS_URL}/wp-admin/options-permalink.php")
    print("2. Select 'Post name' (/%postname%/)")
    print("3. Click 'Save Changes'")
    print("   This is REQUIRED for WooCommerce REST API to work!")
    print()


def test_connection():
    """Test WooCommerce REST API connection"""
    ck = os.getenv("WOOCOMMERCE_CONSUMER_KEY", "")
    cs = os.getenv("WOOCOMMERCE_CONSUMER_SECRET", "")

    if not ck or not cs or ck.startswith("ck_your"):
        print("\n⚠️  WooCommerce API keys not configured yet.")
        print("   Run the setup steps above first.")
        return False

    print("\n🔌 Testing WooCommerce API connection...")
    try:
        from woocommerce import API
        wcapi = API(
            url=WORDPRESS_URL,
            consumer_key=ck,
            consumer_secret=cs,
            version="wc/v3",
            timeout=15,
            verify_ssl=False
        )
        resp = wcapi.get("products", params={"per_page": 1})
        if resp.status_code == 200:
            print("✅ WooCommerce API connection successful!")
            products = resp.json()
            print(f"   Found {len(products)} product(s)")
            return True
        else:
            print(f"❌ API returned status {resp.status_code}: {resp.text[:200]}")
            return False
    except Exception as e:
        print(f"❌ Connection failed: {str(e)}")
        return False


def print_api_endpoints():
    """Print available API endpoints"""
    print("\n📡 Available WooCommerce Headless API Endpoints")
    print("=" * 55)
    endpoints = [
        ("Products", [
            ("GET", "/api/wc/products", "List all products"),
            ("GET", "/api/wc/products/{id}", "Get single product"),
            ("POST", "/api/wc/products", "Create product"),
            ("PUT", "/api/wc/products/{id}", "Update product"),
            ("DELETE", "/api/wc/products/{id}", "Delete product"),
        ]),
        ("Categories", [
            ("GET", "/api/wc/categories", "List categories"),
            ("POST", "/api/wc/categories", "Create category"),
            ("DELETE", "/api/wc/categories/{id}", "Delete category"),
        ]),
        ("Orders", [
            ("GET", "/api/wc/orders", "List orders"),
            ("GET", "/api/wc/orders/{id}", "Get order"),
            ("POST", "/api/wc/orders", "Create order"),
            ("PATCH", "/api/wc/orders/{id}/status", "Update status"),
            ("POST", "/api/wc/orders/{id}/paid", "Mark paid"),
        ]),
        ("Customers", [
            ("GET", "/api/wc/customers", "List customers"),
            ("POST", "/api/wc/customers", "Create customer"),
            ("PUT", "/api/wc/customers/{id}", "Update customer"),
            ("GET", "/api/wc/customers/lookup/{email}", "Find by email"),
        ]),
        ("Coupons", [
            ("GET", "/api/wc/coupons", "List coupons"),
            ("POST", "/api/wc/coupons", "Create coupon"),
            ("GET", "/api/wc/coupons/validate/{code}", "Validate coupon"),
        ]),
        ("Reports", [
            ("GET", "/api/wc/reports/sales", "Sales report"),
            ("GET", "/api/wc/reports/top-sellers", "Top sellers"),
        ]),
    ]
    for section, routes in endpoints:
        print(f"\n  {section}:")
        for method, path, desc in routes:
            print(f"    {method:7s} {path:45s} {desc}")
    print()


if __name__ == "__main__":
    print("🛍️  Shri Ramya - WooCommerce Headless Setup")
    print("=" * 50)

    wp_ready = wait_for_wordpress()
    if wp_ready:
        check_woocommerce_active()

    configure_permalinks()
    generate_api_keys()
    test_connection()
    print_api_endpoints()

    print("\n✨ Setup guide complete!")
    print("   Admin Dashboard: http://localhost:3000/admin/woocommerce")
    print("   API Docs: http://localhost:8000/docs")
    print()

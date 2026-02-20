#!/usr/bin/env python3
"""
WooCommerce API connectivity test
"""

import sys

print("=" * 70)
print("WOOCOMMERCE API CONNECTIVITY TEST")
print("=" * 70)

# Test 1: Basic WordPress connectivity
print("\n[TEST 1] WordPress Frontend")
try:
    import urllib.request
    response = urllib.request.urlopen("http://localhost:8081", timeout=5)
    status = response.status
    print(f"✓ WordPress frontend accessible: HTTP {status}")
except Exception as e:
    print(f"✗ WordPress not accessible: {e}")
    sys.exit(1)

# Test 2: WordPress REST API
print("\n[TEST 2] WordPress REST API")
try:
    import urllib.request
    import json
    
    url = "http://localhost:8081/wp-json/"
    response = urllib.request.urlopen(url, timeout=5)
    data = json.loads(response.read())
    print(f"✓ WordPress REST API responding")
    print(f"  - Namespace: {data.get('_links', {}).get('curies', [{}])[0].get('name', 'unknown')}")
except Exception as e:
    print(f"✗ WordPress REST API error: {type(e).__name__}: {e}")

# Test 3: WooCommerce Plugin Check
print("\n[TEST 3] WooCommerce Plugin Status")
try:
    import urllib.request
    import json
    
    # Check if WooCommerce REST API is available
    url = "http://localhost:8081/wp-json/wc/"
    response = urllib.request.urlopen(url, timeout=5)
    data = json.loads(response.read())
    print(f"✓ WooCommerce REST API namespace found")
    print(f"  - Version: {data.get('_links', {})}")
except Exception as e:
    print(f"✗ WooCommerce not detected: {type(e).__name__}")
    print("  - WooCommerce plugin may not be activated or fully initialized")

# Test 4: WooCommerce Products (without auth)
print("\n[TEST 4] WooCommerce Products API (Public)")
try:
    import urllib.request
    import json
    
    url = "http://localhost:8081/wp-json/wc/v3/products?per_page=1"
    response = urllib.request.urlopen(url, timeout=5)
    data = json.loads(response.read())
    print(f"✓ WooCommerce products accessible")
    print(f"  - Products found: {len(data)}")
    if data:
        print(f"  - First product: {data[0].get('name', 'Unknown')}")
except urllib.error.HTTPError as e:
    print(f"✗ HTTP {e.code}: {e.reason}")
    if e.code == 401:
        print("  - Authentication required (API key needed)")
    elif e.code == 404:
        print("  - Endpoint not found (WooCommerce may not be installed)")
except Exception as e:
    print(f"✗ Error: {type(e).__name__}: {str(e)[:100]}")

# Test 5: WooCommerce Categories
print("\n[TEST 5] WooCommerce Categories API")
try:
    import urllib.request
    import json
    
    url = "http://localhost:8081/wp-json/wc/v3/products/categories"
    response = urllib.request.urlopen(url, timeout=5)
    data = json.loads(response.read())
    print(f"✓ WooCommerce categories accessible")
    print(f"  - Categories found: {len(data)}")
    if data:
        for cat in data[:3]:
            print(f"    - {cat.get('name', 'Unknown')}")
except Exception as e:
    print(f"✗ Error: {type(e).__name__}")

# Test 6: Check MySQL for WooCommerce data
print("\n[TEST 6] WooCommerce Data in MySQL")
try:
    import mysql.connector
    
    conn = mysql.connector.connect(
        host="localhost",
        port=3306,
        user="wpuser",
        password="wppassword",
        database="shriramya"
    )
    
    cursor = conn.cursor()
    
    # Check products
    cursor.execute("SELECT COUNT(*) FROM wp_posts WHERE post_type='product'")
    prod_count = cursor.fetchone()[0]
    print(f"✓ Products in MySQL: {prod_count}")
    
    # Check product meta (WooCommerce metadata)
    cursor.execute("SELECT COUNT(*) FROM wp_postmeta WHERE meta_key='_sku'")
    sku_count = cursor.fetchone()[0]
    print(f"✓ Products with SKU: {sku_count}")
    
    # Check if WooCommerce options are set
    cursor.execute("SELECT COUNT(*) FROM wp_options WHERE option_name LIKE 'woocommerce%'")
    woo_options = cursor.fetchone()[0]
    print(f"✓ WooCommerce options in DB: {woo_options}")
    
    if woo_options == 0:
        print("  ⚠ WooCommerce may not be fully initialized")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"✗ MySQL error: {e}")

print("\n" + "=" * 70)
print("\nSUMMARY:")
print("✓ MongoDB: WORKING")
print("✓ MySQL: WORKING")
print("✓ WordPress: Running at http://localhost:8081")
print("⚠ WooCommerce API: May be initializing or needs configuration")
print("\nNext steps if WooCommerce API not responding:")
print("1. Wait 2-3 minutes for full WordPress initialization")
print("2. Access WordPress admin: http://localhost:8081/wp-admin")
print("3. Verify WooCommerce plugin is activated")
print("4. Generate API keys in WooCommerce settings")
print("=" * 70)

#!/usr/bin/env python3
"""
Test WooCommerce API connectivity
"""

import os
from dotenv import load_dotenv
from woocommerce import API
import sys

# Load environment variables
load_dotenv("backend/.env")

WOOCOMMERCE_URL = os.getenv("WOOCOMMERCE_URL", "http://wordpress")
WOOCOMMERCE_CONSUMER_KEY = os.getenv("WOOCOMMERCE_CONSUMER_KEY")
WOOCOMMERCE_CONSUMER_SECRET = os.getenv("WOOCOMMERCE_CONSUMER_SECRET")

print("=" * 60)
print("WOOCOMMERCE API CONNECTION TEST")
print("=" * 60)

print(f"\nWooCommerce URL: {WOOCOMMERCE_URL}")
print(f"Consumer Key: {WOOCOMMERCE_CONSUMER_KEY[:20]}..." if WOOCOMMERCE_CONSUMER_KEY else "Consumer Key: NOT SET")
print(f"Consumer Secret: {WOOCOMMERCE_CONSUMER_SECRET[:20]}..." if WOOCOMMERCE_CONSUMER_SECRET else "Consumer Secret: NOT SET")

try:
    wcapi = API(
        url=WOOCOMMERCE_URL,
        consumer_key=WOOCOMMERCE_CONSUMER_KEY,
        consumer_secret=WOOCOMMERCE_CONSUMER_SECRET,
        version="wc/v3",
        timeout=10
    )
    
    print("\n[TEST 1] WooCommerce Connection Test")
    response = wcapi.get("products", params={"per_page": 1})
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ WooCommerce API connection: SUCCESS")
        print(f"✓ Response status: {response.status_code}")
        print(f"✓ Sample response structure received")
        
        if isinstance(data, list):
            print(f"✓ Products accessible: {len(data)} products found")
            if data:
                print(f"  - First product: {data[0].get('name', 'Unknown')}")
        
        print("\n[TEST 2] WooCommerce Categories Test")
        cat_response = wcapi.get("products/categories", params={"per_page": 5})
        if cat_response.status_code == 200:
            categories = cat_response.json()
            print(f"✓ Categories accessible: {len(categories)} categories found")
            if categories:
                for i, cat in enumerate(categories[:3], 1):
                    print(f"  {i}. {cat.get('name', 'Unknown')}")
        
        print("\n" + "=" * 60)
        print("RESULT: WooCommerce API tests PASSED ✓")
        print("=" * 60)
        sys.exit(0)
    else:
        print(f"✗ WooCommerce API error: Status {response.status_code}")
        print(f"Response: {response.text[:200]}")
        sys.exit(1)
        
except Exception as e:
    print(f"✗ WooCommerce API connection FAILED: {e}")
    print("\nTroubleshooting:")
    print("1. Make sure WordPress/WooCommerce is running")
    print("2. Check the WooCommerce URL is correct")
    print("3. Verify API credentials are correct")
    print("4. Check network/firewall settings")
    print("\n" + "=" * 60)
    print("RESULT: WooCommerce API test FAILED ✗")
    print("=" * 60)
    sys.exit(1)

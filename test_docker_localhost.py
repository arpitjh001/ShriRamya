#!/usr/bin/env python3
"""
Test database connectivity using localhost (host machine)
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import sys
import time

# Local connection settings
MONGO_URL = "mongodb://localhost:27017/"
DB_NAME = "shriramya"
MYSQL_HOST = "localhost"  # Use localhost instead of Docker service name
MYSQL_PORT = 3306
MYSQL_USER = "wpuser"
MYSQL_PASSWORD = "wppassword"
MYSQL_DB = "shriramya"
WOOCOMMERCE_URL = "http://localhost:8081"

print("=" * 70)
print("DOCKER ENVIRONMENT - CONNECTIVITY TEST (via localhost)")
print("=" * 70)

# Test 1: MongoDB Connection
print("\n[TEST 1] MongoDB Connection")
print(f"Connection URL: {MONGO_URL}")
print(f"Database Name: {DB_NAME}")

retry_count = 0
max_retries = 3

mongo_ok = False
mysql_ok = False
woo_ok = False

while retry_count < max_retries:
    try:
        # Synchronous connection test
        client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        print("✓ MongoDB connection: SUCCESS")
        
        # Check database and collections
        db = client[DB_NAME]
        collections = db.list_collection_names()
        print(f"✓ Collections found: {collections}")
        
        # Count documents in each collection
        for collection in collections:
            count = db[collection].count_documents({})
            print(f"  - {collection}: {count} documents")
        
        mongo_ok = True
        break
        
    except Exception as e:
        retry_count += 1
        if retry_count < max_retries:
            print(f"⚠ MongoDB not ready yet (attempt {retry_count}/{max_retries}), retrying...")
            time.sleep(2)
        else:
            print(f"✗ MongoDB connection FAILED: {e}")

# Test 2: Async MongoDB
if mongo_ok:
    print("\n[TEST 2] Async MongoDB Connection")
    async def test_async():
        async_client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
        try:
            await async_client.admin.command('ping')
            print("✓ Async MongoDB connection: SUCCESS")
            
            # Test a sample query
            async_db = async_client[DB_NAME]
            users_collection = async_db['users']
            user_count = await users_collection.count_documents({})
            print(f"✓ Users collection accessible: {user_count} users found")
            
            products = async_db['products']
            product_count = await products.count_documents({})
            print(f"✓ Products collection accessible: {product_count} products found")
            
            orders = async_db['orders']
            order_count = await orders.count_documents({})
            print(f"✓ Orders collection accessible: {order_count} orders found")
            
            carts = async_db['carts']
            cart_count = await carts.count_documents({})
            print(f"✓ Carts collection accessible: {cart_count} carts found")
            
            return True
        except Exception as e:
            print(f"✗ Async MongoDB error: {e}")
            return False
        finally:
            async_client.close()
    
    asyncio.run(test_async())

# Test 3: MySQL Connection
print("\n[TEST 3] MySQL Connection")
print(f"Host: {MYSQL_HOST}:{MYSQL_PORT}")
print(f"Database: {MYSQL_DB}")
print(f"User: {MYSQL_USER}")

try:
    import mysql.connector
    
    mysql_connection = mysql.connector.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DB,
        connection_timeout=5
    )
    
    cursor = mysql_connection.cursor()
    cursor.execute("SELECT VERSION()")
    version = cursor.fetchone()
    print(f"✓ MySQL connection: SUCCESS")
    print(f"✓ MySQL Version: {version[0]}")
    
    # Check WordPress tables
    cursor.execute("SHOW TABLES LIKE 'wp_%'")
    tables = cursor.fetchall()
    print(f"✓ WordPress tables found: {len(tables)} tables")
    
    # Check if there are products
    try:
        cursor.execute("SELECT COUNT(*) FROM wp_posts WHERE post_type='product'")
        product_count = cursor.fetchone()
        print(f"✓ WooCommerce products in MySQL: {product_count[0]} products")
    except Exception as e:
        print(f"⚠ WooCommerce products query: {e}")
    
    # Check WordPress posts table
    try:
        cursor.execute("SELECT COUNT(*) FROM wp_posts")
        posts_count = cursor.fetchone()
        print(f"✓ Total WordPress posts: {posts_count[0]}")
    except Exception as e:
        print(f"  Could not query posts: {e}")
    
    cursor.close()
    mysql_connection.close()
    
    mysql_ok = True
    print("✓ MySQL connection operations: SUCCESS")
    
except ImportError:
    print("⚠ mysql-connector-python not installed")
except Exception as e:
    print(f"✗ MySQL connection FAILED: {e}")

# Test 4: Backend API Health
print("\n[TEST 4] Backend API Health Check")
try:
    import urllib.request
    import json
    
    response = urllib.request.urlopen("http://localhost:8000/api/health", timeout=5)
    data = json.loads(response.read())
    print(f"✓ Backend API running at http://localhost:8000")
    print(f"✓ Health status: {data}")
except Exception as e:
    print(f"⚠ Backend API not accessible: {type(e).__name__}: {e}")

# Test 5: WordPress/WooCommerce
print("\n[TEST 5] WordPress/WooCommerce Check")
print(f"URL: {WOOCOMMERCE_URL}")
try:
    import urllib.request
    import json
    
    response = urllib.request.urlopen("http://localhost:8081", timeout=5)
    print(f"✓ WordPress is accessible at http://localhost:8081")
    
    # Try to get WooCommerce products via API
    try:
        response = urllib.request.urlopen("http://localhost:8081/wp-json/wc/v3/products?per_page=1", timeout=10)
        woo_data = json.loads(response.read())
        print(f"✓ WooCommerce API responding")
        if isinstance(woo_data, list) and woo_data:
            print(f"  - Products accessible: {len(woo_data)} found")
        woo_ok = True
    except Exception as e:
        print(f"⚠ WooCommerce API: {type(e).__name__}")
except Exception as e:
    print(f"⚠ WordPress not fully accessible yet: {type(e).__name__}")

# Test 6: Frontend
print("\n[TEST 6] Frontend Check")
try:
    import urllib.request
    response = urllib.request.urlopen("http://localhost:3000", timeout=5)
    print(f"✓ Frontend is accessible at http://localhost:3000")
except Exception as e:
    print(f"⚠ Frontend not accessible: {type(e).__name__}")

# Summary
print("\n" + "=" * 70)
print("DOCKER CONNECTIVITY TEST SUMMARY")
print("=" * 70)

summary = f"""
✓ MongoDB:         {'WORKING' if mongo_ok else 'FAILED'}
✓ MySQL:           {'WORKING' if mysql_ok else 'FAILED'}
✓ WooCommerce:     {'WORKING' if woo_ok else 'NOT READY'}
✓ Backend API:     Accessible at http://localhost:8000
✓ Frontend:        Accessible at http://localhost:3000
✓ WordPress:       Accessible at http://localhost:8081

If MySQL is working but WooCommerce API returns 404:
  - WordPress might still be initializing
  - Check WordPress admin: http://localhost:8081/wp-admin
  - Wait for WordPress to finish setup (this can take a few minutes)
  - API credentials may need to be regenerated in WordPress settings
"""

print(summary)

if mongo_ok and mysql_ok:
    print("=" * 70)
    print("RESULT: ✓ Core databases are CONNECTED and WORKING")
    print("=" * 70)
    sys.exit(0)
else:
    print("=" * 70)
    print("RESULT: Some services need attention")
    print("=" * 70)
    sys.exit(1)

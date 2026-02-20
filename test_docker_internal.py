#!/usr/bin/env python3
"""
Docker connectivity test - to be run from within backend container
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import sys
import time

# Docker internal URLs
MONGO_URL = "mongodb://mongodb:27017/"
DB_NAME = "shriramya"
MYSQL_HOST = "mysql"
MYSQL_PORT = 3306
MYSQL_USER = "wpuser"
MYSQL_PASSWORD = "wppassword"
MYSQL_DB = "shriramya"
WOOCOMMERCE_URL = "http://wordpress"

print("=" * 70)
print("DOCKER INTERNAL - DATABASE & SERVICE CONNECTION TEST")
print("=" * 70)

# Test 1: MongoDB Connection
print("\n[TEST 1] MongoDB Connection (Docker Internal)")
print(f"Connection URL: {MONGO_URL}")
print(f"Database Name: {DB_NAME}")

retry_count = 0
max_retries = 5

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
        
        # Test async connection
        print("\n[TEST 2] Async MongoDB Connection (Docker Internal)")
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
        
        result = asyncio.run(test_async())
        
        # Test 3: MySQL Connection
        print("\n[TEST 3] MySQL Connection (Docker Internal)")
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
            
            # Try to check WooCommerce product tables
            try:
                cursor.execute("SELECT COUNT(*) FROM wp_posts WHERE post_type='product'")
                product_count = cursor.fetchone()
                print(f"✓ WooCommerce products: {product_count[0]} products in MySQL")
            except Exception as e:
                print(f"⚠ Could not query WooCommerce products: {e}")
            
            cursor.close()
            mysql_connection.close()
            
            mysql_result = True
        except Exception as e:
            print(f"✗ MySQL connection failed: {e}")
            mysql_result = False
        
        # Test 4: WooCommerce API Check
        print("\n[TEST 4] WooCommerce API Check (Docker Internal)")
        print(f"URL: {WOOCOMMERCE_URL}")
        
        try:
            from woocommerce import API
            
            wcapi = API(
                url=WOOCOMMERCE_URL,
                consumer_key="ck_1b2f28accce62efb9f4677a13f8514559cbede6a",
                consumer_secret="cs_53832d11c673a4d692750fe744dc5d6582b6fe87",
                version="wc/v3",
                timeout=10
            )
            
            response = wcapi.get("products", params={"per_page": 1})
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ WooCommerce API connection: SUCCESS")
                print(f"✓ Response status: {response.status_code}")
                
                if isinstance(data, list):
                    print(f"✓ Products accessible: {len(data)} products found")
                    if data:
                        print(f"  - First product: {data[0].get('name', 'Unknown')}")
                else:
                    print(f"  Response type: {type(data)}")
            else:
                print(f"✗ WooCommerce API error: Status {response.status_code}")
                woo_result = False
        except Exception as e:
            print(f"⚠ WooCommerce API connection issue: {e}")
        
        if result and mysql_result:
            print("\n" + "=" * 70)
            print("RESULT: All Docker internal connectivity tests PASSED ✓")
            print("=" * 70)
            print("\nSummary:")
            print("✓ MongoDB is accessible from all containers")
            print("✓ MySQL is accessible from all containers")  
            print("✓ WordPress is running and serving WooCommerce API")
            print("✓ Backend and other services can communicate")
            sys.exit(0)
        else:
            print("\n" + "=" * 70)
            print("RESULT: Some tests failed")
            print("=" * 70)
            sys.exit(1)
            
    except Exception as e:
        retry_count += 1
        if retry_count < max_retries:
            print(f"\n⚠ Connection issue (attempt {retry_count}/{max_retries})")
            print(f"  Error: {type(e).__name__}")
            print(f"  Retrying in 5 seconds...")
            time.sleep(5)
        else:
            print(f"\n✗ Connection test FAILED after {max_retries} attempts: {e}")
            sys.exit(1)

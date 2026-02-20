#!/usr/bin/env python3
"""
Test database connectivity within Docker environment
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import sys
import time

# Load environment variables
load_dotenv("backend/.env")

# Docker service URLs
MONGO_URL = "mongodb://mongodb:27017/"
DB_NAME = "shriramya"
MYSQL_HOST = "mysql"
MYSQL_PORT = 3306
MYSQL_USER = "wpuser"
MYSQL_PASSWORD = "wppassword"
MYSQL_DB = "shriramya"

print("=" * 70)
print("DOCKER ENVIRONMENT - DATABASE CONNECTION TEST")
print("=" * 70)

# Test 1: MongoDB Connection from Backend Container
print("\n[TEST 1] MongoDB Connection (Docker)")
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
        print("\n[TEST 2] Async MongoDB Connection (Docker)")
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
        print("\n[TEST 3] MySQL Connection (Docker)")
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
            
            # Check WooCommerce product tables
            cursor.execute("SELECT COUNT(*) FROM wp_posts WHERE post_type='product'")
            product_count = cursor.fetchone()
            print(f"✓ WooCommerce products: {product_count[0]} products in MySQL")
            
            cursor.close()
            mysql_connection.close()
            
            mysql_result = True
        except ImportError:
            print("⚠ mysql-connector-python not installed, installing now...")
            import subprocess
            subprocess.run([sys.executable, "-m", "pip", "install", "mysql-connector-python", "-q"])
            print("  Retrying MySQL connection...")
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
            
            cursor.execute("SHOW TABLES LIKE 'wp_%'")
            tables = cursor.fetchall()
            print(f"✓ WordPress tables found: {len(tables)} tables")
            
            cursor.execute("SELECT COUNT(*) FROM wp_posts WHERE post_type='product'")
            product_count = cursor.fetchone()
            print(f"✓ WooCommerce products: {product_count[0]} products in MySQL")
            
            cursor.close()
            mysql_connection.close()
            
            mysql_result = True
        except Exception as e:
            print(f"✗ MySQL connection failed: {e}")
            mysql_result = False
        
        # Test 4: Backend API Health Check
        print("\n[TEST 4] Backend API Health Check (Docker)")
        try:
            import urllib.request
            import json
            
            response = urllib.request.urlopen("http://localhost:8000/api/health", timeout=5)
            data = json.loads(response.read())
            print(f"✓ Backend API is running")
            print(f"✓ Health status: {data}")
        except Exception as e:
            print(f"⚠ Backend API not accessible yet: {e}")
        
        # Test 5: WordPress/WooCommerce Check
        print("\n[TEST 5] WordPress/WooCommerce Check (Docker)")
        try:
            import urllib.request
            
            response = urllib.request.urlopen("http://localhost:8081/wp-json/wc/v3/products?per_page=1", timeout=10)
            woo_data = response.read()
            print(f"✓ WordPress is accessible at http://localhost:8081")
            print(f"✓ WooCommerce API responding")
        except Exception as e:
            print(f"⚠ WordPress/WooCommerce not fully ready yet: {type(e).__name__}")
        
        if result and mysql_result:
            print("\n" + "=" * 70)
            print("RESULT: All Docker database tests PASSED ✓")
            print("=" * 70)
            sys.exit(0)
        else:
            print("\n" + "=" * 70)
            print("RESULT: Some tests failed")
            print("=" * 70)
            sys.exit(1)
            
    except Exception as e:
        retry_count += 1
        if retry_count < max_retries:
            print(f"\n⚠ MongoDB not ready yet (attempt {retry_count}/{max_retries})")
            print(f"  Error: {type(e).__name__}")
            print(f"  Retrying in 5 seconds...")
            time.sleep(5)
        else:
            print(f"\n✗ MongoDB connection FAILED after {max_retries} attempts: {e}")
            print("\nTroubleshooting:")
            print("1. Check if Docker containers are running: docker ps")
            print("2. Check container logs: docker compose logs mongodb")
            print("3. Verify network connectivity between containers")
            print("\n" + "=" * 70)
            print("RESULT: Database connection test FAILED ✗")
            print("=" * 70)
            sys.exit(1)

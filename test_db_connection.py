#!/usr/bin/env python3
"""
Test database connectivity for the ShriRamya application
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import sys

# Load environment variables
load_dotenv("backend/.env")

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "shriramya")

print("=" * 60)
print("DATABASE CONNECTION TEST")
print("=" * 60)

# Test 1: MongoDB Connection
print("\n[TEST 1] MongoDB Connection Test")
print(f"Connection URL: {MONGO_URL}")
print(f"Database Name: {DB_NAME}")

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
    print("\n[TEST 2] Async MongoDB Connection Test")
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
    
    if result:
        print("\n" + "=" * 60)
        print("RESULT: All database tests PASSED ✓")
        print("=" * 60)
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("RESULT: Async tests failed ✗")
        print("=" * 60)
        sys.exit(1)
        
except Exception as e:
    print(f"✗ MongoDB connection FAILED: {e}")
    print("\nTroubleshooting:")
    print("1. Make sure MongoDB is running")
    print("2. Check if the connection URL is correct")
    print("3. Verify firewall/network settings")
    print("\n" + "=" * 60)
    print("RESULT: Database connection test FAILED ✗")
    print("=" * 60)
    sys.exit(1)

#!/usr/bin/env python
"""Test cart API endpoints"""
import requests
import json

BASE_URL = "http://localhost:8001/api"
SESSION_ID = "test_session_123"

def test_get_cart():
    """Test GET /cart"""
    print("\n=== Testing GET /cart ===")
    response = requests.get(f"{BASE_URL}/cart", params={"session_id": SESSION_ID})
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.json()

def test_add_to_cart():
    """Test POST /cart"""
    print("\n=== Testing POST /cart ===")
    payload = {
        "product_id": "123",
        "quantity": 2,
        "variation": None
    }
    response = requests.post(f"{BASE_URL}/cart", json=payload, params={"session_id": SESSION_ID})
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.json()

def test_remove_from_cart():
    """Test DELETE /cart/item/{product_id}"""
    print("\n=== Testing DELETE /cart/item/123 ===")
    response = requests.delete(f"{BASE_URL}/cart/item/123", params={"session_id": SESSION_ID})
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.json()

def test_clear_cart():
    """Test DELETE /cart"""
    print("\n=== Testing DELETE /cart ===")
    response = requests.delete(f"{BASE_URL}/cart", params={"session_id": SESSION_ID})
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.json()

if __name__ == "__main__":
    try:
        test_get_cart()
        test_add_to_cart()
        test_get_cart()
        test_remove_from_cart()
        test_clear_cart()
        print("\n✅ All tests completed!")
    except Exception as e:
        print(f"\n❌ Error: {e}")

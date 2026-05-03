#!/usr/bin/env python3
"""Comprehensive Backend API Test Suite for ShriRamya E-Commerce"""
import requests
import json
import sys
import time

API_URL = "https://ecommerce-audit-6.preview.emergentagent.com/api/v1"
RESULTS = {"passed": 0, "failed": 0, "errors": []}

def test(name, method, path, expected_status=200, data=None, headers=None, check_fn=None):
    """Run a single API test"""
    url = f"{API_URL}{path}"
    hdrs = {"Content-Type": "application/json"}
    if headers:
        hdrs.update(headers)
    try:
        if method == "GET":
            r = requests.get(url, headers=hdrs, timeout=15)
        elif method == "POST":
            r = requests.post(url, json=data, headers=hdrs, timeout=15)
        elif method == "PUT":
            r = requests.put(url, json=data, headers=hdrs, timeout=15)
        elif method == "PATCH":
            r = requests.patch(url, json=data, headers=hdrs, timeout=15)
        elif method == "DELETE":
            r = requests.delete(url, headers=hdrs, timeout=15)
        
        status_ok = r.status_code == expected_status
        body = r.json() if r.headers.get("content-type","").startswith("application/json") else {}
        check_ok = True
        check_msg = ""
        if check_fn and status_ok:
            try:
                check_ok, check_msg = check_fn(body)
            except Exception as e:
                check_ok = False
                check_msg = str(e)
        
        if status_ok and check_ok:
            RESULTS["passed"] += 1
            print(f"  PASS  {name} [{r.status_code}]")
        else:
            RESULTS["failed"] += 1
            err = f"FAIL  {name} [got {r.status_code}, expected {expected_status}]"
            if not check_ok:
                err += f" - {check_msg}"
            RESULTS["errors"].append(err)
            print(f"  {err}")
            if not status_ok:
                print(f"        Body: {r.text[:200]}")
    except Exception as e:
        RESULTS["failed"] += 1
        err = f"ERROR  {name}: {str(e)}"
        RESULTS["errors"].append(err)
        print(f"  {err}")

# ==========================================
# 1. AUTHENTICATION
# ==========================================
print("\n=== AUTHENTICATION ===")
admin_token = None
customer_token = None
customer_id = None

def save_admin_token(body):
    global admin_token
    admin_token = body.get("data", {}).get("token")
    role = body.get("data", {}).get("user", {}).get("role")
    return bool(admin_token) and role == "admin", f"token={bool(admin_token)}, role={role}"

def save_customer_token(body):
    global customer_token, customer_id
    customer_token = body.get("data", {}).get("token")
    customer_id = body.get("data", {}).get("user", {}).get("userId") or body.get("data", {}).get("user", {}).get("id")
    return bool(customer_token) and bool(customer_id), f"token={bool(customer_token)}, id={customer_id}"

test("Admin Login", "POST", "/auth/login",
     data={"email": "admin@shriramya.com", "password": "Admin@123"},
     check_fn=save_admin_token)

test("Customer Login", "POST", "/auth/login",
     data={"email": "customer@test.com", "password": "Test@123"},
     check_fn=save_customer_token)

test("Invalid Login", "POST", "/auth/login", expected_status=401,
     data={"email": "admin@shriramya.com", "password": "wrong"})

test("Register New User", "POST", "/auth/register", expected_status=201,
     data={"name": "New User", "email": f"newuser_{int(time.time())}@test.com", "password": "Test@123", "phone": "9876543210"})

test("Register Duplicate Email", "POST", "/auth/register", expected_status=400,
     data={"name": "Dup", "email": "admin@shriramya.com", "password": "Test@123"})

test("Check Admin Capabilities", "GET", "/auth/check-admin",
     check_fn=lambda b: (b.get("data", {}).get("capabilities", {}).get("edit_posts") == True, ""))

test("Refresh Token", "POST", "/auth/refresh-token",
     check_fn=lambda b: (bool(b.get("data", {}).get("token")), ""))

# ==========================================
# 2. PRODUCTS
# ==========================================
print("\n=== PRODUCTS ===")

test("Get All Products", "GET", "/products?limit=5",
     check_fn=lambda b: (len(b["data"]["products"]) == 5 and b["data"]["pagination"]["total"] == 50, 
                          f"count={len(b['data']['products'])}, total={b['data']['pagination']['total']}"))

test("Products Pagination (page 2)", "GET", "/products?page=2&limit=10",
     check_fn=lambda b: (b["data"]["pagination"]["current_page"] == 2, f"page={b['data']['pagination']['current_page']}"))

test("Products Sort by Price Asc", "GET", "/products?sort=price_asc&limit=5",
     check_fn=lambda b: (b["data"]["products"][0]["salePrice"] <= b["data"]["products"][-1]["salePrice"], "not sorted"))

test("Products Sort by Price Desc", "GET", "/products?sort=price_desc&limit=5",
     check_fn=lambda b: (b["data"]["products"][0]["salePrice"] >= b["data"]["products"][-1]["salePrice"], "not sorted"))

test("Products Filter by Category", "GET", "/products?category=silk-sarees",
     check_fn=lambda b: (all(p.get("categorySlug") == "silk-sarees" for p in b["data"]["products"]), "wrong category"))

test("Products Filter Featured", "GET", "/products?featured=true&limit=10",
     check_fn=lambda b: (len(b["data"]["products"]) > 0, f"count={len(b['data']['products'])}"))

test("Products Most Desired", "GET", "/products?category=most-desired&limit=4",
     check_fn=lambda b: (len(b["data"]["products"]) == 4, f"count={len(b['data']['products'])}"))

test("Products Filter by Price Range", "GET", "/products?minPrice=1000&maxPrice=5000",
     check_fn=lambda b: (all(1000 <= p["salePrice"] <= 5000 for p in b["data"]["products"]), "price out of range"))

test("Filter Metadata Present", "GET", "/products?limit=1",
     check_fn=lambda b: ("filterMetadata" in b["data"] and "fabrics" in b["data"]["filterMetadata"], "no filterMetadata"))

test("Get Featured Products", "GET", "/products/featured",
     check_fn=lambda b: (len(b["data"]) > 0, f"count={len(b['data'])}"))

test("Get Trending Products", "GET", "/products/trending",
     check_fn=lambda b: (len(b["data"]) > 0, f"count={len(b['data'])}"))

test("Get New Arrivals", "GET", "/products/new-arrivals",
     check_fn=lambda b: (len(b["data"]) > 0, f"count={len(b['data'])}"))

test("Get Product By ID (1)", "GET", "/products/1",
     check_fn=lambda b: (b["data"]["name"] != "" and b["data"]["id"] == 1, f"name={b['data'].get('name')}"))

test("Product Detail Has Related Products", "GET", "/products/1",
     check_fn=lambda b: ("relatedProducts" in b["data"], "no relatedProducts"))

test("Get Product 404", "GET", "/products/99999", expected_status=404)

# ==========================================
# 3. CATEGORIES
# ==========================================
print("\n=== CATEGORIES ===")

test("Get All Categories", "GET", "/categories",
     check_fn=lambda b: (len(b["data"]) > 0, f"count={len(b['data'])}"))

test("Get Category by Slug", "GET", "/categories/silk-sarees",
     check_fn=lambda b: (len(b["data"].get("products", [])) > 0, f"products={len(b['data'].get('products',[]))}"))

test("Category 404", "GET", "/categories/nonexistent-cat", expected_status=404)

# ==========================================
# 4. SEARCH
# ==========================================
print("\n=== SEARCH ===")

test("Search Products", "GET", "/search?q=silk",
     check_fn=lambda b: (len(b["data"]["products"]) > 0, f"count={len(b['data']['products'])}"))

test("Search Empty Query", "GET", "/search?q=",
     check_fn=lambda b: (len(b["data"]["products"]) == 0, "should be empty"))

test("Search No Results", "GET", "/search?q=xyznonexistent",
     check_fn=lambda b: (len(b["data"]["products"]) == 0, "should be empty"))

# ==========================================
# 5. CART
# ==========================================
print("\n=== CART ===")
SESSION_ID = f"test_session_{int(time.time())}"
cart_headers = {"x-session-id": SESSION_ID}

test("Get Empty Cart", "GET", f"/cart?sessionId={SESSION_ID}",
     check_fn=lambda b: (b["data"]["itemCount"] == 0, f"items={b['data']['itemCount']}"))

test("Add to Cart (Product 1)", "POST", "/cart/add",
     data={"productId": 1, "quantity": 2, "size": "Free Size"},
     headers=cart_headers,
     check_fn=lambda b: (b["data"]["itemCount"] == 2, f"items={b['data']['itemCount']}"))

test("Add to Cart (Product 2)", "POST", "/cart/add",
     data={"productId": 2, "quantity": 1},
     headers=cart_headers,
     check_fn=lambda b: (b["data"]["itemCount"] == 3, f"items={b['data']['itemCount']}"))

test("Get Cart with Items", "GET", f"/cart?sessionId={SESSION_ID}",
     headers=cart_headers,
     check_fn=lambda b: (len(b["data"]["items"]) == 2 and b["data"]["subtotal"] > 0, 
                          f"items={len(b['data']['items'])}, subtotal={b['data']['subtotal']}"))

test("Update Cart Quantity", "PUT", "/cart/update",
     data={"productId": 1, "quantity": 5},
     headers=cart_headers)

test("Remove from Cart", "DELETE", "/cart/remove/2",
     headers=cart_headers)

test("Cart After Remove", "GET", f"/cart?sessionId={SESSION_ID}",
     headers=cart_headers,
     check_fn=lambda b: (len(b["data"]["items"]) == 1, f"items={len(b['data']['items'])}"))

test("Clear Cart", "DELETE", "/cart/clear",
     headers=cart_headers)

test("Cart After Clear", "GET", f"/cart?sessionId={SESSION_ID}",
     headers=cart_headers,
     check_fn=lambda b: (b["data"]["itemCount"] == 0, f"items={b['data']['itemCount']}"))

# ==========================================
# 6. COUPONS
# ==========================================
print("\n=== COUPONS ===")

test("Validate Coupon WELCOME10", "POST", "/coupons/validate",
     data={"code": "WELCOME10", "cartTotal": 5000},
     check_fn=lambda b: (b["data"]["discount"] == 500, f"discount={b['data']['discount']}"))

test("Invalid Coupon", "POST", "/coupons/validate", expected_status=404,
     data={"code": "FAKECODE", "cartTotal": 5000})

test("Coupon Below Minimum", "POST", "/coupons/validate", expected_status=400,
     data={"code": "SILK20", "cartTotal": 100})

# ==========================================
# 7. ORDERS
# ==========================================
print("\n=== ORDERS ===")
order_id = None

def save_order_id(body):
    global order_id
    order_id = body.get("data", {}).get("orderId")
    has_razorpay = bool(body.get("data", {}).get("razorpayOrderId"))
    return bool(order_id) and has_razorpay, f"orderId={order_id}, razorpay={has_razorpay}"

test("Create Order", "POST", "/orders", expected_status=201,
     data={
         "items": [{"productId": 1, "quantity": 2}, {"productId": 3, "quantity": 1}],
         "shippingAddress": {"name": "Test User", "phone": "9876543210", "street": "MG Road", "city": "Jaipur", "state": "Rajasthan", "pincode": "302001"},
         "userId": customer_id or "customer_001",
         "email": "customer@test.com"
     },
     check_fn=save_order_id)

if order_id:
    test("Get Order by ID", "GET", f"/orders/{order_id}",
         check_fn=lambda b: (b["data"]["orderId"] == order_id and b["data"]["status"] == "pending", f"status={b['data']['status']}"))

    test("Verify Payment", "POST", f"/orders/{order_id}/payment",
         data={"razorpay_payment_id": "pay_test_123", "razorpay_order_id": "order_test_123"},
         check_fn=lambda b: (b["data"]["status"] == "confirmed", f"status={b['data']['status']}"))

    test("Get Order After Payment", "GET", f"/orders/{order_id}",
         check_fn=lambda b: (b["data"]["paymentStatus"] == "paid", f"paymentStatus={b['data']['paymentStatus']}"))

    test("Update Order Status to Shipped", "PUT", f"/orders/{order_id}/status",
         data={"status": "shipped", "trackingNumber": "TRACK123456", "note": "Shipped via courier"})

    test("Get Order Tracking", "GET", f"/orders/{order_id}/tracking",
         check_fn=lambda b: (b["data"].get("trackingNumber") == "TRACK123456", f"tracking={b['data'].get('trackingNumber')}"))

test("List All Orders", "GET", "/orders",
     check_fn=lambda b: (len(b["data"]["orders"]) > 0, f"count={len(b['data']['orders'])}"))

test("My Orders", "GET", "/orders/my",
     headers={"x-user-id": customer_id or "customer_001"},
     check_fn=lambda b: (isinstance(b["data"]["orders"], list), "not a list"))

# Create another order to test cancel
test("Create Order for Cancel", "POST", "/orders", expected_status=201,
     data={
         "items": [{"productId": 5, "quantity": 1}],
         "shippingAddress": {"name": "Cancel Test", "phone": "123", "city": "Delhi"},
         "userId": customer_id or "customer_001"
     })

cancel_order_id = None
def save_cancel_id(body):
    global cancel_order_id
    cancel_order_id = body.get("data", {}).get("orderId")
    return bool(cancel_order_id), ""

test("Create Order for Cancel Test", "POST", "/orders", expected_status=201,
     data={
         "items": [{"productId": 6, "quantity": 1}],
         "shippingAddress": {"name": "Cancel", "phone": "123", "city": "Mumbai"},
         "userId": customer_id or "customer_001"
     },
     check_fn=save_cancel_id)

if cancel_order_id:
    test("Cancel Order", "PUT", f"/orders/{cancel_order_id}/cancel",
         data={"reason": "Changed my mind"},
         check_fn=lambda b: (b["data"]["status"] == "cancelled", f"status={b['data']['status']}"))

    test("Cancel Order (frontend alias)", "POST", f"/orders/my/{cancel_order_id}/cancel",
         check_fn=lambda b: (b["data"]["status"] == "cancelled", ""))

# ==========================================
# 8. WISHLIST
# ==========================================
print("\n=== WISHLIST ===")
wish_headers = {"x-user-id": customer_id or "customer_001"}

test("Add to Wishlist (Product 3)", "POST", "/wishlist/add",
     data={"productId": 3, "userId": customer_id or "customer_001"},
     headers=wish_headers, expected_status=201)

test("Add to Wishlist (Product 5, alias)", "POST", "/wishlist/5",
     headers=wish_headers, expected_status=201)

test("Get Wishlist", "GET", f"/wishlist?userId={customer_id or 'customer_001'}",
     check_fn=lambda b: (len(b["data"]) >= 2, f"count={len(b['data'])}"))

test("Check Wishlist (Product 3)", "GET", f"/wishlist/check/3?userId={customer_id or 'customer_001'}",
     check_fn=lambda b: (b["data"]["inWishlist"] == True, "not in wishlist"))

test("Check Wishlist (Product 99)", "GET", f"/wishlist/check/99?userId={customer_id or 'customer_001'}",
     check_fn=lambda b: (b["data"]["inWishlist"] == False, "should not be in wishlist"))

test("Remove from Wishlist", "DELETE", f"/wishlist/remove/3?userId={customer_id or 'customer_001'}")

test("Remove from Wishlist (alias)", "DELETE", f"/wishlist/5?userId={customer_id or 'customer_001'}")

test("Wishlist After Remove", "GET", f"/wishlist?userId={customer_id or 'customer_001'}",
     check_fn=lambda b: (len(b["data"]) == 0 or all(w["productId"] not in [3,5] for w in b["data"]), "not removed"))

# ==========================================
# 9. BLOGS
# ==========================================
print("\n=== BLOGS ===")

test("Get All Blogs", "GET", "/blogs",
     check_fn=lambda b: (len(b["data"]["posts"]) >= 3, f"count={len(b['data']['posts'])}"))

test("Blog Categories", "GET", "/blogs/categories",
     check_fn=lambda b: (len(b["data"]) > 0, f"count={len(b['data'])}"))

test("Blog Stats", "GET", "/blogs/stats",
     check_fn=lambda b: (b["data"]["total_posts"] >= 3, f"total={b['data']['total_posts']}"))

test("Get Blog by Slug", "GET", "/blogs/art-of-sanganeri-printing",
     check_fn=lambda b: (b["data"]["title"] == "The Art of Sanganeri Printing", f"title={b['data']['title']}"))

new_blog_slug = f"test-blog-{int(time.time())}"
test("Create Blog", "POST", "/blogs", expected_status=201,
     data={"title": "Test Blog Post", "slug": new_blog_slug, "content": "<p>Test content</p>", "excerpt": "Test", "status": "draft", "tags": ["test"], "categories": ["Style Guide"]},
     check_fn=lambda b: (b["success"] == True, ""))

test("Update Blog", "PUT", f"/blogs/{new_blog_slug}",
     data={"title": "Updated Test Blog", "status": "published"},
     check_fn=lambda b: (b["success"] == True, ""))

test("Delete Blog", "DELETE", f"/blogs/{new_blog_slug}")

test("Blog 404 After Delete", "GET", f"/blogs/{new_blog_slug}", expected_status=404)

# ==========================================
# 10. USER PROFILE
# ==========================================
print("\n=== USER PROFILE ===")

test("Get Customer Profile", "GET", f"/users/profile?userId={customer_id or 'customer_001'}",
     check_fn=lambda b: (b["data"]["name"] == "Test Customer" and b["data"].get("address",{}).get("city") == "Jaipur",
                          f"name={b['data']['name']}, city={b['data'].get('address',{}).get('city')}"))

test("Update Profile", "PUT", "/users/profile",
     data={"userId": customer_id, "name": "Updated Customer", "phone": "+91-1234567890", 
           "address": {"street": "456 Park Ave", "city": "Mumbai", "state": "Maharashtra", "pincode": "400001"}})

test("Verify Profile Update", "GET", f"/users/profile?userId={customer_id}",
     check_fn=lambda b: (b["data"]["name"] == "Updated Customer" and b["data"]["address"]["city"] == "Mumbai",
                          f"name={b['data']['name']}, city={b['data'].get('address',{}).get('city')}"))

# Restore original
test("Restore Profile", "PUT", "/users/profile",
     data={"userId": customer_id, "name": "Test Customer", "phone": "+91-9876543211",
           "address": {"street": "123 MG Road", "city": "Jaipur", "state": "Rajasthan", "pincode": "302001"}})

# ==========================================
# 11. ADMIN ENDPOINTS
# ==========================================
print("\n=== ADMIN ENDPOINTS ===")

test("Admin Analytics Overview", "GET", "/admin/analytics/overview",
     check_fn=lambda b: ("total_revenue" in b["data"] and "total_orders" in b["data"], f"keys={list(b['data'].keys())}"))

test("Admin Analytics Revenue", "GET", "/admin/analytics/revenue",
     check_fn=lambda b: ("chart" in b["data"], "no chart"))

test("Admin Analytics Sales", "GET", "/admin/analytics/sales",
     check_fn=lambda b: ("top_products" in b["data"], "no top_products"))

test("Admin Analytics Products", "GET", "/admin/analytics/products",
     check_fn=lambda b: (b["data"]["total"] == 50, f"total={b['data']['total']}"))

test("Admin Warehouses", "GET", "/admin/warehouses",
     check_fn=lambda b: (len(b["data"]) == 2, f"count={len(b['data'])}"))

test("Admin Low Stock", "GET", "/admin/inventory/low-stock")

test("Admin Users", "GET", "/admin/users",
     check_fn=lambda b: (len(b["data"]) >= 2, f"count={len(b['data'])}"))

test("Admin Blog Stats", "GET", "/admin/blogs/stats",
     check_fn=lambda b: (b["data"]["total_posts"] >= 3, f"total={b['data']['total_posts']}"))

test("Admin Orders List", "GET", "/admin/orders",
     check_fn=lambda b: ("orders" in b["data"] and "stats" in b["data"], f"keys={list(b['data'].keys())}"))

test("Admin Orders Filter by Status", "GET", "/admin/orders?status=confirmed",
     check_fn=lambda b: (isinstance(b["data"]["orders"], list), "not list"))

test("Admin Orders Search", "GET", f"/admin/orders?search=ORD",
     check_fn=lambda b: (isinstance(b["data"]["orders"], list), "not list"))

if order_id:
    test("Admin Update Order Status", "PATCH", f"/admin/orders/{order_id}/status",
         data={"status": "delivered", "note": "Admin marked delivered"})

    test("Admin Get Order Detail", "GET", f"/admin/orders/{order_id}",
         check_fn=lambda b: (b["data"]["status"] == "delivered", f"status={b['data']['status']}"))

# ==========================================
# 12. MISC ENDPOINTS
# ==========================================
print("\n=== MISC ===")

test("Recommendations", "GET", "/recommendations",
     check_fn=lambda b: (len(b["data"]) > 0, f"count={len(b['data'])}"))

test("Product Reviews", "GET", "/reviews/product/1",
     check_fn=lambda b: (len(b["data"]["reviews"]) > 0, f"count={len(b['data']['reviews'])}"))

test("Submit Review", "POST", "/reviews", expected_status=201,
     data={"productId": 1, "rating": 5, "comment": "Amazing!"})

test("Shipments Stub", "GET", "/orders/admin/shipments")
test("Ready to Ship Stub", "GET", "/orders/admin/shipments/ready-to-ship")
test("Pending Shipments Stub", "GET", "/orders/admin/shipments/pending")

# ==========================================
# FINAL REPORT
# ==========================================
print("\n" + "="*60)
total = RESULTS["passed"] + RESULTS["failed"]
print(f"  TOTAL: {total}  |  PASSED: {RESULTS['passed']}  |  FAILED: {RESULTS['failed']}")
print(f"  PASS RATE: {RESULTS['passed']/total*100:.1f}%")
print("="*60)

if RESULTS["errors"]:
    print("\n  FAILURES:")
    for e in RESULTS["errors"]:
        print(f"    - {e}")

# Save report
report = {
    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
    "total": total,
    "passed": RESULTS["passed"],
    "failed": RESULTS["failed"],
    "pass_rate": f"{RESULTS['passed']/total*100:.1f}%",
    "errors": RESULTS["errors"]
}
with open("/app/test_reports/api_comprehensive_test.json", "w") as f:
    json.dump(report, f, indent=2)

sys.exit(0 if RESULTS["failed"] == 0 else 1)

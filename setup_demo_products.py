import requests
import json
import random

BASE_URL = "http://localhost:8002/api/v1"

def setup_demo_products():
    print("Setting up demo products...")
    
    # 1. Login
    login_data = {
        "email": "admin-user@example.com",
        "password": "AdminPassword123!"
    }
    print("Logging in...")
    resp = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if resp.status_code != 200:
        print(f"Login failed: {resp.status_code} - {resp.text}")
        return
    
    token = resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Login successful.")

    # 2. Get categories
    print("Fetching categories...")
    resp = requests.get(f"{BASE_URL}/products/categories", headers=headers)
    categories = resp.json().get("data", [])
    
    # Make a dictionary mapping names to IDs for easier access
    cat_map = {cat["name"].lower(): cat["id"] for cat in categories}
    
    # Get a fallback category ID just in case
    default_cat_id = categories[0]["id"] if categories else 1
    
    # 3. Define Demo Products
    # Using picsum.photos with .jpg extension to satisfy WooCommerce's image download requirements
    products = [
        {
            "name": "Royal Blue Silk Saree with Zari Border",
            "regular_price": 4500.0,
            "sale_price": 3999.0,
            "description": "Exquisite royal blue silk saree featuring a traditional zari border. Perfect for weddings and festive occasions. Comes with an unstitched blouse piece.",
            "short_description": "Premium silk saree with zari border.",
            "categories": [{"id": cat_map.get("sarees", default_cat_id)}],
            "images": [
                "https://picsum.photos/seed/saree1/800/1200.jpg",
                "https://picsum.photos/seed/saree2/800/1200.jpg"
            ],
            "stock_quantity": 25,
            "size_stock": [{"size": "Free Size", "qty": 25}],
            "color_stock": [{"color": "Royal Blue", "qty": 25}]
        },
        {
            "name": "Elegant Maroon Anarkali Suit",
            "regular_price": 5999.0,
            "description": "Floor-length anarkali suit in rich maroon hue, adorned with intricate embroidery and a complementary net dupatta.",
            "short_description": "Embroidered maroon anarkali suit.",
            "categories": [{"id": cat_map.get("salwar kameez", cat_map.get("suits", default_cat_id))}],
            "images": [
                "https://picsum.photos/seed/suit1/800/1200.jpg"
            ],
            "stock_quantity": 40,
            "size_stock": [{"size": "S", "qty": 10}, {"size": "M", "qty": 20}, {"size": "L", "qty": 10}],
            "color_stock": [{"color": "Maroon", "qty": 40}]
        },
        {
            "name": "Pastel Pink Designer Kurti set",
            "regular_price": 2499.0,
            "sale_price": 1999.0,
            "description": "A breezy pastel pink kurti paired with matching palazzo pants. Comfortable yet stylish for casual outings and small gatherings.",
            "short_description": "Cotton designer kurti set in pastel pink.",
            "categories": [{"id": cat_map.get("kurtis & tunics", cat_map.get("kurtis", default_cat_id))}],
            "images": [
                "https://picsum.photos/seed/kurti1/800/1200.jpg"
            ],
            "stock_quantity": 60,
            "size_stock": [{"size": "XS", "qty": 15}, {"size": "S", "qty": 25}, {"size": "M", "qty": 20}],
            "color_stock": [{"color": "Pastel Pink", "qty": 60}]
        },
        {
            "name": "Golden Handcrafted Bridal Lehenga",
            "regular_price": 35000.0,
            "description": "Make your special day unforgettable with this heavy golden bridal lehenga, completely handcrafted with zardosi and sequence work.",
            "short_description": "Heavy handcrafted bridal lehenga choli.",
            "categories": [{"id": cat_map.get("lehengas", default_cat_id)}],
            "images": [
                "https://picsum.photos/seed/lehenga1/800/1200.jpg",
                "https://picsum.photos/seed/lehenga2/800/1200.jpg"
            ],
            "stock_quantity": 5,
            "size_stock": [{"size": "Custom", "qty": 5}],
            "color_stock": [{"color": "Gold", "qty": 3}, {"color": "Red", "qty": 2}]
        },
        {
            "name": "Teal Georgette Party Wear Gown",
            "regular_price": 4200.0,
            "sale_price": 3499.0,
            "description": "Flowy georgette gown in captivating teal blue, structured with an embellished bodice and flared silhouette.",
            "short_description": "Embellished party wear gown in teal.",
            "categories": [{"id": cat_map.get("gowns", default_cat_id)}],
            "images": [
                "https://picsum.photos/seed/gown1/800/1200.jpg"
            ],
            "stock_quantity": 30,
            "size_stock": [{"size": "M", "qty": 15}, {"size": "L", "qty": 15}],
            "color_stock": [{"color": "Teal", "qty": 30}]
        }
    ]

    # 4. Create products
    print(f"Adding {len(products)} demo products...")
    for i, prod_data in enumerate(products, 1):
        print(f"[{i}/{len(products)}] Creating: {prod_data['name']}...")
        resp = requests.post(f"{BASE_URL}/products", json=prod_data, headers=headers)
        
        if resp.status_code in [200, 201]:
            print(f"  ✓ Success! Product ID: {resp.json().get('data', {}).get('id')}")
        else:
            print(f"  × Failed ({resp.status_code}): {resp.text}")

    print("\nDemo setup complete!")

if __name__ == "__main__":
    setup_demo_products()

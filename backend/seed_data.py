import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

products_data = [
    {
        "id": "prod_1",
        "name": "Royal Maroon Banarasi Saree",
        "slug": "royal-maroon-banarasi-saree",
        "description": "Exquisite handwoven Banarasi silk saree in rich maroon with golden zari work. Perfect for weddings and festive occasions.",
        "price": 12999,
        "sale_price": 9999,
        "category": "Sarees",
        "subcategory": "Banarasi",
        "images": [
            "https://images.unsplash.com/photo-1767955694884-d4bf352c23c2?w=800",
            "https://images.unsplash.com/photo-1651132164857-b61aa4cf7472?w=800"
        ],
        "variations": [
            {"size": "Standard", "color": "Maroon", "stock": 15}
        ],
        "fabric": "Pure Banarasi Silk",
        "occasion": "Wedding, Festival",
        "care_instructions": "Dry clean only. Store in a cool, dry place.",
        "in_stock": True,
        "stock_quantity": 15,
        "featured": True,
        "trending": True
    },
    {
        "id": "prod_2",
        "name": "Golden Lehenga Choli Set",
        "slug": "golden-lehenga-choli-set",
        "description": "Stunning golden lehenga with intricate embroidery and mirror work. Includes choli and dupatta.",
        "price": 24999,
        "sale_price": 19999,
        "category": "Lehengas",
        "subcategory": "Bridal",
        "images": [
            "https://images.unsplash.com/photo-1737514996816-a034a795febe?w=800",
            "https://images.unsplash.com/photo-1757598077205-69a927f0240f?w=800"
        ],
        "variations": [
            {"size": "S", "color": "Golden", "stock": 8},
            {"size": "M", "color": "Golden", "stock": 10},
            {"size": "L", "color": "Golden", "stock": 5}
        ],
        "fabric": "Silk with Zari Embroidery",
        "occasion": "Wedding, Reception",
        "care_instructions": "Dry clean only. Handle with care.",
        "in_stock": True,
        "stock_quantity": 23,
        "featured": True,
        "trending": True
    },
    {
        "id": "prod_3",
        "name": "Jaipuri Block Print Suit",
        "slug": "jaipuri-block-print-suit",
        "description": "Traditional Jaipuri block print suit in cream with maroon accents. Includes kurta, bottom, and dupatta.",
        "price": 3999,
        "sale_price": 2999,
        "category": "Suits",
        "subcategory": "Jaipuri",
        "images": [
            "https://images.unsplash.com/photo-1622129216080-32d0c0f5efd7?w=800",
            "https://images.unsplash.com/photo-1595841953288-12d1cefc7fc5?w=800"
        ],
        "variations": [
            {"size": "S", "color": "Cream", "stock": 20},
            {"size": "M", "color": "Cream", "stock": 25},
            {"size": "L", "color": "Cream", "stock": 15},
            {"size": "XL", "color": "Cream", "stock": 10}
        ],
        "fabric": "Pure Cotton",
        "occasion": "Daily Wear, Casual",
        "care_instructions": "Machine wash cold. Iron on medium heat.",
        "in_stock": True,
        "stock_quantity": 70,
        "featured": False,
        "trending": True
    },
    {
        "id": "prod_4",
        "name": "Bandhani Silk Dupatta",
        "slug": "bandhani-silk-dupatta",
        "description": "Authentic Rajasthani Bandhani dupatta in vibrant colors with traditional tie-dye patterns.",
        "price": 1999,
        "sale_price": None,
        "category": "Dupattas",
        "subcategory": "Bandhani",
        "images": [
            "https://images.unsplash.com/photo-1732381917488-39f31539cd4f?w=800"
        ],
        "variations": [
            {"size": "Standard", "color": "Multi", "stock": 50}
        ],
        "fabric": "Pure Silk",
        "occasion": "Festival, Party",
        "care_instructions": "Dry clean recommended.",
        "in_stock": True,
        "stock_quantity": 50,
        "featured": False,
        "trending": False
    },
    {
        "id": "prod_5",
        "name": "Festive Red Silk Saree",
        "slug": "festive-red-silk-saree",
        "description": "Elegant red silk saree with golden border. Perfect for Diwali and other celebrations.",
        "price": 8999,
        "sale_price": 6999,
        "category": "Sarees",
        "subcategory": "Festive",
        "images": [
            "https://images.unsplash.com/photo-1638964327749-53436bcccdca?w=800"
        ],
        "variations": [
            {"size": "Standard", "color": "Red", "stock": 25}
        ],
        "fabric": "Art Silk",
        "occasion": "Festival, Diwali",
        "care_instructions": "Dry clean only.",
        "in_stock": True,
        "stock_quantity": 25,
        "featured": True,
        "trending": False
    },
    {
        "id": "prod_6",
        "name": "Leheriya Georgette Saree",
        "slug": "leheriya-georgette-saree",
        "description": "Light and breezy Leheriya saree in georgette fabric with wave patterns.",
        "price": 4999,
        "sale_price": 3999,
        "category": "Sarees",
        "subcategory": "Leheriya",
        "images": [
            "https://images.unsplash.com/photo-1767955694884-d4bf352c23c2?w=800"
        ],
        "variations": [
            {"size": "Standard", "color": "Pink", "stock": 30},
            {"size": "Standard", "color": "Yellow", "stock": 20}
        ],
        "fabric": "Georgette",
        "occasion": "Casual, Summer",
        "care_instructions": "Hand wash cold. Dry in shade.",
        "in_stock": True,
        "stock_quantity": 50,
        "featured": False,
        "trending": True
    },
    {
        "id": "prod_7",
        "name": "Designer Anarkali Suit",
        "slug": "designer-anarkali-suit",
        "description": "Floor-length Anarkali suit with embroidered yoke and flared silhouette.",
        "price": 7999,
        "sale_price": 5999,
        "category": "Suits",
        "subcategory": "Anarkali",
        "images": [
            "https://images.unsplash.com/photo-1622129216080-32d0c0f5efd7?w=800"
        ],
        "variations": [
            {"size": "S", "color": "Peach", "stock": 12},
            {"size": "M", "color": "Peach", "stock": 15},
            {"size": "L", "color": "Peach", "stock": 8}
        ],
        "fabric": "Georgette with Embroidery",
        "occasion": "Party, Wedding",
        "care_instructions": "Dry clean only.",
        "in_stock": True,
        "stock_quantity": 35,
        "featured": False,
        "trending": False
    },
    {
        "id": "prod_8",
        "name": "Bridal Maroon Lehenga",
        "slug": "bridal-maroon-lehenga",
        "description": "Luxurious maroon bridal lehenga with heavy zardozi work and sequin embellishments.",
        "price": 45999,
        "sale_price": 39999,
        "category": "Lehengas",
        "subcategory": "Bridal",
        "images": [
            "https://images.unsplash.com/photo-1757598077205-69a927f0240f?w=800",
            "https://images.unsplash.com/photo-1737514996816-a034a795febe?w=800"
        ],
        "variations": [
            {"size": "S", "color": "Maroon", "stock": 3},
            {"size": "M", "color": "Maroon", "stock": 4},
            {"size": "L", "color": "Maroon", "stock": 2}
        ],
        "fabric": "Velvet with Zardozi",
        "occasion": "Wedding",
        "care_instructions": "Professional dry clean only.",
        "in_stock": True,
        "stock_quantity": 9,
        "featured": True,
        "trending": True
    }
]

blog_posts_data = [
    {
        "id": "blog_1",
        "title": "5 Ways to Style Your Banarasi Saree",
        "slug": "5-ways-style-banarasi-saree",
        "excerpt": "Discover creative ways to drape and accessorize your Banarasi saree for different occasions.",
        "content": "Banarasi sarees are timeless pieces that can be styled in multiple ways...",
        "image": "https://images.unsplash.com/photo-1767955694884-d4bf352c23c2?w=800",
        "author": "Priya Sharma",
        "category": "Styling Tips",
        "tags": ["saree", "banarasi", "fashion", "styling"]
    },
    {
        "id": "blog_2",
        "title": "The Art of Rajasthani Bandhani",
        "slug": "art-of-rajasthani-bandhani",
        "excerpt": "Explore the rich heritage and intricate craft behind traditional Bandhani textiles.",
        "content": "Bandhani, also known as Bandhej, is an ancient tie-dye textile art...",
        "image": "https://images.unsplash.com/photo-1732381917488-39f31539cd4f?w=800",
        "author": "Anjali Mehta",
        "category": "Heritage",
        "tags": ["bandhani", "rajasthan", "heritage", "craft"]
    },
    {
        "id": "blog_3",
        "title": "Bridal Lehenga: Choosing the Perfect One",
        "slug": "choosing-perfect-bridal-lehenga",
        "excerpt": "A comprehensive guide to selecting your dream bridal lehenga for the big day.",
        "content": "Your wedding lehenga is one of the most important outfits you'll ever wear...",
        "image": "https://images.unsplash.com/photo-1737514996816-a034a795febe?w=800",
        "author": "Neha Kapoor",
        "category": "Bridal Guide",
        "tags": ["bridal", "lehenga", "wedding", "guide"]
    }
]

async def seed_database():
    print("Seeding database...")
    
    # Clear existing data
    await db.products.delete_many({})
    await db.blog_posts.delete_many({})
    
    # Insert products
    if products_data:
        await db.products.insert_many(products_data)
        print(f"Inserted {len(products_data)} products")
    
    # Insert blog posts
    if blog_posts_data:
        await db.blog_posts.insert_many(blog_posts_data)
        print(f"Inserted {len(blog_posts_data)} blog posts")
    
    print("Database seeded successfully!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())

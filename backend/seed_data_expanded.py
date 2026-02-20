import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Use docker service name when running inside docker, otherwise localhost
mongo_url = os.getenv('MONGO_URL', 'mongodb://mongodb:27017/')
client = AsyncIOMotorClient(mongo_url)
db = client[os.getenv('DB_NAME', 'shriramya')]

# Expanded product data with Home & Lifestyle + Regional Collections
products_data = [
    # WOMEN ETHNIC WEAR - SAREES
    {
        "id": "prod_saree_1",
        "name": "Royal Maroon Banarasi Silk Saree",
        "slug": "royal-maroon-banarasi-saree",
        "description": "Exquisite handwoven Banarasi silk saree in rich maroon with golden zari work. A masterpiece from the weavers of Varanasi, featuring traditional brocade patterns passed down through generations.",
        "price": 12999,
        "sale_price": 9999,
        "category": "Women Ethnic Wear",
        "subcategory": "Sarees",
        "images": [
            "https://images.unsplash.com/photo-1767955694884-d4bf352c23c2?w=800",
            "https://images.unsplash.com/photo-1651132164857-b61aa4cf7472?w=800"
        ],
        "variations": [{"size": "Standard (5.5m)", "color": "Maroon", "stock": 15}],
        "fabric": "Pure Banarasi Silk",
        "craft_style": "Banarasi Brocade",
        "state_of_origin": "Uttar Pradesh",
        "occasion": "Wedding, Festival",
        "care_instructions": "Dry clean only. Store in muslin cloth.",
        "handmade": True,
        "luxury_collection": True,
        "in_stock": True,
        "stock_quantity": 15,
        "featured": True,
        "trending": True
    },
    {
        "id": "prod_saree_2",
        "name": "Bandhej Silk Saree - Rajasthani Heritage",
        "slug": "bandhej-silk-saree-rajasthani",
        "description": "Authentic Rajasthani Bandhej (tie-dye) silk saree with traditional patterns. Each dot tied by hand, creating mesmerizing geometric designs.",
        "price": 8999,
        "sale_price": 6999,
        "category": "Women Ethnic Wear",
        "subcategory": "Sarees",
        "images": [
            "https://images.unsplash.com/photo-1732381917488-39f31539cd4f?w=800"
        ],
        "variations": [
            {"size": "Standard (5.5m)", "color": "Multi", "stock": 25}
        ],
        "fabric": "Pure Silk",
        "craft_style": "Bandhani/Bandhej",
        "state_of_origin": "Rajasthan",
        "occasion": "Festival, Party",
        "care_instructions": "Dry clean recommended. First wash may release excess dye.",
        "handmade": True,
        "luxury_collection": False,
        "in_stock": True,
        "stock_quantity": 25,
        "featured": True,
        "trending": True
    },
    {
        "id": "prod_saree_3",
        "name": "Kanjeevaram Silk Saree - Temple Border",
        "slug": "kanjeevaram-silk-saree-temple",
        "description": "Authentic Kanjeevaram silk saree from Tamil Nadu with intricate temple border and traditional motifs. Pure zari work in gold thread.",
        "price": 15999,
        "sale_price": None,
        "category": "Women Ethnic Wear",
        "subcategory": "Sarees",
        "images": [
            "https://images.unsplash.com/photo-1638964327749-53436bcccdca?w=800"
        ],
        "variations": [
            {"size": "Standard (5.5m)", "color": "Red", "stock": 12}
        ],
        "fabric": "Pure Kanjeevaram Silk",
        "craft_style": "Kanjeevaram Weaving",
        "state_of_origin": "Tamil Nadu",
        "occasion": "Wedding, Grand Celebration",
        "care_instructions": "Dry clean only. Avoid direct sunlight.",
        "handmade": True,
        "luxury_collection": True,
        "in_stock": True,
        "stock_quantity": 12,
        "featured": True,
        "trending": False
    },
    
    # WOMEN ETHNIC WEAR - READY TO WEAR SAREES
    {
        "id": "prod_rtw_saree_1",
        "name": "Ready to Wear Leheriya Saree with Belt",
        "slug": "ready-wear-leheriya-saree",
        "description": "Pre-stitched Leheriya saree with attached blouse and belt. Perfect for those who want the elegance of a saree with hassle-free draping.",
        "price": 4999,
        "sale_price": 3999,
        "category": "Women Ethnic Wear",
        "subcategory": "Ready-to-Wear Sarees",
        "images": [
            "https://images.unsplash.com/photo-1767955694884-d4bf352c23c2?w=800"
        ],
        "variations": [
            {"size": "S", "color": "Pink", "stock": 20},
            {"size": "M", "color": "Pink", "stock": 25},
            {"size": "L", "color": "Pink", "stock": 15}
        ],
        "fabric": "Georgette",
        "craft_style": "Leheriya",
        "state_of_origin": "Rajasthan",
        "occasion": "Party, Office Wear",
        "care_instructions": "Hand wash cold. Dry in shade.",
        "handmade": False,
        "luxury_collection": False,
        "in_stock": True,
        "stock_quantity": 60,
        "featured": False,
        "trending": True
    },
    
    # WOMEN ETHNIC WEAR - LEHENGAS
    {
        "id": "prod_lehenga_1",
        "name": "Bridal Maroon Lehenga - Luxury Collection",
        "slug": "bridal-maroon-lehenga-luxury",
        "description": "Luxurious maroon bridal lehenga with heavy zardozi work, sequin embellishments, and intricate Rajasthani mirror work. Complete set with choli and dupatta.",
        "price": 45999,
        "sale_price": 39999,
        "category": "Women Ethnic Wear",
        "subcategory": "Lehengas",
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
        "craft_style": "Zardozi Embroidery",
        "state_of_origin": "Rajasthan",
        "occasion": "Wedding",
        "care_instructions": "Professional dry clean only.",
        "handmade": True,
        "luxury_collection": True,
        "in_stock": True,
        "stock_quantity": 9,
        "featured": True,
        "trending": True
    },
    
    # WOMEN ETHNIC WEAR - SUITS
    {
        "id": "prod_suit_1",
        "name": "Jaipuri Block Print Cotton Suit",
        "slug": "jaipuri-block-print-suit",
        "description": "Traditional Jaipuri block print suit in cream with maroon accents. Includes kurta, bottom, and dupatta. Perfect blend of comfort and style.",
        "price": 3999,
        "sale_price": 2999,
        "category": "Women Ethnic Wear",
        "subcategory": "Ladies Suits",
        "images": [
            "https://images.unsplash.com/photo-1622129216080-32d0c0f5efd7?w=800"
        ],
        "variations": [
            {"size": "S", "color": "Cream", "stock": 20},
            {"size": "M", "color": "Cream", "stock": 25},
            {"size": "L", "color": "Cream", "stock": 15},
            {"size": "XL", "color": "Cream", "stock": 10}
        ],
        "fabric": "Pure Cotton",
        "craft_style": "Block Printing",
        "state_of_origin": "Rajasthan",
        "occasion": "Daily Wear, Casual",
        "care_instructions": "Machine wash cold. Iron on medium heat.",
        "handmade": True,
        "luxury_collection": False,
        "in_stock": True,
        "stock_quantity": 70,
        "featured": False,
        "trending": True
    },
    {
        "id": "prod_suit_2",
        "name": "Phulkari Embroidered Punjabi Suit",
        "slug": "phulkari-punjabi-suit",
        "description": "Vibrant Phulkari embroidered suit from Punjab. Traditional floral patterns hand-embroidered on pure cotton.",
        "price": 5999,
        "sale_price": None,
        "category": "Women Ethnic Wear",
        "subcategory": "Ladies Suits",
        "images": [
            "https://images.unsplash.com/photo-1595841953288-12d1cefc7fc5?w=800"
        ],
        "variations": [
            {"size": "M", "color": "Yellow", "stock": 15},
            {"size": "L", "color": "Yellow", "stock": 12}
        ],
        "fabric": "Cotton with Phulkari Embroidery",
        "craft_style": "Phulkari",
        "state_of_origin": "Punjab",
        "occasion": "Festival, Celebration",
        "care_instructions": "Hand wash cold. Dry in shade.",
        "handmade": True,
        "luxury_collection": False,
        "in_stock": True,
        "stock_quantity": 27,
        "featured": False,
        "trending": False
    },
    
    # WOMEN ETHNIC WEAR - DUPATTAS
    {
        "id": "prod_dupatta_1",
        "name": "Bandhani Silk Dupatta",
        "slug": "bandhani-silk-dupatta",
        "description": "Authentic Rajasthani Bandhani dupatta in vibrant colors with traditional tie-dye patterns.",
        "price": 1999,
        "sale_price": None,
        "category": "Women Ethnic Wear",
        "subcategory": "Dupattas",
        "images": [
            "https://images.unsplash.com/photo-1732381917488-39f31539cd4f?w=800"
        ],
        "variations": [
            {"size": "Standard (2.5m)", "color": "Multi", "stock": 50}
        ],
        "fabric": "Pure Silk",
        "craft_style": "Bandhani",
        "state_of_origin": "Rajasthan",
        "occasion": "Festival, Party",
        "care_instructions": "Dry clean recommended.",
        "handmade": True,
        "luxury_collection": False,
        "in_stock": True,
        "stock_quantity": 50,
        "featured": False,
        "trending": False
    },
    
    # HOME & LIFESTYLE - BEDSHEETS
    {
        "id": "prod_bedsheet_1",
        "name": "Rajasthani Block Print Bedsheet Set - King Size",
        "slug": "rajasthani-block-print-bedsheet-king",
        "description": "Luxurious king-size bedsheet set with traditional Rajasthani block prints. Includes 1 bedsheet and 2 pillow covers. 100% cotton, soft and breathable.",
        "price": 3999,
        "sale_price": 2999,
        "category": "Home & Lifestyle",
        "subcategory": "Bedsheets",
        "images": [
            "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800"
        ],
        "variations": [
            {"size": "King (108x108 inch)", "color": "Blue", "stock": 30},
            {"size": "King (108x108 inch)", "color": "Red", "stock": 25}
        ],
        "fabric": "100% Cotton",
        "craft_style": "Block Printing",
        "state_of_origin": "Rajasthan",
        "occasion": "Home Decor",
        "care_instructions": "Machine wash cold. Tumble dry low.",
        "handmade": True,
        "luxury_collection": False,
        "in_stock": True,
        "stock_quantity": 55,
        "featured": True,
        "trending": True,
        "bundle_products": ["prod_pillow_1"]
    },
    {
        "id": "prod_bedsheet_2",
        "name": "Luxury Embroidered Bedsheet - Double Bed",
        "slug": "luxury-embroidered-bedsheet-double",
        "description": "Premium embroidered bedsheet with intricate floral patterns. Includes bedsheet and 2 pillow covers. Made from Egyptian cotton.",
        "price": 5999,
        "sale_price": None,
        "category": "Home & Lifestyle",
        "subcategory": "Bedsheets",
        "images": [
            "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800"
        ],
        "variations": [
            {"size": "Double (90x100 inch)", "color": "White", "stock": 20},
            {"size": "Double (90x100 inch)", "color": "Cream", "stock": 18}
        ],
        "fabric": "Egyptian Cotton",
        "craft_style": "Embroidery",
        "state_of_origin": "Uttar Pradesh",
        "occasion": "Luxury Home",
        "care_instructions": "Dry clean recommended for embroidery.",
        "handmade": True,
        "luxury_collection": True,
        "in_stock": True,
        "stock_quantity": 38,
        "featured": True,
        "trending": False
    },
    
    # HOME & LIFESTYLE - DOHAR
    {
        "id": "prod_dohar_1",
        "name": "Traditional Jaipuri Dohar - Reversible",
        "slug": "traditional-jaipuri-dohar",
        "description": "Handcrafted reversible dohar (light quilt) with traditional Jaipuri prints. Perfect for all seasons. Made with soft cotton layers.",
        "price": 2999,
        "sale_price": 2499,
        "category": "Home & Lifestyle",
        "subcategory": "Dohar",
        "images": [
            "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800"
        ],
        "variations": [
            {"size": "Single (60x90 inch)", "color": "Multi", "stock": 35},
            {"size": "Double (90x100 inch)", "color": "Multi", "stock": 40}
        ],
        "fabric": "Cotton",
        "craft_style": "Block Printing",
        "state_of_origin": "Rajasthan",
        "occasion": "Home Comfort",
        "care_instructions": "Machine wash gentle. Dry in shade.",
        "handmade": True,
        "luxury_collection": False,
        "in_stock": True,
        "stock_quantity": 75,
        "featured": False,
        "trending": True
    },
    
    # HOME & LIFESTYLE - PILLOW COVERS
    {
        "id": "prod_pillow_1",
        "name": "Block Print Cushion Cover Set (Pack of 5)",
        "slug": "block-print-cushion-cover-set",
        "description": "Set of 5 cushion covers with assorted Rajasthani block print designs. Mix and match to create vibrant home decor.",
        "price": 1499,
        "sale_price": 999,
        "category": "Home & Lifestyle",
        "subcategory": "Cushion Covers",
        "images": [
            "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800"
        ],
        "variations": [
            {"size": "16x16 inch", "color": "Multi", "stock": 60}
        ],
        "fabric": "Cotton",
        "craft_style": "Block Printing",
        "state_of_origin": "Rajasthan",
        "occasion": "Home Decor",
        "care_instructions": "Machine wash cold.",
        "handmade": True,
        "luxury_collection": False,
        "in_stock": True,
        "stock_quantity": 60,
        "featured": False,
        "trending": True
    },
    {
        "id": "prod_pillow_2",
        "name": "Luxury Zardozi Pillow Covers (Pair)",
        "slug": "luxury-zardozi-pillow-covers",
        "description": "Pair of premium pillow covers with intricate Zardozi embroidery. Perfect for adding a touch of elegance to your bedroom.",
        "price": 2499,
        "sale_price": None,
        "category": "Home & Lifestyle",
        "subcategory": "Pillow Covers",
        "images": [
            "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800"
        ],
        "variations": [
            {"size": "18x27 inch", "color": "Gold", "stock": 25},
            {"size": "18x27 inch", "color": "Silver", "stock": 20}
        ],
        "fabric": "Velvet with Zardozi",
        "craft_style": "Zardozi Embroidery",
        "state_of_origin": "Uttar Pradesh",
        "occasion": "Luxury Home",
        "care_instructions": "Dry clean only.",
        "handmade": True,
        "luxury_collection": True,
        "in_stock": True,
        "stock_quantity": 45,
        "featured": True,
        "trending": False
    }
]

async def seed_database():
    print("🌟 Seeding expanded database with Women Ethnic Wear + Home & Lifestyle...")
    
    # Clear existing products
    await db.products.delete_many({})
    
    # Insert expanded products
    if products_data:
        await db.products.insert_many(products_data)
        print(f"✅ Inserted {len(products_data)} products")
        print(f"   - Women Ethnic Wear: {len([p for p in products_data if p['category'] == 'Women Ethnic Wear'])}")
        print(f"   - Home & Lifestyle: {len([p for p in products_data if p['category'] == 'Home & Lifestyle'])}")
        print(f"   - Luxury Collection: {len([p for p in products_data if p.get('luxury_collection')])}")
    
    print("✨ Database seeded successfully with luxury collections!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from woocommerce import API
import mysql.connector

# =====================
# ENV SETUP
# =====================

load_dotenv()

# =====================
# LOGGER
# =====================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("shriramya")

# =====================
# WOOCOMMERCE
# =====================

wcapi = API(
    url=os.getenv("WOOCOMMERCE_URL", "http://wordpress"),
    consumer_key=os.getenv("WOOCOMMERCE_CONSUMER_KEY"),
    consumer_secret=os.getenv("WOOCOMMERCE_CONSUMER_SECRET"),
    version="wc/v3",
    timeout=60
)


def wc_get(endpoint: str, params: dict | None = None):
    resp = wcapi.get(endpoint, params=params)
    try:
        return resp.json()
    except Exception as e:
        logger.error("WooCommerce request failed: %s %s %s", endpoint, getattr(resp, 'status_code', None), getattr(resp, 'text', ''))
        raise HTTPException(status_code=502, detail=f"WooCommerce error contacting {endpoint}: status={getattr(resp, 'status_code', None)}")


def wc_post(endpoint: str, data: dict | None = None):
    resp = wcapi.post(endpoint, data)
    try:
        return resp.json()
    except Exception:
        logger.error("WooCommerce POST failed: %s %s %s", endpoint, getattr(resp, 'status_code', None), getattr(resp, 'text', ''))
        raise HTTPException(status_code=502, detail=f"WooCommerce error POSTing to {endpoint}: status={getattr(resp, 'status_code', None)}")

# =====================
# DATABASE
# =====================

mongo_url = os.getenv("MONGO_URL")
db_name = os.getenv("DB_NAME")

if not mongo_url or not db_name:
    raise ValueError("MongoDB environment variables missing")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# =====================
# MYSQL CONNECTION
# =====================

def get_mysql_connection():
    """Get MySQL connection for WooCommerce product queries"""
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "mysql"),
        port=int(os.getenv("MYSQL_PORT", 3306)),
        user=os.getenv("MYSQL_USER", "wpuser"),
        password=os.getenv("MYSQL_PASSWORD", "wppassword"),
        database=os.getenv("MYSQL_DB", "shriramya")
    )

def query_product_from_mysql(product_id: int):
    """Query product from WordPress/WooCommerce MySQL database"""
    try:
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get product post
        cursor.execute(
            "SELECT ID, post_title, post_content, post_excerpt FROM wp_posts WHERE ID = %s AND post_type = 'product'",
            (product_id,)
        )
        product = cursor.fetchone()
        
        if not product:
            cursor.close()
            conn.close()
            return None
        
        # Get product price and meta
        cursor.execute(
            "SELECT meta_key, meta_value FROM wp_postmeta WHERE post_id = %s AND meta_key IN ('_price', '_regular_price', '_sale_price', '_sku', '_stock')",
            (product_id,)
        )
        
        meta_data = {}
        for meta in cursor.fetchall():
            meta_data[meta['meta_key']] = meta['meta_value']
        
        cursor.close()
        conn.close()
        
        # Format product response
        return {
            "id": product['ID'],
            "name": product['post_title'],
            "description": product['post_content'],
            "short_description": product['post_excerpt'],
            "price": float(meta_data.get('_price', meta_data.get('_regular_price', 0))),
            "regular_price": float(meta_data.get('_regular_price', meta_data.get('_price', 0))),
            "sale_price": float(meta_data.get('_sale_price', 0)) if meta_data.get('_sale_price') else None,
            "sku": meta_data.get('_sku', ''),
            "stock_quantity": int(meta_data.get('_stock', 0))
        }
    except Exception as e:
        logger.error(f"MySQL query error for product {product_id}: {e}")
        return None

# =====================
# UTILITIES
# =====================

def convert_objectid(doc):
    """Convert MongoDB ObjectId to string for JSON serialization"""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [convert_objectid(d) for d in doc]
    if isinstance(doc, dict):
        return {k: str(v) if str(type(v)) == "<class 'bson.objectid.ObjectId'>" else convert_objectid(v) for k, v in doc.items()}
    return doc

SECRET_KEY = os.getenv("JWT_SECRET", "dev_secret_change_me")
ALGORITHM = "HS256"
security = HTTPBearer()

# =====================
# FASTAPI LIFESPAN
# =====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Server starting...")
    yield
    logger.info("Closing MongoDB...")
    client.close()

app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")

# =====================
# MODELS
# =====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    phone: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    user: User

class CartItem(BaseModel):
    product_id: str
    quantity: int = 1
    variation: Optional[Dict[str, Any]] = None

class Cart(BaseModel):
    session_id: str
    items: List[CartItem] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ShippingAddress(BaseModel):
    name: str
    phone: str
    address_line1: str
    city: str
    state: str
    pincode: str

class CreateOrderRequest(BaseModel):
    items: List[CartItem]
    shipping_address: ShippingAddress
    email: str

# =====================
# AUTH HELPERS
# =====================

def hash_password(password):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain, hashed):
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_token(user_id):
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        payload = jwt.decode(
            credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM]
        )
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if user:
            return User(**user)
    except Exception:
        return None

# =====================
# MIDDLEWARE
# =====================

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"{request.method} {request.url}")
    response = await call_next(request)
    return response

# =====================
# AUTH ROUTES
# =====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserRegister):

    if await db.users.find_one({"email": data.email}):
        raise HTTPException(400, "Email exists")

    user = User(email=data.email, name=data.name, phone=data.phone)

    doc = user.model_dump()
    doc["password"] = hash_password(data.password)

    await db.users.insert_one(doc)

    return TokenResponse(
        access_token=create_token(user.id),
        user=user,
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):

    user = await db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(401, "Invalid credentials")

    user.pop("password")

    return TokenResponse(
        access_token=create_token(user["id"]),
        user=User(**user),
    )

# =====================
# PRODUCT ROUTES
# =====================


@api_router.get("/products")
async def products(
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    featured: Optional[bool] = None,
    trending: Optional[bool] = None,
    limit: Optional[int] = None,
    per_page: int = 100
):
    try:
        params = {"per_page": per_page}
        
        if featured:
            params["featured"] = True
        if trending:
            # Note: WooCommerce doesn't have a "trending" parameter
            # This might need custom implementation
            pass
        if limit:
            params["per_page"] = min(limit, 100)
        
        # Handle category filtering
        if category:
            # First, get category by name
            categories_res = wc_get("products/categories", params={"search": category, "per_page": 1})
            if categories_res:
                cat_id = categories_res[0].get("id")
                if cat_id:
                    params["category"] = cat_id

        res = wc_get("products", params=params)
        return res
    except HTTPException:
        # Fallback to MongoDB if WooCommerce fails
        logger.info("WooCommerce unavailable, falling back to MongoDB products")
        query = {}
        if featured:
            query["featured"] = True
        if trending:
            query["trending"] = True
        if category:
            query["category"] = category
        if subcategory:
            query["subcategory"] = subcategory
        
        products = await db.products.find(query).limit(limit or per_page).to_list(limit or per_page)
        return convert_objectid(products)

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    # Try numeric ID first (from MySQL/WooCommerce)
    try:
        product_id_int = int(product_id)
        
        # Query MySQL directly
        product = query_product_from_mysql(product_id_int)
        if product:
            logger.info(f"Found product {product_id_int} in MySQL")
            return product
    except (ValueError, TypeError):
        # Not a numeric ID, will try as string
        pass
    except Exception as e:
        logger.error(f"MySQL query error: {e}")
    
    try:
        # Try WooCommerce API (with string product_id)
        p = wc_get(f"products/{product_id}")
        if "id" not in p:
            raise HTTPException(status_code=404, detail="Product not found")
        return p
    except HTTPException:
        # Fallback to MongoDB (for string IDs like "prod_saree_1")
        logger.info("WooCommerce unavailable, falling back to MongoDB for product %s", product_id)
        product = await db.products.find_one({"id": product_id})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return convert_objectid(product)

# =======================
# RECOMMENDATION ROUTES
# =======================

@api_router.get("/recommendations/{product_id}")
async def get_recommendations(product_id: int):

    product = wc_get(f"products/{product_id}")

    if "id" not in product:
        raise HTTPException(404, "Product not found")

    # Get first category of product
    categories = product.get("categories", [])
    if not categories:
        return []

    category_id = categories[0]["id"]

    # Fetch similar products
    res = wc_get(
        "products",
        params={"category": category_id, "per_page": 4},
    )

    recommendations = [
        p
        for p in res
        if p["id"] != product_id
    ]

    return recommendations

# =====================
# CART ROUTES
# =====================

@api_router.get("/cart")
async def get_cart(session_id: str):
    """
    Get cart items for a session
    """
    cart = await db.carts.find_one({"session_id": session_id}, {"_id": 0})
    
    if not cart:
        return {"session_id": session_id, "items": []}
    
    return cart

@api_router.post("/cart")
async def add_to_cart(data: CartItem, session_id: Optional[str] = None):
    """
    Add item to cart
    """
    if not session_id:
        # Generate new session if not provided
        session_id = str(uuid.uuid4())
    
    cart = await db.carts.find_one({"session_id": session_id})
    
    if not cart:
        # Create new cart
        cart = {
            "session_id": session_id,
            "items": [data.model_dump()],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.carts.insert_one(cart)
    else:
        # Check if item already exists
        existing_index = None
        for i, item in enumerate(cart["items"]):
            if item["product_id"] == data.product_id:
                existing_index = i
                break
        
        if existing_index is not None:
            # Update quantity
            cart["items"][existing_index]["quantity"] += data.quantity
        else:
            # Add new item
            cart["items"].append(data.model_dump())
        
        # Update cart timestamp
        cart["updated_at"] = datetime.now(timezone.utc)
        await db.carts.update_one(
            {"session_id": session_id},
            {"$set": {"items": cart["items"], "updated_at": cart["updated_at"]}}
        )
    
    return await db.carts.find_one({"session_id": session_id}, {"_id": 0})

@api_router.delete("/cart/item/{product_id}")
async def remove_from_cart(product_id: str, session_id: Optional[str] = None):
    """
    Remove item from cart
    """
    if not session_id:
        raise HTTPException(400, "session_id is required")
    
    cart = await db.carts.find_one({"session_id": session_id})
    
    if not cart:
        raise HTTPException(404, "Cart not found")
    
    # Filter out the item
    cart["items"] = [item for item in cart["items"] if item["product_id"] != product_id]
    cart["updated_at"] = datetime.now(timezone.utc)
    
    await db.carts.update_one(
        {"session_id": session_id},
        {"$set": {"items": cart["items"], "updated_at": cart["updated_at"]}}
    )
    
    return await db.carts.find_one({"session_id": session_id}, {"_id": 0})

@api_router.delete("/cart")
async def clear_cart(session_id: Optional[str] = None):
    """
    Clear entire cart
    """
    if not session_id:
        raise HTTPException(400, "session_id is required")
    
    await db.carts.delete_one({"session_id": session_id})
    
    return {"session_id": session_id, "items": []}

# =====================
# INVENTORY CHECK
# =====================

async def validate_inventory(items):

    for item in items:
        product = wc_get(f"products/{item.product_id}")

        if not product.get("stock_quantity") or product["stock_quantity"] < item.quantity:
            raise HTTPException(
                400, f"{product['name']} is out of stock"
            )

# =====================
# ORDER ROUTES
# =====================

@api_router.post("/orders/create")
async def create_order(order_request: CreateOrderRequest):

    await validate_inventory(order_request.items)

    line_items = [
        {"product_id": int(i.product_id), "quantity": i.quantity}
        for i in order_request.items
    ]

    wc_data = {
        "payment_method": "cod",
        "set_paid": False,
        "billing": {
            "first_name": order_request.shipping_address.name,
            "email": order_request.email,
            "phone": order_request.shipping_address.phone,
            "address_1": order_request.shipping_address.address_line1,
            "city": order_request.shipping_address.city,
            "state": order_request.shipping_address.state,
            "postcode": order_request.shipping_address.pincode,
            "country": "IN",
        },
        "line_items": line_items,
    }

    wc_order = wc_post("orders", wc_data)

    doc = {
        "id": str(uuid.uuid4()),
        "woo_id": wc_order["id"],
        "status": "pending",
        "email": order_request.email,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.orders.insert_one(doc)

    return {"order": doc}

# =====================
# ADMIN APIs
# =====================

@api_router.get("/admin/orders")
async def admin_orders():
    return await db.orders.find({}, {"_id": 0}).to_list(200)

@api_router.get("/admin/users")
async def admin_users():
    return await db.users.find({}, {"_id": 0}).to_list(200)

# =====================
# HEALTH
# =====================

@api_router.get("/health")
async def health():
    return {"status": "ok"}

# =====================
# ROUTER + CORS
# =====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

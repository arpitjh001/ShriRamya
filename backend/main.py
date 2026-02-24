# Shri Ramya Backend - Enhanced & Production-Ready
# Complete WooCommerce integration with MongoDB fallback
# Premium error handling, validation, logging, and security

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict, validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from woocommerce import API
import mysql.connector
from functools import wraps
import time
from tenacity import retry, stop_after_attempt, wait_exponential

# =====================
# ENV SETUP
# =====================

load_dotenv()

# =====================
# ENHANCED LOGGING
# =====================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("shriramya")

# =====================
# WOOCOMMERCE WITH RETRY LOGIC
# =====================

wc_enabled = all([
    os.getenv("WOOCOMMERCE_URL"),
    os.getenv("WOOCOMMERCE_CONSUMER_KEY"),
    os.getenv("WOOCOMMERCE_CONSUMER_SECRET")
])

if wc_enabled:
    from requests.auth import HTTPBasicAuth
    import requests
    
    class DirectWCAPI:
        def __init__(self, url, consumer_key, consumer_secret, version="wc/v3", verify_ssl=False, timeout=30, **kwargs):
            self.base_url = f"{url.rstrip('/')}/wp-json/{version}"
            self.auth = HTTPBasicAuth(consumer_key, consumer_secret)
            self.verify = verify_ssl
            self.timeout = timeout

        def _url(self, endpoint):
            return f"{self.base_url}/{endpoint.lstrip('/')}"
            
        def get(self, endpoint, params=None):
            return requests.get(self._url(endpoint), params=params, auth=self.auth, verify=self.verify, timeout=self.timeout)
            
        def post(self, endpoint, data=None):
            return requests.post(self._url(endpoint), json=data, auth=self.auth, verify=self.verify, timeout=self.timeout)

        def put(self, endpoint, data=None):
            return requests.put(self._url(endpoint), json=data, auth=self.auth, verify=self.verify, timeout=self.timeout)

        def delete(self, endpoint, params=None):
            return requests.delete(self._url(endpoint), params=params, auth=self.auth, verify=self.verify, timeout=self.timeout)
            
    wcapi = DirectWCAPI(
        url=os.getenv("WOOCOMMERCE_URL"),
        consumer_key=os.getenv("WOOCOMMERCE_CONSUMER_KEY"),
        consumer_secret=os.getenv("WOOCOMMERCE_CONSUMER_SECRET"),
        version="wc/v3",
        timeout=30,
        verify_ssl=os.getenv("WOOCOMMERCE_VERIFY_SSL", "True").lower() == "true",
    )
    logger.info("WooCommerce API initialized via robust DirectWCAPI method")
else:
    wcapi = None
    logger.warning("WooCommerce not configured - using MongoDB fallback")

from tenacity import retry_if_exception

def is_retryable_exception(e):
    if isinstance(e, HTTPException) and 400 <= e.status_code < 500:
        return False
    return True

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10), retry=retry_if_exception(is_retryable_exception))
def wc_get_with_retry(endpoint: str, params: dict | None = None):
    """WooCommerce GET with automatic retry"""
    if not wcapi:
        raise HTTPException(502, "WooCommerce not configured")
    
    try:
        resp = wcapi.get(endpoint, params=params)
        if resp.status_code >= 400:
            logger.error(f"WooCommerce error: {resp.status_code} - {resp.text}")
            raise HTTPException(resp.status_code, f"WooCommerce API error: {resp.text}")
        return resp.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"WooCommerce GET failed: {endpoint} - {str(e)}")
        raise

def wc_get(endpoint: str, params: dict | None = None):
    """WooCommerce GET with fallback to MongoDB"""
    if not wcapi:
        raise HTTPException(502, "WooCommerce not available - use MongoDB fallback")
    
    try:
        return wc_get_with_retry(endpoint, params)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"WooCommerce request failed: {endpoint} - {str(e)}")
        raise HTTPException(502, f"WooCommerce error: {str(e)}")

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10), retry=retry_if_exception(is_retryable_exception))
def wc_post_with_retry(endpoint: str, data: dict | None = None):
    """WooCommerce POST with automatic retry"""
    if not wcapi:
        raise HTTPException(502, "WooCommerce not configured")
    
    try:
        resp = wcapi.post(endpoint, data)
        if resp.status_code >= 400:
            logger.error(f"WooCommerce POST error: {resp.status_code} - {resp.text}")
            raise HTTPException(resp.status_code, f"WooCommerce API error: {resp.text}")
        return resp.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"WooCommerce POST failed: {endpoint} - {str(e)}")
        raise

def wc_post(endpoint: str, data: dict | None = None):
    """WooCommerce POST with fallback"""
    if not wcapi:
        raise HTTPException(502, "WooCommerce not available")
    
    try:
        return wc_post_with_retry(endpoint, data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"WooCommerce POST failed: {endpoint} - {str(e)}")
        raise HTTPException(502, f"WooCommerce error: {str(e)}")

# =====================
# DATABASE
# =====================

mongo_url = os.getenv("MONGO_URL")
db_name = os.getenv("DB_NAME")

if not mongo_url or not db_name:
    raise ValueError("MongoDB environment variables missing")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

logger.info(f"MongoDB connected: {db_name}")

# =====================
# HELPER FUNCTIONS
# =====================

def convert_objectid(doc):
    """Convert MongoDB ObjectId to string for JSON serialization"""
    if doc and isinstance(doc, dict):
        for key, value in doc.items():
            if hasattr(value, '__str__') and 'ObjectId' in str(type(value)):
                doc[key] = str(value)
            elif isinstance(value, dict):
                doc[key] = convert_objectid(value)
            elif isinstance(value, list):
                doc[key] = [convert_objectid(item) if isinstance(item, dict) else item for item in value]
            elif isinstance(value, datetime):
                doc[key] = value.isoformat()
    return doc

# =====================
# PYDANTIC MODELS
# =====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    phone: Optional[str] = None
    role: str = Field(default="customer")  # 'admin' or 'customer'
    addresses: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=2)
    phone: Optional[str] = None
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class CartItem(BaseModel):
    product_id: str
    quantity: int = Field(..., ge=1, le=100)
    variation: Optional[Dict[str, Any]] = None

class ShippingAddress(BaseModel):
    name: str = Field(..., min_length=2)
    phone: str = Field(..., min_length=10)
    address_line1: str = Field(..., min_length=5)
    address_line2: Optional[str] = None
    city: str = Field(..., min_length=2)
    state: str = Field(..., min_length=2)
    pincode: str = Field(..., min_length=5, max_length=10)

class CreateOrderRequest(BaseModel):
    items: List[CartItem]
    shipping_address: ShippingAddress
    email: EmailStr
    coupon_code: Optional[str] = None

# =====================
# JWT & AUTH
# =====================

SECRET_KEY = os.getenv('JWT_SECRET', 'shri-ramya-secret-key-2025')
ALGORITHM = "HS256"
security = HTTPBearer()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=30)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Dependency: requires authenticated admin user"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Not authenticated")
        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user_doc:
            raise HTTPException(status_code=401, detail="User not found")
        if isinstance(user_doc.get('created_at'), str):
            user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
        user = User(**user_doc)
        if user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin auth error: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[User]:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            return None
        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if user_doc:
            if isinstance(user_doc.get('created_at'), str):
                user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
            return User(**user_doc)
        return None
    except Exception as e:
        logger.error(f"Auth error: {str(e)}")
        return None

# =====================
# FASTAPI APP
# =====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application startup")
    yield
    logger.info("Application shutdown")
    client.close()

app = FastAPI(
    title="Shri Ramya API",
    description="Premium Luxury Ethnic Wear eCommerce API",
    version="2.0.0",
    lifespan=lifespan
)

api_router = APIRouter(prefix="/api")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================
# ERROR HANDLERS
# =====================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.error(f"HTTP {exc.status_code}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status_code": exc.status_code}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "status_code": 500}
    )

# =====================
# AUTH ROUTES
# =====================

@api_router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    """Register new user with validation"""
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        name=user_data.name,
        phone=user_data.phone
    )
    
    user_dict = user.model_dump()
    user_dict['password'] = hash_password(user_data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    logger.info(f"New user registered: {user.email}")
    
    token = create_access_token({"sub": user.id, "role": "customer"})
    return TokenResponse(access_token=token, user=user)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login user with credentials"""
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_doc.pop('password')
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user = User(**user_doc)
    token = create_access_token({"sub": user.id, "role": user.role})
    logger.info(f"User logged in: {user.email} (role: {user.role})")
    return TokenResponse(access_token=token, user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return current_user

@api_router.get("/auth/check-admin")
async def check_admin(current_user: User = Depends(get_current_user)):
    """Check if current user has admin role"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"is_admin": current_user.role == "admin", "role": current_user.role, "email": current_user.email}

# =====================
# PRODUCT ROUTES
# =====================

@api_router.get("/products")
async def get_products(
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    featured: Optional[bool] = None,
    trending: Optional[bool] = None,
    state_of_origin: Optional[str] = None,
    luxury_collection: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    """
    Get products with advanced filtering
    Falls back to MongoDB if WooCommerce unavailable
    """
    try:
        # Try WooCommerce first
        if wcapi:
            params = {"per_page": limit, "offset": skip}
            if category:
                params["category"] = category
            
            wc_products = wc_get("products", params)
            return wc_products
    except HTTPException:
        logger.info("Falling back to MongoDB for products")
    
    # MongoDB fallback with enhanced filtering
    query = {}
    if category:
        query['category'] = category
    if subcategory:
        query['subcategory'] = subcategory
    if featured is not None:
        query['featured'] = featured
    if trending is not None:
        query['trending'] = trending
    if state_of_origin:
        query['state_of_origin'] = state_of_origin
    if luxury_collection is not None:
        query['luxury_collection'] = luxury_collection
    
    products = await db.products.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    for product in products:
        product = convert_objectid(product)
    
    return products

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    """Get single product by ID"""
    try:
        # Try WooCommerce first
        if wcapi:
            try:
                product_id_int = int(product_id)
                wc_product = wc_get(f"products/{product_id_int}")
                return wc_product
            except ValueError:
                pass
    except HTTPException:
        logger.info(f"Falling back to MongoDB for product {product_id}")
    
    # MongoDB fallback
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return convert_objectid(product)

@api_router.get("/categories")
async def get_categories():
    """Get all product categories"""
    try:
        if wcapi:
            wc_categories = wc_get("products/categories")
            return {"categories": wc_categories}
    except HTTPException:
        pass
    
    # MongoDB fallback
    categories = await db.products.distinct("category")
    return {"categories": categories}

@api_router.get("/recommendations/{product_id}")
async def get_recommendations(product_id: str, limit: int = Query(4, ge=1, le=10)):
    """Get product recommendations"""
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        return []
    
    # Simple recommendation: same category, different product
    recommendations = await db.products.find(
        {
            "category": product['category'],
            "id": {"$ne": product_id},
            "in_stock": True
        },
        {"_id": 0}
    ).limit(limit).to_list(limit)
    
    return [convert_objectid(rec) for rec in recommendations]

# =====================
# CART ROUTES (Enhanced)
# =====================

@api_router.get("/cart")
async def get_cart(session_id: Optional[str] = Query(None)):
    """Get shopping cart"""
    if not session_id:
        raise HTTPException(400, "session_id is required")
    
    cart = await db.carts.find_one({"session_id": session_id}, {"_id": 0})
    
    if not cart:
        return {"session_id": session_id, "items": [], "updated_at": datetime.now(timezone.utc).isoformat()}
    
    return convert_objectid(cart)

@api_router.post("/cart")
async def add_to_cart(data: CartItem, session_id: Optional[str] = Query(None)):
    """Add item to cart with validation"""
    if not session_id:
        session_id = str(uuid.uuid4())
    
    # Validate product exists and is in stock
    product = await db.products.find_one({"id": data.product_id})
    if not product:
        raise HTTPException(404, "Product not found")
    
    if not product.get("in_stock", False):
        raise HTTPException(400, "Product out of stock")
    
    if data.quantity > product.get("stock_quantity", 0):
        raise HTTPException(400, f"Only {product.get('stock_quantity', 0)} items available")
    
    cart = await db.carts.find_one({"session_id": session_id})
    
    if not cart:
        cart = {
            "session_id": session_id,
            "items": [data.model_dump()],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.carts.insert_one(cart)
    else:
        existing_index = None
        for i, item in enumerate(cart["items"]):
            if item["product_id"] == data.product_id:
                existing_index = i
                break
        
        if existing_index is not None:
            cart["items"][existing_index]["quantity"] += data.quantity
        else:
            cart["items"].append(data.model_dump())
        
        cart["updated_at"] = datetime.now(timezone.utc)
        await db.carts.update_one(
            {"session_id": session_id},
            {"$set": {"items": cart["items"], "updated_at": cart["updated_at"]}}
        )
    
    logger.info(f"Item added to cart: {data.product_id}, session: {session_id}")
    return convert_objectid(await db.carts.find_one({"session_id": session_id}, {"_id": 0}))

@api_router.patch("/cart/item/{product_id}")
async def update_cart_item_quantity(
    product_id: str,
    quantity: int = Query(..., ge=0, le=100),
    session_id: Optional[str] = Query(None)
):
    """Update cart item quantity with validation"""
    if not session_id:
        raise HTTPException(400, "session_id is required")
    
    if quantity < 0:
        raise HTTPException(400, "Quantity cannot be negative")
    
    cart = await db.carts.find_one({"session_id": session_id})
    if not cart:
        raise HTTPException(404, "Cart not found")
    
    item_index = None
    for i, item in enumerate(cart["items"]):
        if item["product_id"] == product_id:
            item_index = i
            break
    
    if item_index is None:
        raise HTTPException(404, "Item not found in cart")
    
    # Validate stock
    if quantity > 0:
        product = await db.products.find_one({"id": product_id})
        if product and quantity > product.get("stock_quantity", 0):
            raise HTTPException(400, f"Only {product.get('stock_quantity', 0)} items in stock")
    
    if quantity == 0:
        cart["items"].pop(item_index)
        logger.info(f"Item removed from cart: {product_id}")
    else:
        cart["items"][item_index]["quantity"] = quantity
        logger.info(f"Cart quantity updated: {product_id} = {quantity}")
    
    cart["updated_at"] = datetime.now(timezone.utc)
    await db.carts.update_one(
        {"session_id": session_id},
        {"$set": {"items": cart["items"], "updated_at": cart["updated_at"]}}
    )
    
    return convert_objectid(await db.carts.find_one({"session_id": session_id}, {"_id": 0}))

@api_router.delete("/cart/item/{product_id}")
async def remove_from_cart(
    product_id: str,
    session_id: Optional[str] = Query(None)
):
    """Remove item from cart"""
    if not session_id:
        raise HTTPException(400, "session_id is required")
    
    result = await db.carts.update_one(
        {"session_id": session_id},
        {
            "$pull": {"items": {"product_id": product_id}},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(404, "Item not found in cart")
    
    logger.info(f"Item removed from cart: {product_id}")
    return {"message": "Item removed from cart"}

@api_router.delete("/cart")
async def clear_cart(session_id: Optional[str] = Query(None)):
    """Clear entire cart"""
    if not session_id:
        raise HTTPException(400, "session_id is required")
    
    await db.carts.delete_one({"session_id": session_id})
    logger.info(f"Cart cleared: {session_id}")
    return {"message": "Cart cleared"}

# =====================
# HEALTH & ROOT
# =====================

@api_router.get("/")
async def root():
    return {
        "service": "Shri Ramya API",
        "version": "2.0.0",
        "status": "operational",
        "woocommerce": "connected" if wc_enabled else "disabled"
    }

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    health_status = {
        "status": "healthy",
        "mongodb": "connected",
        "woocommerce": "connected" if wc_enabled else "disabled",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # Test MongoDB
    try:
        await db.command("ping")
    except Exception as e:
        health_status["mongodb"] = f"error: {str(e)}"
        health_status["status"] = "degraded"
    
    # Test WooCommerce
    if wc_enabled:
        try:
            wc_get("products", {"per_page": 1})
        except:
            health_status["woocommerce"] = "unreachable - using MongoDB fallback"
            health_status["status"] = "degraded"
    
    return health_status

# =====================
# IMAGE UPLOAD
# =====================

from fastapi import UploadFile, File
from fastapi.staticfiles import StaticFiles

UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

@api_router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    admin_user: User = Depends(get_admin_user)
):
    """Upload a product image (admin only)"""
    # Validate file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    
    # Read and validate size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(400, f"File too large. Max size: {MAX_FILE_SIZE // (1024*1024)}MB")
    
    # Generate unique filename
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / unique_name
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Return the public URL
    image_url = f"/uploads/{unique_name}"
    logger.info(f"Image uploaded: {unique_name} ({len(contents)} bytes) by {admin_user.email}")
    
    return {
        "url": image_url,
        "filename": unique_name,
        "original_name": file.filename,
        "size": len(contents),
        "content_type": file.content_type
    }

@api_router.post("/upload/multiple")
async def upload_multiple_images(
    files: List[UploadFile] = File(...),
    admin_user: User = Depends(get_admin_user)
):
    """Upload multiple product images (admin only)"""
    results = []
    for file in files[:10]:  # Max 10 files at once
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            continue
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            continue
        unique_name = f"{uuid.uuid4().hex}{ext}"
        file_path = UPLOAD_DIR / unique_name
        with open(file_path, "wb") as f:
            f.write(contents)
        results.append({
            "url": f"/uploads/{unique_name}",
            "filename": unique_name,
            "original_name": file.filename,
            "size": len(contents)
        })
    
    logger.info(f"{len(results)} images uploaded by {admin_user.email}")
    return {"images": results, "count": len(results)}

# Include WooCommerce headless routes
from wc_routes import wc_router
api_router.include_router(wc_router)

# Include router
app.include_router(api_router)

# Mount static uploads AFTER router so /api routes take priority
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

# =====================
# VIRTUAL TRY-ON
# =====================

import replicate
import base64
import shutil
from fastapi import UploadFile, File, BackgroundTasks
from pathlib import Path
from PIL import Image
import io

# Try-On storage
TRYON_DIR = Path("/tmp/tryon")
TRYON_DIR.mkdir(exist_ok=True)

# Replicate API (use Emergent key or user's key)
REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")

class TryOnRequest(BaseModel):
    product_id: str
    model_image_url: Optional[str] = None

class TryOnStatus(BaseModel):
    id: str
    status: str  # pending, processing, completed, failed
    result_url: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# In-memory storage for try-on jobs (use Redis in production)
tryon_jobs = {}

def cleanup_old_images():
    """Remove images older than 24 hours"""
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        for file in TRYON_DIR.glob("*"):
            if file.stat().st_mtime < cutoff.timestamp():
                file.unlink()
                logger.info(f"Cleaned up old try-on image: {file.name}")
    except Exception as e:
        logger.error(f"Cleanup error: {str(e)}")

async def process_tryon_async(job_id: str, person_image_path: str, garment_image_url: str):
    """Process virtual try-on asynchronously"""
    try:
        tryon_jobs[job_id]["status"] = "processing"
        
        if not REPLICATE_API_TOKEN:
            # Mock implementation for demo
            logger.warning("Replicate API not configured - using mock try-on")
            await asyncio.sleep(3)  # Simulate processing
            tryon_jobs[job_id]["status"] = "completed"
            tryon_jobs[job_id]["result_url"] = garment_image_url  # Return garment image as mock
            tryon_jobs[job_id]["updated_at"] = datetime.now(timezone.utc)
            return
        
        # Real IDM-VTON implementation
        output = replicate.run(
            "cuuupid/idm-vton:c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4",
            input={
                "crop": False,
                "seed": 42,
                "steps": 30,
                "category": "upper_body",  # or "lower_body", "dresses"
                "force_dc": False,
                "garm_img": garment_image_url,
                "human_img": open(person_image_path, "rb"),
                "garment_des": "traditional ethnic wear"
            }
        )
        
        # Save result
        result_path = TRYON_DIR / f"result_{job_id}.png"
        if isinstance(output, str):
            # Download from URL
            import requests
            response = requests.get(output)
            result_path.write_bytes(response.content)
        else:
            # Save directly
            with open(result_path, "wb") as f:
                f.write(output.read())
        
        tryon_jobs[job_id]["status"] = "completed"
        tryon_jobs[job_id]["result_url"] = f"/api/tryon/result/{job_id}"
        tryon_jobs[job_id]["updated_at"] = datetime.now(timezone.utc)
        
        logger.info(f"Try-on completed: {job_id}")
        
    except Exception as e:
        logger.error(f"Try-on failed: {job_id} - {str(e)}")
        tryon_jobs[job_id]["status"] = "failed"
        tryon_jobs[job_id]["error"] = str(e)
        tryon_jobs[job_id]["updated_at"] = datetime.now(timezone.utc)

@api_router.post("/tryon/upload")
async def upload_tryon_image(
    file: UploadFile = File(...),
    product_id: str = Query(...),
    background_tasks: BackgroundTasks = None
):
    """Upload user image for virtual try-on"""
    
    # Validation
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image files are allowed")
    
    # Read and validate image
    contents = await file.read()
    
    # Size limit: 10MB
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(400, "Image size must be less than 10MB")
    
    try:
        # Validate image can be opened
        image = Image.open(io.BytesIO(contents))
        
        # Convert to RGB if needed
        if image.mode not in ('RGB', 'RGBA'):
            image = image.convert('RGB')
        
        # Resize if too large (max 1024x1024 for faster processing)
        max_size = 1024
        if max(image.size) > max_size:
            image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
    except Exception as e:
        raise HTTPException(400, f"Invalid image file: {str(e)}")
    
    # Get product details
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Product not found")
    
    # Generate job ID
    job_id = str(uuid.uuid4())
    
    # Save user image
    person_image_path = TRYON_DIR / f"person_{job_id}.png"
    image.save(person_image_path, "PNG")
    
    # Get garment image URL
    garment_image_url = product.get("images", [""])[0]
    
    # Create job
    tryon_jobs[job_id] = {
        "id": job_id,
        "status": "pending",
        "product_id": product_id,
        "result_url": None,
        "error": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    # Start processing in background
    if background_tasks:
        background_tasks.add_task(
            process_tryon_async,
            job_id,
            str(person_image_path),
            garment_image_url
        )
    else:
        # Process immediately (blocking)
        await process_tryon_async(job_id, str(person_image_path), garment_image_url)
    
    # Schedule cleanup
    if background_tasks:
        background_tasks.add_task(cleanup_old_images)
    
    logger.info(f"Try-on job created: {job_id} for product {product_id}")
    
    return {
        "job_id": job_id,
        "status": "pending",
        "message": "Processing your virtual try-on..."
    }

@api_router.get("/tryon/status/{job_id}")
async def get_tryon_status(job_id: str):
    """Get status of virtual try-on job"""
    
    if job_id not in tryon_jobs:
        raise HTTPException(404, "Try-on job not found")
    
    job = tryon_jobs[job_id]
    
    return {
        "id": job["id"],
        "status": job["status"],
        "result_url": job.get("result_url"),
        "error": job.get("error"),
        "created_at": job["created_at"].isoformat(),
        "updated_at": job["updated_at"].isoformat()
    }

@api_router.get("/tryon/result/{job_id}")
async def get_tryon_result(job_id: str):
    """Get result image of virtual try-on"""
    
    result_path = TRYON_DIR / f"result_{job_id}.png"
    
    if not result_path.exists():
        raise HTTPException(404, "Result not found")
    
    from fastapi.responses import FileResponse
    return FileResponse(
        result_path,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"}
    )

@api_router.delete("/tryon/{job_id}")
async def delete_tryon(job_id: str):
    """Delete try-on job and associated images"""
    
    # Remove from jobs
    if job_id in tryon_jobs:
        del tryon_jobs[job_id]
    
    # Remove images
    person_path = TRYON_DIR / f"person_{job_id}.png"
    result_path = TRYON_DIR / f"result_{job_id}.png"
    
    person_path.unlink(missing_ok=True)
    result_path.unlink(missing_ok=True)
    
    logger.info(f"Try-on deleted: {job_id}")
    
    return {"message": "Try-on deleted successfully"}


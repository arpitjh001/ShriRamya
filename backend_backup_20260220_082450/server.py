from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import razorpay
import jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Razorpay client
razorpay_client = razorpay.Client(auth=(
    os.getenv('RAZORPAY_KEY_ID', 'rzp_test_dummy'),
    os.getenv('RAZORPAY_KEY_SECRET', 'dummy_secret')
))

# JWT Settings
SECRET_KEY = os.getenv('JWT_SECRET', 'shri-ramya-secret-key-2025')
ALGORITHM = "HS256"
security = HTTPBearer()

# Create the main app
app = FastAPI()
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
    addresses: List[Dict[str, Any]] = []
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
    token_type: str = "bearer"
    user: User

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    description: str
    price: float
    sale_price: Optional[float] = None
    category: str
    subcategory: Optional[str] = None
    images: List[str] = []
    variations: List[Dict[str, Any]] = []
    fabric: Optional[str] = None
    occasion: Optional[str] = None
    care_instructions: Optional[str] = None
    in_stock: bool = True
    stock_quantity: int = 100
    featured: bool = False
    trending: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CartItem(BaseModel):
    product_id: str
    quantity: int = 1
    variation: Optional[Dict[str, Any]] = None

class Cart(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    items: List[CartItem] = []
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WishlistItem(BaseModel):
    product_id: str
    added_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Wishlist(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    items: List[WishlistItem] = []

class OrderItem(BaseModel):
    product_id: str
    name: str
    price: float
    quantity: int
    variation: Optional[Dict[str, Any]] = None

class ShippingAddress(BaseModel):
    name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    pincode: str

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = Field(default_factory=lambda: f"ORD{uuid.uuid4().hex[:8].upper()}")
    user_id: Optional[str] = None
    email: str
    items: List[OrderItem] = []
    subtotal: float
    shipping: float
    discount: float = 0.0
    total: float
    payment_method: str
    payment_status: str = "pending"
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    shipping_address: ShippingAddress
    order_status: str = "processing"
    tracking_number: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CreateOrderRequest(BaseModel):
    items: List[CartItem]
    shipping_address: ShippingAddress
    email: str
    coupon_code: Optional[str] = None

class BlogPost(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    slug: str
    excerpt: str
    content: str
    image: str
    author: str
    category: str
    tags: List[str] = []
    published_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# =====================
# AUTH HELPERS
# =====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=30)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[User]:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            return None
        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if user_doc:
            return User(**user_doc)
        return None
    except:
        return None

# =====================
# AUTH ROUTES
# =====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
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
    
    token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=token, user=user)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_doc.pop('password')
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user = User(**user_doc)
    token = create_access_token({"sub": user.id})
    return TokenResponse(access_token=token, user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return current_user

# =====================
# PRODUCT ROUTES
# =====================

@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    featured: Optional[bool] = None,
    trending: Optional[bool] = None,
    limit: int = 50
):
    query = {}
    if category:
        query['category'] = category
    if subcategory:
        query['subcategory'] = subcategory
    if featured is not None:
        query['featured'] = featured
    if trending is not None:
        query['trending'] = trending
    
    products = await db.products.find(query, {"_id": 0}).limit(limit).to_list(limit)
    for product in products:
        if isinstance(product.get('created_at'), str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if isinstance(product.get('created_at'), str):
        product['created_at'] = datetime.fromisoformat(product['created_at'])
    return Product(**product)

@api_router.get("/categories")
async def get_categories():
    categories = await db.products.distinct("category")
    return {"categories": categories}

# =====================
# CART ROUTES
# =====================

@api_router.post("/cart", response_model=Cart)
async def add_to_cart(
    cart_item: CartItem,
    session_id: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user)
):
    user_id = current_user.id if current_user else None
    
    cart_query = {"user_id": user_id} if user_id else {"session_id": session_id}
    cart_doc = await db.carts.find_one(cart_query, {"_id": 0})
    
    if cart_doc:
        if isinstance(cart_doc.get('updated_at'), str):
            cart_doc['updated_at'] = datetime.fromisoformat(cart_doc['updated_at'])
        cart = Cart(**cart_doc)
        
        existing_item = next((item for item in cart.items if item.product_id == cart_item.product_id), None)
        if existing_item:
            existing_item.quantity += cart_item.quantity
        else:
            cart.items.append(cart_item)
    else:
        cart = Cart(
            user_id=user_id,
            session_id=session_id,
            items=[cart_item]
        )
    
    cart.updated_at = datetime.now(timezone.utc)
    cart_dict = cart.model_dump()
    cart_dict['updated_at'] = cart_dict['updated_at'].isoformat()
    
    await db.carts.update_one(
        cart_query,
        {"$set": cart_dict},
        upsert=True
    )
    
    return cart

@api_router.get("/cart", response_model=Cart)
async def get_cart(
    session_id: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user)
):
    user_id = current_user.id if current_user else None
    cart_query = {"user_id": user_id} if user_id else {"session_id": session_id}
    
    cart_doc = await db.carts.find_one(cart_query, {"_id": 0})
    if not cart_doc:
        return Cart(user_id=user_id, session_id=session_id, items=[])
    
    if isinstance(cart_doc.get('updated_at'), str):
        cart_doc['updated_at'] = datetime.fromisoformat(cart_doc['updated_at'])
    return Cart(**cart_doc)

@api_router.delete("/cart/item/{product_id}")
async def remove_from_cart(
    product_id: str,
    session_id: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user)
):
    user_id = current_user.id if current_user else None
    cart_query = {"user_id": user_id} if user_id else {"session_id": session_id}
    
    await db.carts.update_one(
        cart_query,
        {"$pull": {"items": {"product_id": product_id}}}
    )
    
    return {"message": "Item removed from cart"}

@api_router.delete("/cart")
async def clear_cart(
    session_id: Optional[str] = None,
    current_user: Optional[User] = Depends(get_current_user)
):
    user_id = current_user.id if current_user else None
    cart_query = {"user_id": user_id} if user_id else {"session_id": session_id}
    
    await db.carts.delete_one(cart_query)
    return {"message": "Cart cleared"}

# =====================
# WISHLIST ROUTES
# =====================

@api_router.post("/wishlist/{product_id}")
async def add_to_wishlist(product_id: str, current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Please login to add to wishlist")
    
    wishlist_doc = await db.wishlists.find_one({"user_id": current_user.id}, {"_id": 0})
    
    if wishlist_doc:
        wishlist = Wishlist(**wishlist_doc)
        if not any(item.product_id == product_id for item in wishlist.items):
            wishlist.items.append(WishlistItem(product_id=product_id))
    else:
        wishlist = Wishlist(user_id=current_user.id, items=[WishlistItem(product_id=product_id)])
    
    wishlist_dict = wishlist.model_dump()
    for item in wishlist_dict['items']:
        if isinstance(item['added_at'], datetime):
            item['added_at'] = item['added_at'].isoformat()
    
    await db.wishlists.update_one(
        {"user_id": current_user.id},
        {"$set": wishlist_dict},
        upsert=True
    )
    
    return {"message": "Added to wishlist"}

@api_router.get("/wishlist", response_model=Wishlist)
async def get_wishlist(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Please login")
    
    wishlist_doc = await db.wishlists.find_one({"user_id": current_user.id}, {"_id": 0})
    if not wishlist_doc:
        return Wishlist(user_id=current_user.id, items=[])
    
    for item in wishlist_doc['items']:
        if isinstance(item['added_at'], str):
            item['added_at'] = datetime.fromisoformat(item['added_at'])
    
    return Wishlist(**wishlist_doc)

@api_router.delete("/wishlist/{product_id}")
async def remove_from_wishlist(product_id: str, current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Please login")
    
    await db.wishlists.update_one(
        {"user_id": current_user.id},
        {"$pull": {"items": {"product_id": product_id}}}
    )
    
    return {"message": "Removed from wishlist"}

# =====================
# ORDER ROUTES
# =====================

@api_router.post("/orders/create")
async def create_order(order_request: CreateOrderRequest, current_user: Optional[User] = Depends(get_current_user)):
    # Calculate totals
    subtotal = 0.0
    order_items = []
    
    for item in order_request.items:
        product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        
        price = product.get('sale_price', product['price'])
        subtotal += price * item.quantity
        
        order_items.append(OrderItem(
            product_id=item.product_id,
            name=product['name'],
            price=price,
            quantity=item.quantity,
            variation=item.variation
        ))
    
    shipping = 0 if subtotal > 999 else 99
    discount = 0.0
    total = subtotal + shipping - discount
    
    # Create Razorpay order
    try:
        razorpay_order = razorpay_client.order.create({
            "amount": int(total * 100),
            "currency": "INR",
            "payment_capture": 1
        })
        razorpay_order_id = razorpay_order['id']
    except:
        razorpay_order_id = f"order_{uuid.uuid4().hex[:12]}"
    
    order = Order(
        user_id=current_user.id if current_user else None,
        email=order_request.email,
        items=order_items,
        subtotal=subtotal,
        shipping=shipping,
        discount=discount,
        total=total,
        payment_method="razorpay",
        razorpay_order_id=razorpay_order_id,
        shipping_address=order_request.shipping_address
    )
    
    order_dict = order.model_dump()
    order_dict['created_at'] = order_dict['created_at'].isoformat()
    order_dict['updated_at'] = order_dict['updated_at'].isoformat()
    
    await db.orders.insert_one(order_dict)
    
    return {
        "order_id": order.id,
        "order_number": order.order_number,
        "razorpay_order_id": razorpay_order_id,
        "amount": int(total * 100),
        "currency": "INR",
        "razorpay_key_id": os.getenv('RAZORPAY_KEY_ID', 'rzp_test_dummy')
    }

@api_router.post("/orders/{order_id}/payment")
async def confirm_payment(order_id: str, payment_data: Dict[str, Any]):
    order_doc = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order_doc:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "payment_status": "paid",
                "razorpay_payment_id": payment_data.get('razorpay_payment_id'),
                "order_status": "confirmed",
                "tracking_number": f"TRK{uuid.uuid4().hex[:10].upper()}",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Payment confirmed", "order_id": order_id}

@api_router.get("/orders", response_model=List[Order])
async def get_orders(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Please login")
    
    orders = await db.orders.find({"user_id": current_user.id}, {"_id": 0}).to_list(100)
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if isinstance(order.get('updated_at'), str):
            order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    
    return orders

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if isinstance(order.get('created_at'), str):
        order['created_at'] = datetime.fromisoformat(order['created_at'])
    if isinstance(order.get('updated_at'), str):
        order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    
    return Order(**order)

@api_router.get("/orders/track/{order_number}")
async def track_order(order_number: str):
    order = await db.orders.find_one({"order_number": order_number}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {
        "order_number": order['order_number'],
        "status": order['order_status'],
        "tracking_number": order.get('tracking_number'),
        "created_at": order['created_at']
    }

# =====================
# BLOG ROUTES
# =====================

@api_router.get("/blog", response_model=List[BlogPost])
async def get_blog_posts(category: Optional[str] = None, limit: int = 10):
    query = {}
    if category:
        query['category'] = category
    
    posts = await db.blog_posts.find(query, {"_id": 0}).limit(limit).to_list(limit)
    for post in posts:
        if isinstance(post.get('published_at'), str):
            post['published_at'] = datetime.fromisoformat(post['published_at'])
    return posts

@api_router.get("/blog/{slug}", response_model=BlogPost)
async def get_blog_post(slug: str):
    post = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    if isinstance(post.get('published_at'), str):
        post['published_at'] = datetime.fromisoformat(post['published_at'])
    return BlogPost(**post)

# =====================
# RECOMMENDATIONS
# =====================

@api_router.get("/recommendations/{product_id}", response_model=List[Product])
async def get_recommendations(product_id: str, limit: int = 4):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        return []
    
    # Simple recommendation: same category, different product
    recommendations = await db.products.find(
        {"category": product['category'], "id": {"$ne": product_id}},
        {"_id": 0}
    ).limit(limit).to_list(limit)
    
    for rec in recommendations:
        if isinstance(rec.get('created_at'), str):
            rec['created_at'] = datetime.fromisoformat(rec['created_at'])
    
    return recommendations

# =====================
# HEALTH CHECK
# =====================

@api_router.get("/")
async def root():
    return {"message": "Shri Ramya API - Headless eCommerce Backend"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Shri Ramya eCommerce API"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

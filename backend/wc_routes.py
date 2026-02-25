"""
WooCommerce Headless API Routes
Product management, order management, customer sync, coupons
All mutating endpoints (POST/PUT/DELETE) require admin authentication
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import logging
import os
import jwt

logger = logging.getLogger("shriramya.wc_routes")

wc_router = APIRouter(prefix="/wc", tags=["WooCommerce"])

# Security for admin-only routes
_security = HTTPBearer()


# =====================
# PYDANTIC MODELS
# =====================

class WCProductCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str = Field(..., min_length=2)
    description: str = ""
    short_description: str = ""
    regular_price: float = Field(..., gt=0)
    sale_price: Optional[float] = None
    sku: Optional[str] = None
    stock_quantity: int = Field(0, ge=0)
    categories: List[Any] = []
    images: List[Any] = []
    tags: List[str] = []
    status: str = "publish"
    # Ethnic wear specific
    fabric: Optional[str] = None
    craft_style: Optional[str] = None
    state_of_origin: Optional[str] = None
    occasion: Optional[str] = None
    care_instructions: Optional[str] = None
    size_stock: Optional[List[Any]] = None
    color_stock: Optional[List[Any]] = None


class WCProductUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    regular_price: Optional[float] = None
    sale_price: Optional[float] = None
    sku: Optional[str] = None
    stock_quantity: Optional[int] = None
    categories: Optional[List[Any]] = None
    images: Optional[List[Any]] = None
    status: Optional[str] = None
    size_stock: Optional[List[Any]] = None
    color_stock: Optional[List[Any]] = None


class WCCategoryCreate(BaseModel):
    name: str = Field(..., min_length=2)
    parent: int = 0
    description: str = ""
    image_src: Optional[str] = None


class WCOrderCreate(BaseModel):
    items: List[Dict[str, Any]]
    billing: Dict[str, Any]
    shipping: Dict[str, Any]
    customer_id: int = 0
    coupon_codes: List[str] = []
    payment_method: str = "razorpay"


class WCCustomerCreate(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1)
    last_name: str = ""
    password: Optional[str] = None
    billing: Optional[Dict[str, Any]] = None
    shipping: Optional[Dict[str, Any]] = None


class WCCouponCreate(BaseModel):
    code: str = Field(..., min_length=3)
    discount_type: str = "percent"
    amount: str = "10"
    description: str = ""
    usage_limit: Optional[int] = None
    expiry_date: Optional[str] = None


class WCOrderStatusUpdate(BaseModel):
    status: str


class WCPaymentConfirm(BaseModel):
    transaction_id: str


# =====================
# DEPENDENCY INJECTION
# =====================

def get_wc_service():
    from woocommerce_service import wc_service
    if not wc_service.enabled:
        raise HTTPException(503, "WooCommerce is not configured. Set WOOCOMMERCE_URL, CONSUMER_KEY, CONSUMER_SECRET.")
    return wc_service


async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(_security)):
    """Require authenticated admin user for WooCommerce management routes"""
    try:
        token = credentials.credentials
        SECRET_KEY = os.getenv('JWT_SECRET', 'shri-ramya-secret-key-2025')
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        user_role = payload.get("role", "customer")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        if user_role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

        return {"user_id": user_id, "role": user_role}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")


# =====================
# PRODUCT ROUTES
# =====================

@wc_router.get("/products")
async def wc_list_products(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category: Optional[int] = None,
    search: Optional[str] = None,
    featured: Optional[bool] = None,
    on_sale: Optional[bool] = None,
    wc=Depends(get_wc_service),
    admin=Depends(require_admin)
):
    """List products from WooCommerce"""
    products = wc.get_products(
        per_page=per_page, page=page, category=category,
        search=search, featured=featured, on_sale=on_sale
    )
    return {"products": products, "page": page, "per_page": per_page}


@wc_router.get("/products/{product_id}")
async def wc_get_product(product_id: int, wc=Depends(get_wc_service), admin=Depends(require_admin)):
    """Get single product from WooCommerce"""
    product = wc.get_product(product_id)
    if not product:
        raise HTTPException(404, "Product not found in WooCommerce")
    return product


@wc_router.post("/products", status_code=status.HTTP_201_CREATED)
async def wc_create_product(data: WCProductCreate, wc=Depends(get_wc_service), admin=Depends(require_admin)):
    """Create a new product in WooCommerce"""
    product_data = data.model_dump(exclude_none=True)
    product_data["price"] = product_data.pop("regular_price", 0)
    result = wc.create_product(product_data)
    if not result:
        raise HTTPException(500, "Failed to create product in WooCommerce")
    logger.info(f"Product created in WC: {result.get('id')} - {data.name}")
    return result


@wc_router.put("/products/{product_id}")
async def wc_update_product(product_id: int, data: WCProductUpdate, wc=Depends(get_wc_service), admin=Depends(require_admin)):
    """Update an existing WooCommerce product"""
    update_data = data.model_dump(exclude_none=True)
    if "regular_price" in update_data:
        update_data["price"] = update_data.pop("regular_price")
    result = wc.update_product(product_id, update_data)
    if not result:
        raise HTTPException(500, "Failed to update product")
    logger.info(f"Product updated in WC: {product_id}")
    return result


@wc_router.delete("/products/{product_id}")
async def wc_delete_product(product_id: int, wc=Depends(get_wc_service), admin=Depends(require_admin)):
    """Delete a product from WooCommerce"""
    result = wc.delete_product(product_id)
    if not result:
        raise HTTPException(500, "Failed to delete product")
    logger.info(f"Product deleted from WC: {product_id}")
    return {"message": "Product deleted", "id": product_id}


# =====================
# CATEGORY ROUTES
# =====================

@wc_router.get("/categories")
async def wc_list_categories(wc=Depends(get_wc_service), admin=Depends(require_admin)):
    """List all WooCommerce categories"""
    return {"categories": wc.get_categories()}


@wc_router.post("/categories", status_code=status.HTTP_201_CREATED)
async def wc_create_category(data: WCCategoryCreate, wc=Depends(get_wc_service), admin=Depends(require_admin)):
    """Create a new product category"""
    result = wc.create_category(data.name, data.parent, data.description, data.image_src)
    if not result:
        raise HTTPException(500, "Failed to create category")
    return result


@wc_router.delete("/categories/{cat_id}")
async def wc_delete_category(cat_id: int, wc=Depends(get_wc_service), admin=Depends(require_admin)):
    """Delete a category"""
    result = wc.delete_category(cat_id)
    if not result:
        raise HTTPException(500, "Failed to delete category")
    return {"message": "Category deleted", "id": cat_id}


# =====================
# ORDER ROUTES
# =====================

@wc_router.get("/orders")
async def wc_list_orders(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    wc=Depends(get_wc_service),
    admin=Depends(require_admin)
):
    """List orders from WooCommerce"""
    orders = wc.get_orders(per_page=per_page, page=page, status=status, customer_id=customer_id)
    return {"orders": orders, "page": page}


@wc_router.get("/orders/{order_id}")
async def wc_get_order(order_id: int, wc=Depends(get_wc_service), admin=Depends(require_admin)):
    """Get single order from WooCommerce"""
    order = wc.get_order(order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    return order


@wc_router.post("/orders", status_code=status.HTTP_201_CREATED)
async def wc_create_order(data: WCOrderCreate, wc=Depends(get_wc_service), admin=Depends(require_admin)):
    """Create a new order in WooCommerce"""
    result = wc.create_order(
        items=data.items, billing=data.billing, shipping=data.shipping,
        customer_id=data.customer_id, coupon_lines=data.coupon_codes,
        payment_method=data.payment_method
    )
    if not result:
        raise HTTPException(500, "Failed to create order")
    logger.info(f"Order created in WC: {result.get('id')}")
    return result


@wc_router.patch("/orders/{order_id}/status")
async def wc_update_order_status(order_id: int, data: WCOrderStatusUpdate, wc=Depends(get_wc_service), admin=Depends(require_admin)):
    """Update order status"""
    result = wc.update_order_status(order_id, data.status)
    if not result:
        raise HTTPException(500, "Failed to update order status")
    return result


@wc_router.post("/orders/{order_id}/paid")
async def wc_mark_order_paid(order_id: int, data: WCPaymentConfirm, wc=Depends(get_wc_service), admin=Depends(require_admin)):
    """Mark an order as paid after payment confirmation"""
    result = wc.mark_order_paid(order_id, data.transaction_id)
    if not result:
        raise HTTPException(500, "Failed to mark order as paid")
    logger.info(f"Order {order_id} marked paid, txn: {data.transaction_id}")
    return result


@wc_router.post("/orders/{order_id}/notes")
async def wc_add_order_note(order_id: int, note: str = Query(...), wc=Depends(get_wc_service), admin=Depends(require_admin)):
    """Add a note to an order"""
    result = wc.add_order_note(order_id, note)
    if not result:
        raise HTTPException(500, "Failed to add note")
    return result


# =====================
# CUSTOMER ROUTES
# =====================

@wc_router.get("/customers")
async def wc_list_customers(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    wc=Depends(get_wc_service),
    admin=Depends(require_admin)
):
    """List WooCommerce customers"""
    customers = wc.get_customers(per_page=per_page, page=page, search=search)
    return {"customers": customers, "page": page}


@wc_router.get("/customers/{customer_id}")
async def wc_get_customer(customer_id: int, wc=Depends(get_wc_service), admin=Depends(require_admin)):
    """Get single customer"""
    customer = wc.get_customer(customer_id)
    if not customer:
        raise HTTPException(404, "Customer not found")
    return customer


@wc_router.post("/customers", status_code=status.HTTP_201_CREATED)
async def wc_create_customer(data: WCCustomerCreate, wc=Depends(get_wc_service), admin=Depends(require_admin)):
    """Create/sync a customer to WooCommerce"""
    existing = wc.get_customer_by_email(data.email)
    if existing:
        raise HTTPException(409, f"Customer with email {data.email} already exists in WooCommerce")
    result = wc.create_customer(
        email=data.email, first_name=data.first_name,
        last_name=data.last_name, password=data.password,
        billing=data.billing, shipping=data.shipping
    )
    if not result:
        raise HTTPException(500, "Failed to create customer")
    logger.info(f"Customer synced to WC: {data.email}")
    return result


@wc_router.put("/customers/{customer_id}")
async def wc_update_customer(customer_id: int, data: dict, wc=Depends(get_wc_service), admin=Depends(require_admin)):
    """Update customer in WooCommerce"""
    result = wc.update_customer(customer_id, data)
    if not result:
        raise HTTPException(500, "Failed to update customer")
    return result


@wc_router.get("/customers/lookup/{email}")
async def wc_lookup_customer(email: str, wc=Depends(get_wc_service), admin=Depends(require_admin)):
    """Find customer by email"""
    customer = wc.get_customer_by_email(email)
    if not customer:
        raise HTTPException(404, "Customer not found")
    return customer


# =====================
# COUPON ROUTES
# =====================

@wc_router.get("/coupons")
async def wc_list_coupons(wc=Depends(get_wc_service), admin=Depends(require_admin)):
    """List all coupons"""
    return {"coupons": wc.get_coupons()}


@wc_router.post("/coupons", status_code=status.HTTP_201_CREATED)
async def wc_create_coupon(data: WCCouponCreate, wc=Depends(get_wc_service), admin=Depends(require_admin)):
    """Create a coupon"""
    result = wc.create_coupon(
        code=data.code, discount_type=data.discount_type,
        amount=data.amount, description=data.description,
        usage_limit=data.usage_limit, expiry_date=data.expiry_date
    )
    if not result:
        raise HTTPException(500, "Failed to create coupon")
    return result


@wc_router.get("/coupons/validate/{code}")
async def wc_validate_coupon(code: str, wc=Depends(get_wc_service), admin=Depends(require_admin)):
    """Validate a coupon code"""
    return wc.validate_coupon(code)


# =====================
# REPORTS
# =====================

@wc_router.get("/reports/sales")
async def wc_sales_report(period: str = Query("month"), wc=Depends(get_wc_service), admin=Depends(require_admin)):
    """Get sales report"""
    return wc.get_sales_report(period)


@wc_router.get("/reports/top-sellers")
async def wc_top_sellers(period: str = Query("month"), wc=Depends(get_wc_service), admin=Depends(require_admin)):
    """Get top selling products"""
    return wc.get_top_sellers(period)

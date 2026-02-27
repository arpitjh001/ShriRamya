from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
import sys

from .core.config import settings
from .core.logging import setup_logging
from .core.exceptions import (
    AppException, 
    app_exception_handler, 
    http_exception_handler, 
    general_exception_handler
)
from .db.mongo import db_client
from .db.mysql import mysql_client
from .integrations.woocommerce_client import wc_client
from .api.v1 import auth, products, webhooks, orders, customers, cart, coupons, blog, upload
from .core.response import success_response

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    db_client.connect()
    await mysql_client.connect()
    yield
    # Shutdown
    db_client.close()
    await mysql_client.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# Exception Handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Files
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Health Check
@app.get("/health")
async def health_check():
    # 1. Check MongoDB
    mongo_status = "ok" if db_client.db is not None else "error"
    
    # 2. Check MySQL
    mysql_ping = await mysql_client.ping()
    mysql_status = "ok" if mysql_ping else "error"
    
    # 3. Check WooCommerce (Basic connectivity test)
    wc_status = "ok"
    try:
        # Just check if we can reach the base categories (usually safe and lightweight)
        res = await wc_client.get_categories(params={"per_page": 1})
        if isinstance(res, dict) and res.get("error"):
            wc_status = f"error: {res.get('detail')}"
    except Exception as e:
        wc_status = f"error: {str(e)}"

    overall_success = mongo_status == "ok" and mysql_status == "ok" and "error" not in wc_status

    return {
        "success": overall_success,
        "timestamp": settings.VERSION,
        "services": {
            "mongodb": mongo_status,
            "mysql": mysql_status,
            "woocommerce": wc_status,
            "api_version": settings.VERSION
        }
    }

# Add Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(products.router, prefix=f"{settings.API_V1_STR}/products", tags=["Product Catalog"])
app.include_router(webhooks.router, prefix=f"{settings.API_V1_STR}/webhooks", tags=["Webhooks"])
app.include_router(orders.router, prefix=f"{settings.API_V1_STR}/orders", tags=["Orders"])
app.include_router(customers.router, prefix=f"{settings.API_V1_STR}/customers", tags=["Customers"])
app.include_router(cart.router, prefix=f"{settings.API_V1_STR}/cart", tags=["Cart"])
app.include_router(coupons.router, prefix=f"{settings.API_V1_STR}/coupons", tags=["Coupons"])
app.include_router(blog.router, prefix=f"{settings.API_V1_STR}/blog", tags=["Blog"])
app.include_router(upload.router, prefix=f"{settings.API_V1_STR}/upload", tags=["Upload"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app", 
        host=settings.HOST, 
        port=settings.PORT, 
        reload=True
    )

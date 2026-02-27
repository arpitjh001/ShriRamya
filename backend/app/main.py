from fastapi import FastAPI, HTTPException
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
from .api.v1 import auth, products, webhooks, orders, customers, cart, coupons, blog
from .core.response import success_response

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    db_client.connect()
    yield
    # Shutdown
    db_client.close()

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

# Health Check
@app.get("/health")
async def health_check():
    return success_response(data={
        "status": "operational",
        "version": settings.VERSION,
        "database": "connected" if db_client.db is not None else "disconnected"
    })

# Add Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(products.router, prefix=f"{settings.API_V1_STR}/products", tags=["Product Catalog"])
app.include_router(webhooks.router, prefix=f"{settings.API_V1_STR}/webhooks", tags=["Webhooks"])
app.include_router(orders.router, prefix=f"{settings.API_V1_STR}/orders", tags=["Orders"])
app.include_router(customers.router, prefix=f"{settings.API_V1_STR}/customers", tags=["Customers"])
app.include_router(cart.router, prefix=f"{settings.API_V1_STR}/cart", tags=["Cart"])
app.include_router(coupons.router, prefix=f"{settings.API_V1_STR}/coupons", tags=["Coupons"])
app.include_router(blog.router, prefix=f"{settings.API_V1_STR}/blog", tags=["Blog"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app", 
        host=settings.HOST, 
        port=settings.PORT, 
        reload=True
    )

from fastapi import APIRouter, Request, Header, HTTPException
from ...core.logging import logger
from ...services.order_service import order_service
from ...core.response import success_response
from ...core.config import settings

router = APIRouter()

@router.post("/razorpay")
async def razorpay_webhook(request: Request, x_razorpay_signature: str = Header(None)):
    body = await request.body()
    # verify signature if settings.RAZORPAY_WEBHOOK_SECRET is set
    # For now, we log and acknowledge
    logger.info("Razorpay Webhook Received")
    # Implementation for event handling (e.g. order.paid)
    return success_response(message="Webhook acknowledged")

@router.post("/woocommerce")
async def woocommerce_webhook(request: Request):
    # WooCommerce webhooks for order updates/inventory sync
    logger.info("WooCommerce Webhook Received")
    return success_response(message="Webhook acknowledged")

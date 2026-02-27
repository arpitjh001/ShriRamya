import razorpay
import logging
from ..core.config import settings

logger = logging.getLogger("shriramya.integrations.razorpay")

class RazorpayClient:
    def __init__(self):
        self.client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )

    def create_order(self, amount: int, currency: str = "INR", receipt: str = None, notes: dict = None):
        """Amount in paise (100 paise = 1 INR)"""
        data = {
            "amount": amount,
            "currency": currency,
            "receipt": receipt,
            "notes": notes or {}
        }
        try:
            return self.client.order.create(data=data)
        except Exception as e:
            logger.error(f"Razorpay Order Creation Failed: {str(e)}")
            return None

    def verify_payment_signature(self, params_dict: dict):
        try:
            return self.client.utility.verify_payment_signature(params_dict)
        except Exception:
            return False

razorpay_client = RazorpayClient()

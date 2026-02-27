from typing import Dict, Any, List, Optional
from ..integrations.woocommerce_client import wc_client
from ..integrations.razorpay_client import razorpay_client
from ..db.mongo import db_client
from ..core.exceptions import AppException

class OrderService:
    async def create_payment_intent(self, user_id: str, billing_info: dict, shipping_info: dict, items: List[dict]):
        # 1. Create order in WooCommerce (status: pending)
        wc_order_data = {
            "status": "pending",
            "billing": billing_info,
            "shipping": shipping_info,
            "line_items": items,
            "meta_data": [{"key": "_customer_user_id", "value": user_id}]
        }
        wc_order = await wc_client.create_order(wc_order_data)
        if "error" in wc_order:
            raise AppException(message=f"WooCommerce Order Creation Failed: {wc_order.get('detail')}")

        # 2. Create Razorpay order
        amount = int(float(wc_order["total"]) * 100) # in paise
        rz_order = razorpay_client.create_order(
            amount=amount,
            currency="INR",
            receipt=str(wc_order["id"]),
            notes={"wc_order_id": wc_order["id"], "user_id": user_id}
        )
        if not rz_order:
            raise AppException(message="Razorpay Order Creation Failed")

        # 3. Store Order Metadata in MongoDB
        order_record = {
            "wc_order_id": wc_order["id"],
            "rz_order_id": rz_order["id"],
            "user_id": user_id,
            "status": "awaiting_payment",
            "total": wc_order["total"]
        }
        await db_client.db.orders.insert_one(order_record)

        return {
            "rz_order_id": rz_order["id"],
            "wc_order_id": wc_order["id"],
            "amount": amount,
            "currency": "INR"
        }

    async def complete_order(self, rz_payment_id: str, rz_order_id: str, rz_signature: str):
        # 1. Verify Razorpay Signature
        params = {
            'razorpay_order_id': rz_order_id,
            'razorpay_payment_id': rz_payment_id,
            'razorpay_signature': rz_signature
        }
        if not razorpay_client.verify_payment_signature(params):
            raise AppException(message="Invalid Payment Signature")

        # 2. Find internal order
        order = await db_client.db.orders.find_one({"rz_order_id": rz_order_id})
        if not order:
            raise AppException(message="Order Not Found")

        # 3. Mark WooCommerce order as paid
        await wc_client.update_order(order["wc_order_id"], {"status": "processing", "set_paid": True})

        # 4. Update internal order status
        await db_client.db.orders.update_one(
            {"rz_order_id": rz_order_id},
            {"$set": {"status": "paid", "rz_payment_id": rz_payment_id}}
        )

        return {"success": True, "wc_order_id": order["wc_order_id"]}

    def _handle_response(self, response: Dict) -> Dict:
        if isinstance(response, dict) and response.get("error"):
            raise AppException(message=response.get("detail", "WooCommerce Error"))
        return response

    async def get_all_orders(self, user_id: Optional[str] = None) -> List[Dict]:
        params = {}
        if user_id:
            params["customer"] = int(user_id)
        res = await wc_client.get_orders(params)
        if isinstance(res, dict) and res.get("error"):
            return []
        return res

    async def get_order_by_id(self, order_id: int, user_id: Optional[str] = None) -> Dict:
        order = self._handle_response(await wc_client.get_order(order_id))
        if user_id and str(order.get("customer_id")) != str(user_id):
            raise AppException(message="Not authorized to view this order")
        return order

    async def create_wc_order(self, data: Dict) -> Dict:
        return self._handle_response(await wc_client.create_order(data))
    
    async def update_wc_order(self, order_id: int, data: Dict) -> Dict:
        return self._handle_response(await wc_client.update_order(order_id, data))

    async def delete_wc_order(self, order_id: int) -> Dict:
        return self._handle_response(await wc_client.delete_order(order_id))

order_service = OrderService()

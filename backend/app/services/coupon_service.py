from typing import Dict, List
from ..integrations.woocommerce_client import wc_client
from ..core.exceptions import AppException

class CouponService:
    def _handle_response(self, response: Dict) -> Dict:
        if isinstance(response, dict) and response.get("error"):
            raise AppException(message=response.get("detail", "WooCommerce Coupon Error"))
        return response

    async def get_all_coupons(self) -> List[Dict]:
        res = wc_client.get_coupons()
        if isinstance(res, dict) and res.get("error"):
            return []
        return res

    async def get_coupon_by_id(self, coupon_id: int) -> Dict:
        return self._handle_response(wc_client.get_coupon(coupon_id))

    async def create_coupon(self, data: Dict) -> Dict:
        return self._handle_response(wc_client.create_coupon(data))
    
    async def update_coupon(self, coupon_id: int, data: Dict) -> Dict:
        return self._handle_response(wc_client.update_coupon(coupon_id, data))

    async def delete_coupon(self, coupon_id: int) -> Dict:
        return self._handle_response(wc_client.delete_coupon(coupon_id))

coupon_service = CouponService()

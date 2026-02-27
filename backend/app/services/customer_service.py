from typing import Dict, Any, List, Optional
from ..integrations.woocommerce_client import wc_client
from ..core.exceptions import AppException

class CustomerService:
    def _handle_response(self, response: Dict) -> Dict:
        if isinstance(response, dict) and response.get("error"):
            raise AppException(message=response.get("detail", "WooCommerce Customer Error"))
        return response

    async def get_all_customers(self, role: str = "customer", email: Optional[str] = None) -> List[Dict]:
        params = {"role": role}
        if email:
            params["email"] = email
        res = wc_client.get_customers(params)
        if isinstance(res, dict) and res.get("error"):
            return []
        return res

    async def get_customer_by_id(self, customer_id: int) -> Dict:
        return self._handle_response(wc_client.get_customer(customer_id))

    async def create_customer(self, data: Dict) -> Dict:
        return self._handle_response(wc_client.create_customer(data))
    
    async def update_customer(self, customer_id: int, data: Dict) -> Dict:
        return self._handle_response(wc_client.update_customer(customer_id, data))

    async def delete_customer(self, customer_id: int) -> Dict:
        return self._handle_response(wc_client.delete_customer(customer_id))

customer_service = CustomerService()

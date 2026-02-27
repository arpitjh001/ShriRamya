import requests
from requests.auth import HTTPBasicAuth
import logging
from typing import Optional, Dict, Any, List
from ..core.config import settings

logger = logging.getLogger("shriramya.integrations.woocommerce")

class WooCommerceClient:
    def __init__(self):
        self.base_url = f"{settings.WOOCOMMERCE_URL.rstrip('/')}/wp-json/wc/v3"
        self.auth = HTTPBasicAuth(settings.WOOCOMMERCE_CONSUMER_KEY, settings.WOOCOMMERCE_CONSUMER_SECRET)
        self.verify = settings.WOOCOMMERCE_VERIFY_SSL
        self.headers = {"X-Forwarded-Proto": "https"}

    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        try:
            response = requests.request(
                method=method,
                url=url,
                auth=self.auth,
                verify=self.verify,
                headers=self.headers,
                timeout=30,
                **kwargs
            )
            if response.status_code >= 400:
                logger.error(f"WooCommerce API Error [{response.status_code}] at {endpoint}: {response.text}")
                return {"error": True, "status_code": response.status_code, "detail": response.text}
            return response.json()
        except Exception as e:
            logger.error(f"WooCommerce Connection Error: {str(e)}")
            return {"error": True, "detail": str(e), "status_code": 502}

    def get_products(self, params: Optional[Dict] = None) -> List[Dict]:
        return self._request("GET", "products", params=params)

    def get_product(self, product_id: int) -> Dict:
        return self._request("GET", f"products/{product_id}")

    def create_category(self, data: Dict) -> Dict:
        return self._request("POST", "products/categories", json=data)

    def get_categories(self, params: Optional[Dict] = None) -> List[Dict]:
        return self._request("GET", "products/categories", params=params)

    def create_product(self, data: Dict) -> Dict:
        return self._request("POST", "products", json=data)

    def update_product(self, product_id: int, data: Dict) -> Dict:
        return self._request("PUT", f"products/{product_id}", json=data)

    def delete_product(self, product_id: int) -> Dict:
        return self._request("DELETE", f"products/{product_id}", params={"force": True})

    def update_category(self, category_id: int, data: Dict) -> Dict:
        return self._request("PUT", f"products/categories/{category_id}", json=data)

    def delete_category(self, category_id: int) -> Dict:
        return self._request("DELETE", f"products/categories/{category_id}", params={"force": True})

    def create_order(self, data: Dict) -> Dict:
        return self._request("POST", "orders", json=data)

    def get_orders(self, params: Optional[Dict] = None) -> List[Dict]:
        return self._request("GET", "orders", params=params)

    def get_order(self, order_id: int) -> Dict:
        return self._request("GET", f"orders/{order_id}")

    def update_order(self, order_id: int, data: Dict) -> Dict:
        return self._request("PUT", f"orders/{order_id}", json=data)

    def delete_order(self, order_id: int) -> Dict:
        return self._request("DELETE", f"orders/{order_id}", params={"force": True})

    def get_customers(self, params: Optional[Dict] = None) -> List[Dict]:
        return self._request("GET", "customers", params=params)

    def get_customer(self, customer_id: int) -> Dict:
        return self._request("GET", f"customers/{customer_id}")

    def create_customer(self, data: Dict) -> Dict:
        return self._request("POST", "customers", json=data)

    def update_customer(self, customer_id: int, data: Dict) -> Dict:
        return self._request("PUT", f"customers/{customer_id}", json=data)

    def delete_customer(self, customer_id: int) -> Dict:
        return self._request("DELETE", f"customers/{customer_id}", params={"force": True})

    def get_coupons(self, params: Optional[Dict] = None) -> List[Dict]:
        return self._request("GET", "coupons", params=params)

    def get_coupon(self, coupon_id: int) -> Dict:
        return self._request("GET", f"coupons/{coupon_id}")

    def create_coupon(self, data: Dict) -> Dict:
        return self._request("POST", "coupons", json=data)

    def update_coupon(self, coupon_id: int, data: Dict) -> Dict:
        return self._request("PUT", f"coupons/{coupon_id}", json=data)

    def delete_coupon(self, coupon_id: int) -> Dict:
        return self._request("DELETE", f"coupons/{coupon_id}", params={"force": True})


wc_client = WooCommerceClient()

import httpx
import logging
import json
from typing import Optional, Dict, Any, List
from ..core.config import settings

logger = logging.getLogger("shriramya.integrations.woocommerce")

class WooCommerceClient:
    def __init__(self):
        self.base_url = f"{settings.WOOCOMMERCE_URL.rstrip('/')}/wp-json/wc/v3"
        self.consumer_key = settings.WOOCOMMERCE_CONSUMER_KEY
        self.consumer_secret = settings.WOOCOMMERCE_CONSUMER_SECRET
        self.verify = settings.WOOCOMMERCE_VERIFY_SSL
        self.timeout = settings.WOOCOMMERCE_TIMEOUT

    async def _request(self, method: str, endpoint: str, params: Optional[Dict] = None, json_data: Optional[Dict] = None) -> Any:
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        # WooCommerce natively supports WordPress Application Passwords for its wc/v3 API
        # but only over HTTPS. We trick it inside the secure Docker network with X-Forwarded-Proto.
        auth = (settings.WP_ADMIN_USER, settings.WP_APP_PASSWORD)
        
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "ShriRamya-FastAPI/2.0.0",
            "X-Forwarded-Proto": "https"
        }

        async with httpx.AsyncClient(verify=self.verify, timeout=self.timeout) as client:
            try:
                logger.info(f"WooCommerce {method} Request: {url} | Params: {json.dumps(params)}")
                
                response = await client.request(
                    method=method,
                    url=url,
                    auth=auth,
                    params=params,
                    json=json_data,
                    headers=headers
                )
                
                logger.debug(f"WooCommerce Response [{response.status_code}]: {response.text[:500]}")
                
                if response.status_code >= 400:
                    logger.error(f"WooCommerce API Error [{response.status_code}] at {endpoint}: {response.text}")
                    return {"error": True, "status_code": response.status_code, "detail": response.text}
                
                return response.json()
                
            except httpx.ReadTimeout:
                logger.error(f"WooCommerce Timeout Error at {endpoint} (Timeout={self.timeout}s)")
                return {"error": True, "detail": "WooCommerce connection timed out", "status_code": 504}
            except httpx.ConnectError:
                logger.error(f"WooCommerce Connection Error at {endpoint}: Is the WordPress service running at {settings.WOOCOMMERCE_URL}?")
                return {"error": True, "detail": "Could not connect to WooCommerce", "status_code": 502}
            except Exception as e:
                logger.error(f"WooCommerce Unexpected Error: {str(e)}")
                return {"error": True, "detail": str(e), "status_code": 500}

    async def get_products(self, params: Optional[Dict] = None) -> List[Dict]:
        return await self._request("GET", "products", params=params)

    async def get_product(self, product_id: int) -> Dict:
        return await self._request("GET", f"products/{product_id}")

    async def create_category(self, data: Dict) -> Dict:
        return await self._request("POST", "products/categories", json_data=data)

    async def get_categories(self, params: Optional[Dict] = None) -> List[Dict]:
        return await self._request("GET", "products/categories", params=params)

    async def create_product(self, data: Dict) -> Dict:
        return await self._request("POST", "products", json_data=data)

    async def update_product(self, product_id: int, data: Dict) -> Dict:
        return await self._request("PUT", f"products/{product_id}", json_data=data)

    async def delete_product(self, product_id: int) -> Dict:
        return await self._request("DELETE", f"products/{product_id}", params={"force": True})

    async def get_orders(self, params: Optional[Dict] = None) -> List[Dict]:
        return await self._request("GET", "orders", params=params)

    async def create_order(self, data: Dict) -> Dict:
        return await self._request("POST", "orders", json_data=data)

    async def get_order(self, order_id: int) -> Dict:
        return await self._request("GET", f"orders/{order_id}")

    async def update_order(self, order_id: int, data: Dict) -> Dict:
        return await self._request("PUT", f"orders/{order_id}", json_data=data)

    async def delete_order(self, order_id: int) -> Dict:
        return await self._request("DELETE", f"orders/{order_id}", params={"force": True})

    async def get_customers(self, params: Optional[Dict] = None) -> List[Dict]:
        return await self._request("GET", "customers", params=params)

    async def create_customer(self, data: Dict) -> Dict:
        return await self._request("POST", "customers", json_data=data)

wc_client = WooCommerceClient()

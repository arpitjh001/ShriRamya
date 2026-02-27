import httpx
import logging
from typing import Optional, Dict, Any, List
from ..core.config import settings

logger = logging.getLogger("shriramya.integrations.wordpress")

class WordPressClient:
    def __init__(self):
        self.base_url = f"{settings.WOOCOMMERCE_URL.rstrip('/')}/wp-json/wp/v2"
        self.username = settings.WP_ADMIN_USER
        self.app_password = settings.WP_APP_PASSWORD
        self.verify = settings.WOOCOMMERCE_VERIFY_SSL
        self.timeout = settings.WOOCOMMERCE_TIMEOUT

    async def _request(self, method: str, endpoint: str, params: Optional[Dict] = None, json_data: Optional[Dict] = None) -> Any:
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        # WP App Password uses Basic Auth
        auth = (self.username, self.app_password)
        
        async with httpx.AsyncClient(verify=self.verify, timeout=self.timeout) as client:
            try:
                logger.info(f"WordPress {method} Request: {url}")
                
                response = await client.request(
                    method=method,
                    url=url,
                    auth=auth,
                    params=params,
                    json=json_data
                )
                
                if response.status_code >= 400:
                    logger.error(f"WordPress API Error [{response.status_code}] at {endpoint}: {response.text}")
                    return {"error": True, "status_code": response.status_code, "detail": response.text}
                
                return response.json()
            except Exception as e:
                logger.error(f"WordPress Connection Error: {str(e)}")
                return {"error": True, "detail": str(e), "status_code": 502}

    async def get_posts(self, params: Optional[Dict] = None) -> List[Dict]:
        return await self._request("GET", "posts", params=params)

    async def get_post(self, post_id: int) -> Dict:
        return await self._request("GET", f"posts/{post_id}")

    async def create_post(self, data: Dict) -> Dict:
        return await self._request("POST", "posts", json_data=data)

    async def update_post(self, post_id: int, data: Dict) -> Dict:
        return await self._request("PUT", f"posts/{post_id}", json_data=data)

    async def delete_post(self, post_id: int) -> Dict:
        return await self._request("DELETE", f"posts/{post_id}", params={"force": True})

    async def get_categories(self, params: Optional[Dict] = None) -> List[Dict]:
        return await self._request("GET", "product_cat", params=params)

wp_client = WordPressClient()

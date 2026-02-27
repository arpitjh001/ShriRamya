import requests
from requests.auth import HTTPBasicAuth
import logging
from typing import Optional, Dict, Any, List
from ..core.config import settings

logger = logging.getLogger("shriramya.integrations.wordpress")

class WordPressClient:
    def __init__(self):
        self.base_url = f"{settings.WOOCOMMERCE_URL.rstrip('/')}/wp-json/wp/v2"
        self.auth = HTTPBasicAuth(settings.WP_ADMIN_USER, settings.WP_APP_PASSWORD)
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
                logger.error(f"WordPress API Error [{response.status_code}] at {endpoint}: {response.text}")
                return {"error": True, "status_code": response.status_code, "detail": response.text}
            return response.json()
        except Exception as e:
            logger.error(f"WordPress Connection Error: {str(e)}")
            return {"error": True, "detail": str(e), "status_code": 502}

    def get_posts(self, params: Optional[Dict] = None) -> List[Dict]:
        return self._request("GET", "posts", params=params)

    def get_post(self, post_id: int) -> Dict:
        return self._request("GET", f"posts/{post_id}")

    def create_post(self, data: Dict) -> Dict:
        return self._request("POST", "posts", json=data)

    def update_post(self, post_id: int, data: Dict) -> Dict:
        return self._request("PUT", f"posts/{post_id}", json=data)

    def delete_post(self, post_id: int) -> Dict:
        return self._request("DELETE", f"posts/{post_id}", params={"force": True})

wp_client = WordPressClient()

from typing import Dict, Any, List
from ..integrations.wordpress_client import wp_client
from ..core.exceptions import AppException

class BlogService:
    def _handle_response(self, response: Dict) -> Dict:
        if isinstance(response, dict) and response.get("error"):
            raise AppException(message=response.get("detail", "WordPress API Error"))
        return response

    async def get_all_posts(self) -> List[Dict]:
        res = wp_client.get_posts()
        if isinstance(res, dict) and res.get("error"):
            return []
        return res

    async def get_post_by_id(self, post_id: int) -> Dict:
        return self._handle_response(wp_client.get_post(post_id))

    async def create_post(self, data: Dict) -> Dict:
        return self._handle_response(wp_client.create_post(data))
    
    async def update_post(self, post_id: int, data: Dict) -> Dict:
        return self._handle_response(wp_client.update_post(post_id, data))

    async def delete_post(self, post_id: int) -> Dict:
        return self._handle_response(wp_client.delete_post(post_id))

blog_service = BlogService()

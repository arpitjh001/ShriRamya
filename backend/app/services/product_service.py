from typing import List, Optional, Dict
from ..integrations.woocommerce_client import wc_client
from fastapi import HTTPException

class ProductService:
    async def get_all_products(self, category: Optional[str] = None, page: int = 1, limit: int = 20) -> List[Dict]:
        params = {"page": page, "per_page": limit, "status": "publish"}
        if category:
            params["category"] = category
        
        products = wc_client.get_products(params=params)
        if isinstance(products, dict) and products.get("error"):
            # Fallback or error
            raise HTTPException(status_code=products.get("status_code", 500), detail=products.get("detail"))
        return products

    async def get_product_by_id(self, product_id: int) -> Dict:
        product = wc_client.get_product(product_id)
        if isinstance(product, dict) and product.get("error"):
            raise HTTPException(status_code=404, detail="Product not found")
        return product

    async def get_categories(self) -> List[Dict]:
        categories = wc_client.get_categories(params={"hide_empty": True})
        if isinstance(categories, dict) and categories.get("error"):
            return []
        return categories

    def _handle_response(self, response: Dict) -> Dict:
        if isinstance(response, dict) and response.get("error"):
            raise HTTPException(status_code=response.get("status_code", 400), detail=response.get("detail"))
        return response

    async def create_product(self, data: dict) -> Dict:
        return self._handle_response(wc_client.create_product(data))

    async def update_product(self, product_id: int, data: dict) -> Dict:
        return self._handle_response(wc_client.update_product(product_id, data))

    async def delete_product(self, product_id: int) -> Dict:
        return self._handle_response(wc_client.delete_product(product_id))

    async def create_category(self, data: dict) -> Dict:
        return self._handle_response(wc_client.create_category(data))

    async def update_category(self, category_id: int, data: dict) -> Dict:
        return self._handle_response(wc_client.update_category(category_id, data))

    async def delete_category(self, category_id: int) -> Dict:
        return self._handle_response(wc_client.delete_category(category_id))

product_service = ProductService()

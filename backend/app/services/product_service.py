import logging
from typing import List, Optional, Dict
from ..integrations.woocommerce_client import wc_client
from ..integrations.wordpress_client import wp_client
from fastapi import HTTPException

logger = logging.getLogger("shriramya.services.product")

class ProductService:
    async def get_all_products(self, category: Optional[str] = None, page: int = 1, limit: int = 20) -> List[Dict]:
        params = {"page": page, "per_page": limit, "status": "publish"}
        if category:
            params["category"] = category
        
        products = await wc_client.get_products(params=params)
        if isinstance(products, dict) and products.get("error"):
            raise HTTPException(status_code=products.get("status_code", 500), detail=products.get("detail"))
        return products

    async def get_product_by_id(self, product_id: int) -> Dict:
        product = await wc_client.get_product(product_id)
        if isinstance(product, dict) and product.get("error"):
            raise HTTPException(status_code=404, detail="Product not found")
        return product

    async def get_categories(self) -> List[Dict]:
        categories = await wp_client.get_categories(params={"per_page": 100})
        if isinstance(categories, dict) and categories.get("error"):
            logger.error(f"Failed to fetch categories: {categories}")
            return []
        return categories

    def _handle_response(self, response: Dict) -> Dict:
        if isinstance(response, dict) and response.get("error"):
            raise HTTPException(status_code=response.get("status_code", 400), detail=response.get("detail"))
        return response

    async def create_product(self, data: dict) -> Dict:
        # Sanitize for WooCommerce
        wc_data = data.copy()
        if 'regular_price' in wc_data:
            wc_data['regular_price'] = str(wc_data['regular_price'])
        if 'sale_price' in wc_data and wc_data['sale_price'] is not None:
            wc_data['sale_price'] = str(wc_data['sale_price'])
        
        # Remove frontend-specific fields that WC might reject in simple product POST
        wc_data.pop('size_stock', None)
        wc_data.pop('color_stock', None)
        
        # Format images correctly for WooCommerce API
        if 'images' in wc_data and isinstance(wc_data['images'], list):
            formatted_images = []
            for img in wc_data['images']:
                if isinstance(img, str):
                    formatted_images.append({'src': img})
                elif isinstance(img, dict):
                    formatted_images.append(img)
            wc_data['images'] = formatted_images
        
        return self._handle_response(await wc_client.create_product(wc_data))

    async def update_product(self, product_id: int, data: dict) -> Dict:
        # Sanitize for WooCommerce
        wc_data = data.copy()
        if 'regular_price' in wc_data:
            wc_data['regular_price'] = str(wc_data['regular_price'])
        if 'sale_price' in wc_data and wc_data['sale_price'] is not None:
            wc_data['sale_price'] = str(wc_data['sale_price'])
            
        wc_data.pop('size_stock', None)
        wc_data.pop('color_stock', None)
        
        # Format images correctly for WooCommerce API
        if 'images' in wc_data and isinstance(wc_data['images'], list):
            formatted_images = []
            for img in wc_data['images']:
                if isinstance(img, str):
                    formatted_images.append({'src': img})
                elif isinstance(img, dict):
                    formatted_images.append(img)
            wc_data['images'] = formatted_images
        
        return self._handle_response(await wc_client.update_product(product_id, wc_data))

    async def delete_product(self, product_id: int) -> Dict:
        return self._handle_response(await wc_client.delete_product(product_id))

    async def create_category(self, data: dict) -> Dict:
        return self._handle_response(await wc_client.create_category(data))

    async def update_category(self, category_id: int, data: dict) -> Dict:
        return self._handle_response(await wc_client.update_category(category_id, data))

    async def delete_category(self, category_id: int) -> Dict:
        return self._handle_response(await wc_client.delete_category(category_id))

product_service = ProductService()

from typing import List, Dict, Any
from ..db.repositories.cart_repo import CartRepository
from ..integrations.woocommerce_client import wc_client
from ..db.mongo import db_client
from ..schemas.cart import CartItem

class CartService:
    async def get_user_cart(self, user_id: str) -> Dict[str, Any]:
        repo = CartRepository(db_client.db)
        cart = await repo.get_by_user_id(user_id)
        if not cart:
            return {"items": []}
        
        # Hydrate items with live WooCommerce data
        hydrated_items = []
        for item in cart.get("items", []):
            product_id = item["product_id"]
            wc_product = wc_client.get_product(product_id)
            if not isinstance(wc_product, dict) or wc_product.get("error"):
                continue
            
            hydrated_items.append({
                "product": wc_product,
                "quantity": item["quantity"],
                "variation_id": item.get("variation_id")
            })
            
        return {"items": hydrated_items}

    async def update_cart(self, user_id: str, items: List[CartItem]):
        repo = CartRepository(db_client.db)
        cart_data = {
            "user_id": user_id,
            "items": [item.model_dump() for item in items]
        }
        await repo.upsert_cart(user_id, cart_data)
        return cart_data

cart_service = CartService()

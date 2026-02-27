from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, Dict, Any

class CartRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db.carts

    async def get_by_user_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one({"user_id": user_id})

    async def upsert_cart(self, user_id: str, cart_data: Dict[str, Any]):
        await self.collection.update_one(
            {"user_id": user_id},
            {"$set": cart_data},
            upsert=True
        )

    async def delete_cart(self, user_id: str):
        await self.collection.delete_one({"user_id": user_id})

from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, Dict, Any
from ...core.security import get_password_hash

class UserRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db.users

    async def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one({"email": email})

    async def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one({"id": user_id})

    async def create(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        await self.collection.insert_one(user_data)
        return user_data

    async def update(self, user_id: str, update_data: Dict[str, Any]):
        await self.collection.update_one({"id": user_id}, {"$set": update_data})

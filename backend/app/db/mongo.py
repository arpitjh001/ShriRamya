from motor.motor_asyncio import AsyncIOMotorClient
from ..core.config import settings
import logging

logger = logging.getLogger("shriramya.db")

class MongoClient:
    def __init__(self):
        self.client: AsyncIOMotorClient = None
        self.db = None

    def connect(self):
        try:
            self.client = AsyncIOMotorClient(settings.MONGO_URL)
            self.db = self.client[settings.DB_NAME]
            logger.info(f"Connected to MongoDB: {settings.DB_NAME}")
        except Exception as e:
            logger.error(f"MongoDB Connection Failed: {str(e)}")
            raise e

    def close(self):
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")

db_client = MongoClient()

def get_db():
    return db_client.db

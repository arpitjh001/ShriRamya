import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')

async def check_users():
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017/')
    db_name = os.getenv('DB_NAME', 'shriramya')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    users = await db.users.find().to_list(length=100)
    print(f"Found {len(users)} users:")
    for user in users:
        print(f"Email: {user.get('email')}, Role: {user.get('role')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_users())

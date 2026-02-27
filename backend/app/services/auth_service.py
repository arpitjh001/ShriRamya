from datetime import datetime, timezone
import uuid
from fastapi import HTTPException, status
from ..db.repositories.user_repo import UserRepository
from ..core.security import get_password_hash, verify_password, create_access_token
from ..schemas.user import UserCreate, UserLogin, Token
from ..db.mongo import db_client

class AuthService:
    def __init__(self):
        # We'll pass the db later or use a dependency
        pass

    async def register_user(self, user_in: UserCreate) -> Token:
        repo = UserRepository(db_client.db)
        existing_user = await repo.get_by_email(user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        user_id = str(uuid.uuid4())
        user_data = {
            "id": user_id,
            "email": user_in.email,
            "name": user_in.name,
            "phone": user_in.phone,
            "password": get_password_hash(user_in.password),
            "role": "customer",
            "created_at": datetime.now(timezone.utc)
        }
        
        user = await repo.create(user_data)
        access_token = create_access_token(subject=user["id"], role=user["role"])
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }

    async def authenticate_user(self, login_data: UserLogin) -> Token:
        repo = UserRepository(db_client.db)
        user = await repo.get_by_email(login_data.email)
        if not user or not verify_password(login_data.password, user["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token = create_access_token(subject=user["id"], role=user["role"])
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }

auth_service = AuthService()

from fastapi import APIRouter, Depends, status
from ...schemas.user import UserCreate, UserLogin, Token, UserResponse
from ...services.auth_service import auth_service
from ...core.response import success_response, APIResponse
from ...middleware.auth_dependency import get_current_user

router = APIRouter()

@router.post("/register", response_model=APIResponse[Token], status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate):
    result = await auth_service.register_user(user_in)
    return success_response(data=result, message="User registered successfully")

@router.post("/login", response_model=APIResponse[Token])
async def login(login_data: UserLogin):
    result = await auth_service.authenticate_user(login_data)
    return success_response(data=result, message="Login successful")

@router.get("/me", response_model=APIResponse[UserResponse])
async def get_me(current_user: dict = Depends(get_current_user)):
    return success_response(data=current_user)

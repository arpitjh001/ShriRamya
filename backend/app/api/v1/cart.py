from fastapi import APIRouter, Depends, status
from typing import List, Dict, Any
from ...services.cart_service import cart_service
from ...schemas.cart import CartItem
from ...core.response import success_response, APIResponse
from ...middleware.auth_dependency import get_current_user

router = APIRouter()

@router.get("/", response_model=APIResponse)
async def get_cart(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    cart = await cart_service.get_user_cart(user_id)
    return success_response(data=cart)

@router.post("/", response_model=APIResponse)
@router.put("/", response_model=APIResponse)
async def update_cart(items: List[CartItem], current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    cart = await cart_service.update_cart(user_id, items)
    return success_response(data=cart, message="Cart updated successfully")

@router.delete("/", response_model=APIResponse)
async def clear_cart(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    cart = await cart_service.update_cart(user_id, [])
    return success_response(data=cart, message="Cart cleared successfully")

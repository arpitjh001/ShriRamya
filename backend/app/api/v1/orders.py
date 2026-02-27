from fastapi import APIRouter, Depends, status
from typing import List, Optional
from ...services.order_service import order_service
from ...core.response import success_response, APIResponse
from ...middleware.auth_dependency import get_current_user, get_current_admin
from ...schemas.order import OrderCreate, OrderUpdate

router = APIRouter()

@router.get("/", response_model=APIResponse[List])
async def list_orders(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id") if current_user.get("role") != "admin" else None
    orders = await order_service.get_all_orders(user_id=user_id)
    return success_response(data=orders)

@router.get("/{order_id}", response_model=APIResponse)
async def get_order(order_id: int, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id") if current_user.get("role") != "admin" else None
    order = await order_service.get_order_by_id(order_id, user_id=user_id)
    return success_response(data=order)

@router.post("/", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def create_order(order_in: OrderCreate, current_user: dict = Depends(get_current_user)):
    data = order_in.model_dump(exclude_unset=True)
    if current_user.get("role") != "admin":
        data["customer_id"] = current_user.get("id")
    result = await order_service.create_wc_order(data)
    return success_response(data=result, message="Order created successfully")

@router.put("/{order_id}", response_model=APIResponse)
async def update_order(order_id: int, order_in: OrderUpdate, admin: dict = Depends(get_current_admin)):
    result = await order_service.update_wc_order(order_id, order_in.model_dump(exclude_unset=True))
    return success_response(data=result, message="Order updated successfully")

@router.delete("/{order_id}", response_model=APIResponse)
async def delete_order(order_id: int, admin: dict = Depends(get_current_admin)):
    result = await order_service.delete_wc_order(order_id)
    return success_response(data=result, message="Order deleted successfully")

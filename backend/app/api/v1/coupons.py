from fastapi import APIRouter, Depends, status
from typing import List
from ...services.coupon_service import coupon_service
from ...core.response import success_response, APIResponse
from ...middleware.auth_dependency import get_current_admin
from ...schemas.coupon import CouponCreate, CouponUpdate

router = APIRouter()

@router.get("/", response_model=APIResponse[List])
async def list_coupons(admin: dict = Depends(get_current_admin)):
    coupons = await coupon_service.get_all_coupons()
    return success_response(data=coupons)

@router.get("/{coupon_id}", response_model=APIResponse)
async def get_coupon(coupon_id: int, admin: dict = Depends(get_current_admin)):
    coupon = await coupon_service.get_coupon_by_id(coupon_id)
    return success_response(data=coupon)

@router.post("/", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def create_coupon(coupon_in: CouponCreate, admin: dict = Depends(get_current_admin)):
    result = await coupon_service.create_coupon(coupon_in.model_dump(exclude_unset=True))
    return success_response(data=result, message="Coupon created successfully")

@router.put("/{coupon_id}", response_model=APIResponse)
async def update_coupon(coupon_id: int, coupon_in: CouponUpdate, admin: dict = Depends(get_current_admin)):
    result = await coupon_service.update_coupon(coupon_id, coupon_in.model_dump(exclude_unset=True))
    return success_response(data=result, message="Coupon updated successfully")

@router.delete("/{coupon_id}", response_model=APIResponse)
async def delete_coupon(coupon_id: int, admin: dict = Depends(get_current_admin)):
    result = await coupon_service.delete_coupon(coupon_id)
    return success_response(data=result, message="Coupon deleted successfully")

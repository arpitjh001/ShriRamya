from fastapi import APIRouter, Depends, status, Query
from typing import List, Optional
from ...services.customer_service import customer_service
from ...core.response import success_response, APIResponse
from ...middleware.auth_dependency import get_current_admin
from ...schemas.customer import CustomerCreate, CustomerUpdate

router = APIRouter()

@router.get("/", response_model=APIResponse[List])
async def list_customers(
    email: Optional[str] = Query(None),
    role: str = Query("customer"),
    admin: dict = Depends(get_current_admin)
):
    customers = await customer_service.get_all_customers(role=role, email=email)
    return success_response(data=customers)

@router.get("/{customer_id}", response_model=APIResponse)
async def get_customer(customer_id: int, admin: dict = Depends(get_current_admin)):
    customer = await customer_service.get_customer_by_id(customer_id)
    return success_response(data=customer)

@router.post("/", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(customer_in: CustomerCreate, admin: dict = Depends(get_current_admin)):
    result = await customer_service.create_customer(customer_in.model_dump(exclude_unset=True))
    return success_response(data=result, message="Customer created successfully")

@router.put("/{customer_id}", response_model=APIResponse)
async def update_customer(customer_id: int, customer_in: CustomerUpdate, admin: dict = Depends(get_current_admin)):
    result = await customer_service.update_customer(customer_id, customer_in.model_dump(exclude_unset=True))
    return success_response(data=result, message="Customer updated successfully")

@router.delete("/{customer_id}", response_model=APIResponse)
async def delete_customer(customer_id: int, admin: dict = Depends(get_current_admin)):
    result = await customer_service.delete_customer(customer_id)
    return success_response(data=result, message="Customer deleted successfully")

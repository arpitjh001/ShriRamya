from fastapi import APIRouter, Query, Depends, status
from typing import List, Optional, Dict
from ...services.product_service import product_service
from ...core.response import success_response, APIResponse
from ...middleware.auth_dependency import get_current_admin
from ...schemas.product import ProductCreate, ProductUpdate, CategoryCreate, CategoryUpdate

router = APIRouter()

@router.get("/", response_model=APIResponse[List])
async def list_products(
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    products = await product_service.get_all_products(category=category, page=page, limit=limit)
    return success_response(data=products)

@router.get("/categories", response_model=APIResponse[List])
async def list_categories():
    categories = await product_service.get_categories()
    return success_response(data=categories)

@router.get("/{product_id}", response_model=APIResponse)
async def get_product(product_id: int):
    product = await product_service.get_product_by_id(product_id)
    return success_response(data=product)

@router.post("/", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def create_product(product_in: ProductCreate, admin: dict = Depends(get_current_admin)):
    result = await product_service.create_product(product_in.model_dump(exclude_unset=True))
    return success_response(data=result, message="Product created successfully")

@router.put("/{product_id}", response_model=APIResponse)
async def update_product(product_id: int, product_in: ProductUpdate, admin: dict = Depends(get_current_admin)):
    result = await product_service.update_product(product_id, product_in.model_dump(exclude_unset=True))
    return success_response(data=result, message="Product updated successfully")

@router.delete("/{product_id}", response_model=APIResponse)
async def delete_product(product_id: int, admin: dict = Depends(get_current_admin)):
    result = await product_service.delete_product(product_id)
    return success_response(data=result, message="Product deleted successfully")

@router.post("/categories", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def create_category(category_in: CategoryCreate, admin: dict = Depends(get_current_admin)):
    result = await product_service.create_category(category_in.model_dump(exclude_unset=True))
    return success_response(data=result, message="Category created successfully")

@router.put("/categories/{category_id}", response_model=APIResponse)
async def update_category(category_id: int, category_in: CategoryUpdate, admin: dict = Depends(get_current_admin)):
    result = await product_service.update_category(category_id, category_in.model_dump(exclude_unset=True))
    return success_response(data=result, message="Category updated successfully")

@router.delete("/categories/{category_id}", response_model=APIResponse)
async def delete_category(category_id: int, admin: dict = Depends(get_current_admin)):
    result = await product_service.delete_category(category_id)
    return success_response(data=result, message="Category deleted successfully")

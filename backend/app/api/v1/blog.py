from fastapi import APIRouter, Depends, status
from typing import List
from ...services.blog_service import blog_service
from ...core.response import success_response, APIResponse
from ...middleware.auth_dependency import get_current_admin
from ...schemas.blog import BlogPostCreate, BlogPostUpdate

router = APIRouter()

@router.get("/posts", response_model=APIResponse[List])
async def list_posts():
    posts = await blog_service.get_all_posts()
    return success_response(data=posts)

@router.get("/posts/{post_id}", response_model=APIResponse)
async def get_post(post_id: int):
    post = await blog_service.get_post_by_id(post_id)
    return success_response(data=post)

@router.post("/posts", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def create_post(post_in: BlogPostCreate, admin: dict = Depends(get_current_admin)):
    result = await blog_service.create_post(post_in.model_dump(exclude_unset=True))
    return success_response(data=result, message="Blog post created successfully")

@router.put("/posts/{post_id}", response_model=APIResponse)
async def update_post(post_id: int, post_in: BlogPostUpdate, admin: dict = Depends(get_current_admin)):
    result = await blog_service.update_post(post_id, post_in.model_dump(exclude_unset=True))
    return success_response(data=result, message="Blog post updated successfully")

@router.delete("/posts/{post_id}", response_model=APIResponse)
async def delete_post(post_id: int, admin: dict = Depends(get_current_admin)):
    result = await blog_service.delete_post(post_id)
    return success_response(data=result, message="Blog post deleted successfully")

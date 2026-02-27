from pydantic import BaseModel
from typing import List, Optional

class BlogPostCreate(BaseModel):
    title: str
    content: str
    status: str = "publish"
    author: Optional[int] = None
    categories: Optional[List[int]] = []

class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = None
    author: Optional[int] = None
    categories: Optional[List[int]] = None

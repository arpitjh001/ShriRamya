from pydantic import BaseModel
from typing import Optional, List, Any

class CategoryBase(BaseModel):
    id: int
    name: str
    slug: str
    parent: int = 0

class ProductBase(BaseModel):
    id: int
    name: str
    slug: str
    price: str
    regular_price: str
    sale_price: Optional[str] = None
    description: str
    short_description: str
    images: List[Any] = []
    categories: List[Any] = []
    stock_status: str = "instock"
    stock_quantity: Optional[int] = None

class CategoryCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    parent: int = 0
    description: Optional[str] = None

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    parent: Optional[int] = None
    description: Optional[str] = None

class ProductCreate(BaseModel):
    name: str
    regular_price: str
    sale_price: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    categories: List[Any] = []
    images: List[Any] = []
    stock_status: Optional[str] = "instock"
    stock_quantity: Optional[int] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    regular_price: Optional[str] = None
    sale_price: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    categories: Optional[List[Any]] = None
    images: Optional[List[Any]] = None
    stock_status: Optional[str] = None
    stock_quantity: Optional[int] = None

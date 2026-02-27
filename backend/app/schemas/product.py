from pydantic import BaseModel, Field
from typing import Optional, List, Any, Union, Dict

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
    regular_price: Union[str, float]
    sale_price: Optional[Union[str, float]] = None
    description: Optional[str] = ""
    short_description: Optional[str] = ""
    categories: List[Any] = []
    images: List[Any] = []
    stock_status: Optional[str] = "instock"
    stock_quantity: Optional[int] = 0
    size_stock: List[Dict[str, Any]] = []
    color_stock: List[Dict[str, Any]] = []
    status: Optional[str] = "publish"

    class Config:
        extra = "allow"

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    regular_price: Optional[Union[str, float]] = None
    sale_price: Optional[Union[str, float]] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    categories: Optional[List[Any]] = None
    images: Optional[List[Any]] = None
    stock_status: Optional[str] = None
    stock_quantity: Optional[int] = None
    size_stock: Optional[List[Dict[str, Any]]] = None
    color_stock: Optional[List[Dict[str, Any]]] = None
    status: Optional[str] = None

    class Config:
        extra = "allow"

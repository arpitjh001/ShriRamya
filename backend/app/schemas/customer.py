from pydantic import BaseModel
from typing import Optional, Dict, Any

class CustomerCreate(BaseModel):
    email: str
    first_name: str
    last_name: str
    username: Optional[str] = None
    billing: Optional[Dict[str, Any]] = None
    shipping: Optional[Dict[str, Any]] = None

class CustomerUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    billing: Optional[Dict[str, Any]] = None
    shipping: Optional[Dict[str, Any]] = None

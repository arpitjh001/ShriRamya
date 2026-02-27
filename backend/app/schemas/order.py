from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class OrderCreate(BaseModel):
    payment_method: str = "razorpay"
    payment_method_title: str = "Razorpay"
    set_paid: bool = False
    billing: Dict[str, Any]
    shipping: Dict[str, Any]
    line_items: List[Dict[str, Any]]

class OrderUpdate(BaseModel):
    status: Optional[str] = None
    set_paid: Optional[bool] = None
    billing: Optional[Dict[str, Any]] = None
    shipping: Optional[Dict[str, Any]] = None

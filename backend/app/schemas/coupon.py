from pydantic import BaseModel
from typing import Optional

class CouponCreate(BaseModel):
    code: str
    discount_type: str = "percent"
    amount: str
    description: Optional[str] = None

class CouponUpdate(BaseModel):
    code: Optional[str] = None
    discount_type: Optional[str] = None
    amount: Optional[str] = None
    description: Optional[str] = None

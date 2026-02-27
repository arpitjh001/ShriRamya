from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class CartItem(BaseModel):
    product_id: int
    quantity: int = Field(..., ge=1)
    variation_id: Optional[int] = None

class CartUpdate(BaseModel):
    items: List[CartItem]

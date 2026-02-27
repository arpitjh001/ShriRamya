from typing import Any, Optional, Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")

class APIResponse(BaseModel, Generic[T]):
    success: bool
    message: str
    data: Optional[T] = None

def success_response(data: Any = None, message: str = "Request processed successfully") -> APIResponse:
    return APIResponse(success=True, message=message, data=data)

def error_response(message: str = "An error occurred", data: Any = None) -> APIResponse:
    return APIResponse(success=False, message=message, data=data)

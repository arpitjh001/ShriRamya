from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from .response import error_response

class AppException(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code

async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(message=exc.message).model_dump()
    )

async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(message=str(exc.detail)).model_dump()
    )

async def general_exception_handler(request: Request, exc: Exception):
    # Log the original error here if needed
    return JSONResponse(
        status_code=500,
        content=error_response(message="Internal server error").model_dump()
    )

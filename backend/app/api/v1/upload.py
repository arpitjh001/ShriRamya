from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
import shutil
import os
import uuid
from ...middleware.auth_dependency import get_current_admin
from ...core.config import settings
from ...core.response import success_response

router = APIRouter()

# Ensure upload directory exists
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("")
async def upload_file(file: UploadFile = File(...), admin: dict = Depends(get_current_admin)):
    try:
        # Generate unique filename
        ext = os.path.splitext(file.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Generate URL
        # We assume the server mounts /uploads to UPLOAD_DIR
        base_url = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000").rstrip("/")
        file_url = f"{base_url}/uploads/{filename}"
        
        return {
            "success": True,
            "message": "File uploaded successfully",
            "url": file_url,
            "filename": filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

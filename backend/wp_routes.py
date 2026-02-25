from fastapi import APIRouter, HTTPException, Query, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import jwt
import requests
import os
import logging
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger("shriramya")
wp_router = APIRouter(prefix="/wp", tags=["WordPress Blog"])

WP_BASE_URL = os.getenv("WOOCOMMERCE_URL", "http://wordpress:80").rstrip('/')
WP_API_URL = f"{WP_BASE_URL}/wp-json/wp/v2"

WP_ADMIN_USER = os.getenv("WP_ADMIN_USER")
WP_APP_PASSWORD = os.getenv("WP_APP_PASSWORD")

_security = HTTPBearer()

async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(_security)):
    try:
        token = credentials.credentials
        SECRET_KEY = os.getenv('JWT_SECRET', 'shri-ramya-secret-key-2025')
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail="Authentication failed")

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    excerpt: Optional[str] = None
    status: Optional[str] = None
    categories: Optional[List[int]] = None


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def fetch_wp_api(endpoint: str, params: Optional[Dict] = None):
    url = f"{WP_API_URL}/{endpoint.lstrip('/')}"
    try:
        response = requests.get(url, params=params, timeout=10)
        
        # Determine total pages for pagination if present
        total_pages = int(response.headers.get('X-WP-TotalPages', 1))
        total_items = int(response.headers.get('X-WP-Total', len(response.json()) if response.ok else 0))

        if response.status_code >= 400:
            logger.error(f"WP API Error: {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"WordPress API error: {response.text}")
            
        data = response.json()
        return data, total_pages, total_items
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to connect to WordPress: {str(e)}")
        raise HTTPException(status_code=502, detail="Failed to connect to WordPress blog")

def transform_post(post: Dict[str, Any]) -> Dict[str, Any]:
    """Extract useful fields from complex WP REST API response"""
    # Try to grab featured image from _embedded
    image_url = None
    if "_embedded" in post and "wp:featuredmedia" in post["_embedded"]:
        media = post["_embedded"]["wp:featuredmedia"]
        if media and len(media) > 0 and "source_url" in media[0]:
            image_url = media[0]["source_url"]

    # Try to grab author name
    author_name = "Shriramya Admin"
    if "_embedded" in post and "author" in post["_embedded"]:
        authors = post["_embedded"]["author"]
        if authors and len(authors) > 0 and "name" in authors[0]:
            author_name = authors[0]["name"]

    # Try to grab category names
    category_names = []
    if "_embedded" in post and "wp:term" in post["_embedded"]:
        terms = post["_embedded"]["wp:term"]
        if terms and len(terms) > 0:
            for term_list in terms:
                for term in term_list:
                    if term.get("taxonomy") == "category":
                        category_names.append(term.get("name"))

    return {
        "id": post["id"],
        "date": post["date"],
        "slug": post["slug"],
        "title": post.get("title", {}).get("rendered", ""),
        "excerpt": post.get("excerpt", {}).get("rendered", ""),
        "content": post.get("content", {}).get("rendered", ""),
        "image": image_url,
        "author": author_name,
        "categories": category_names,
        "link": post.get("link", "")
    }

@wp_router.get("/posts")
async def get_blog_posts(
    page: int = Query(1, ge=1),
    per_page: int = Query(9, ge=1, le=50),
    search: Optional[str] = None,
    category: Optional[int] = None
):
    """Get summarized list of blog posts with pagination and filtering"""
    params = {
        "page": page,
        "per_page": per_page,
        "_embed": "1" # include media & author
    }
    if search:
        params["search"] = search
    if category:
        params["categories"] = category

    data, total_pages, total_items = fetch_wp_api("posts", params)
    
    transformed_posts = [transform_post(post) for post in data]
    
    return {
        "posts": transformed_posts,
        "pagination": {
            "current_page": page,
            "total_pages": total_pages,
            "total_items": total_items
        }
    }

@wp_router.get("/posts/{post_id}")
async def get_single_post(post_id: int):
    """Get single full post by ID"""
    data, _, _ = fetch_wp_api(f"posts/{post_id}", {"_embed": "1"})
    return transform_post(data)

@wp_router.get("/categories")
async def get_blog_categories():
    """Get list of active blog categories"""
    # exclude empty categories via hide_empty=true 
    data, _, _ = fetch_wp_api("categories", {"hide_empty": "1"})
    
    return [{
        "id": cat["id"],
        "name": cat["name"],
        "slug": cat["slug"],
        "count": cat["count"]
    } for cat in data]

@wp_router.put("/posts/{post_id}")
async def update_post(post_id: int, post_update: PostUpdate, admin=Depends(require_admin)):
    """Update an existing WordPress post"""
    if not WP_ADMIN_USER or not WP_APP_PASSWORD:
        raise HTTPException(status_code=500, detail="WordPress credentials not configured")
        
    url = f"{WP_API_URL}/posts/{post_id}"
    update_data = {k: v for k, v in post_update.model_dump().items() if v is not None}
    
    try:
        response = requests.put(
            url, 
            json=update_data, 
            auth=(WP_ADMIN_USER, WP_APP_PASSWORD),
            timeout=10
        )
        if response.status_code >= 400:
            raise HTTPException(status_code=response.status_code, detail=f"WP API Error: {response.text}")
        return transform_post(response.json())
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to update WordPress post: {str(e)}")
        raise HTTPException(status_code=502, detail="Failed to connect to WordPress")

@wp_router.post("/media")
async def upload_media(file: UploadFile = File(...), admin=Depends(require_admin)):
    """Upload media to WordPress and return the attachment details"""
    if not WP_ADMIN_USER or not WP_APP_PASSWORD:
        raise HTTPException(status_code=500, detail="WordPress credentials not configured")
        
    url = f"{WP_API_URL}/media"
    
    try:
        contents = await file.read()
        headers = {
            "Content-Disposition": f'attachment; filename="{file.filename}"',
            "Content-Type": file.content_type or "image/jpeg"
        }
        response = requests.post(
            url, 
            data=contents, 
            headers=headers,
            auth=(WP_ADMIN_USER, WP_APP_PASSWORD),
            timeout=30
        )
        if response.status_code >= 400:
            raise HTTPException(status_code=response.status_code, detail=f"WP API Error: {response.text}")
            
        data = response.json()
        return {
            "id": data.get("id"),
            "url": data.get("source_url")
        }
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to upload to WordPress media library: {str(e)}")
        raise HTTPException(status_code=502, detail="Failed to connect to WordPress")

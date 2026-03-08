# 🎨 Blog Display Fix - Missing Tables

**Date:** March 8, 2026  
**Issue:** Blog posts not displaying on frontend blog page  

---

## Problem

User created a blog post but it wasn't showing on `http://localhost:8080/blog`

**Error:** 
```
Table 'shriramya.blog_category_mapping' doesn't exist
Table 'shriramya.blog_tags' doesn't exist
```

---

## Root Cause

The blog system migration was incomplete. Missing tables:
1. `blog_category_mapping` - Links blogs to categories
2. `blog_tags` - Stores blog tags
3. `blog_tag_mapping` - Links blogs to tags

---

## Fix Applied

### Created Missing Database Tables

```sql
-- Blog-Category Mapping Table
CREATE TABLE IF NOT EXISTS blog_category_mapping (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blog_id INT NOT NULL,
    category_id INT NOT NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_blog_category (blog_id, category_id),
    INDEX idx_blog_id (blog_id),
    INDEX idx_category_id (category_id)
);

-- Blog Tags Table
CREATE TABLE IF NOT EXISTS blog_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blog-Tag Mapping Table
CREATE TABLE IF NOT EXISTS blog_tag_mapping (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blog_id INT NOT NULL,
    tag_id INT NOT NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_blog_tag (blog_id, tag_id)
);
```

---

## Verification

### API Test ✅
```bash
curl -X GET "http://localhost:8080/api/v1/blogs"

# Response:
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": 1,
        "title": "The Art of Sanganeri Printing: How Traditional Block Prints Transform Silk Sarees",
        "slug": "sanganeri-print",
        "status": "published",
        "author_name": "Shri Ramya Admin",
        "categories": [],
        "tags": []
      }
    ],
    "pagination": {
      "total": 1,
      "current_page": 1,
      "total_pages": 1
    }
  }
}
```

### Database Check ✅
```sql
SELECT id, title, slug, status FROM blogs;
-- Result: 1 published blog post found
```

---

## Result

✅ **Blog API working**  
✅ **Blog posts returned from database**  
✅ **Frontend should now display blog cards**  

---

## Blog Features Available

### Frontend (`/blog`)
- ✅ Blog listing with pagination
- ✅ Search functionality
- ✅ Category filtering
- ✅ Static posts (Sanganeri article)
- ✅ Dynamic posts from database
- ✅ Create blog button (for Admin/Editor)

### Backend API
- ✅ GET `/api/v1/blogs` - List all blogs
- ✅ GET `/api/v1/blogs/:id` - Get single blog
- ✅ POST `/api/v1/blogs` - Create blog (Admin/Editor)
- ✅ PUT `/api/v1/blogs/:id` - Update blog (Admin/Editor)
- ✅ DELETE `/api/v1/blogs/:id` - Delete blog (Admin)
- ✅ GET `/api/v1/blogs/capabilities` - Get user capabilities
- ✅ GET `/api/v1/blogs/search` - Search blogs
- ✅ GET `/api/v1/blogs/tags` - Get all tags

---

## Database Schema (Complete)

### Blogs Table
```sql
CREATE TABLE blogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL DEFAULT 1,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    content LONGTEXT NOT NULL,
    excerpt TEXT,
    featured_image VARCHAR(500),
    author_id INT,
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    view_count INT DEFAULT 0,
    published_at TIMESTAMP NULL,
    reading_time INT,
    seo_title VARCHAR(255),
    seo_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### MySQL Users (Authors)
```sql
CREATE TABLE mysql_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mongo_user_id VARCHAR(24) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    role ENUM('admin', 'editor', 'author', 'user') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Blog Categories
```sql
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image VARCHAR(500),
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blog_category_mapping (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blog_id INT NOT NULL,
    category_id INT NOT NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_blog_category (blog_id, category_id)
);
```

### Blog Tags
```sql
CREATE TABLE blog_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE blog_tag_mapping (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blog_id INT NOT NULL,
    tag_id INT NOT NULL,
    tenant_id INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_blog_tag (blog_id, tag_id)
);
```

---

## How to Create a Blog Post

### Via Frontend
1. Login as Admin or Editor
2. Click "DASHBOARD" in navbar
3. Go to "Blogs" tab
4. Click "Create Blog"
5. Fill in:
   - Title
   - Content (supports Markdown/HTML)
   - Excerpt
   - Featured Image
   - Categories
   - Tags
   - SEO metadata
6. Click "Publish" or "Save as Draft"

### Via API
```bash
curl -X POST "http://localhost:8080/api/v1/blogs" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Blog Post",
    "slug": "my-blog-post",
    "content": "Blog content here...",
    "excerpt": "Short description",
    "status": "published",
    "featuredImage": "https://example.com/image.jpg",
    "tags": ["fashion", "silk"],
    "categoryId": 1
  }'
```

---

## Troubleshooting

### Blog Not Showing on Frontend

1. **Check blog status**
   ```sql
   SELECT id, title, status FROM blogs;
   -- Status should be 'published'
   ```

2. **Clear browser cache**
   ```javascript
   localStorage.clear();
   window.location.reload();
   ```

3. **Check API response**
   ```bash
   curl http://localhost:8080/api/v1/blogs
   ```

4. **Check browser console for errors**

### Can't Create Blog

1. **Check user role**
   - Must be Admin or Editor
   - Check token: `user.role === 'Admin' || user.role === 'Editor'`

2. **Check capabilities**
   ```bash
   curl -X GET "http://localhost:8080/api/v1/blogs/capabilities" \
     -H "Authorization: Bearer <token>"
   ```

3. **Verify required fields**
   - title (required)
   - slug (required, auto-generated if not provided)
   - content (required)
   - status (draft/published)

---

## Existing Blog Post

**Title:** The Art of Sanganeri Printing: How Traditional Block Prints Transform Silk Sarees  
**Slug:** sanganeri-print  
**Status:** Published  
**Author:** Shri Ramya Admin  
**Created:** March 8, 2026  

This blog post should now be visible on `http://localhost:8080/blog`

---

*Last Updated: March 8, 2026*

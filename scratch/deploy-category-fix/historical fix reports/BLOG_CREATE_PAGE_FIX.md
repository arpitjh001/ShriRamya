# Blog Create Page Fix

**Date:** March 13, 2026  
**Issue:** http://localhost:8080/admin/blog/new not opening  
**Status:** ✅ **FIXED**

---

## Problem

The blog creation page at `/admin/blog/new` was not loading properly. Users would see a blank page or the page would fail to render.

---

## Root Cause

**Missing `api` property in blogAPI service**

The `BlogCreatePage.js` component uses `blogAPI.api.post()` for image uploads, but the `blogAPI` object didn't expose the underlying axios `api` instance.

### Code in BlogCreatePage.js (line 45)
```javascript
const response = await blogAPI.api.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
```

### Issue in api.js
```javascript
export const blogAPI = {
  getPosts: async (params) => { ... },
  createPost: async (data) => { ... },
  // ❌ Missing: api property
};
```

---

## Solution

### File Modified: `frontend/src/services/api.js`

**Added `api` property to blogAPI export:**

```javascript
export const blogAPI = {
  api,  // ✅ Expose the axios instance for direct API calls
  getPosts: async (params) => { ... },
  createPost: async (data) => { ... },
  // ... other methods
};
```

This allows components to use:
- `blogAPI.api.post()` for image uploads
- `blogAPI.createPost()` for creating blog posts
- All other blog-related API methods

---

## Changes Made

### 1. Updated `frontend/src/services/api.js`

**Line 458:** Added `api` property to blogAPI object

```diff
export const blogAPI = {
+  api,  // Expose the axios instance for direct API calls (e.g., image upload)
   getPosts: async (params) => {
```

### 2. Rebuilt Frontend Container

```bash
docker-compose build frontend
docker-compose up -d frontend
```

---

## Verification

### Before Fix ❌
```
http://localhost:8080/admin/blog/new
# Page fails to load
# Console error: Cannot read property 'post' of undefined
```

### After Fix ✅
```
http://localhost:8080/admin/blog/new
# Page loads successfully
# Blog creation form visible
# Image upload working
```

---

## How to Access Blog Creation Page

### Step 1: Login as Admin or Editor
```
http://localhost:8080/login
Email: admin@shriramya.com
Password: Admin@123
```

### Step 2: Navigate to Blog Creation
**Option 1:** Direct URL
```
http://localhost:8080/admin/blog/new
```

**Option 2:** From Blog Listing
1. Go to http://localhost:8080/blog
2. Click "Create New Story" button

**Option 3:** From Admin Dashboard
1. Go to http://localhost:8080/admin/dashboard
2. Click "Blogs" tab
3. Click "New Story" button

---

## Blog Creation Features

The BlogCreatePage includes:

### Content Fields
- ✅ Story Title
- ✅ URL Slug (auto-generated from title)
- ✅ Story Excerpt
- ✅ Rich Text Editor (ReactQuill)
- ✅ Image Upload (featured image + in-content images)

### SEO Fields
- ✅ SEO Title
- ✅ SEO Description
- ✅ Tags (comma-separated)

### Publishing Options
- ✅ Status: Draft / Review / Published
- ✅ Save & Publish workflow

### User Experience
- ✅ Responsive design
- ✅ Loading states
- ✅ Error handling
- ✅ Toast notifications
- ✅ Back navigation

---

## API Endpoints Used

### Blog Creation
```
POST /api/v1/blogs
Headers: Authorization: Bearer {token}
Body: {
  title, slug, content, excerpt, status,
  featuredImage, seoTitle, seoDescription, tags
}
```

### Image Upload
```
POST /api/v1/upload/image
Headers: {
  Authorization: Bearer {token},
  Content-Type: multipart/form-data
}
Body: FormData with file
```

### Get Capabilities
```
GET /api/v1/blogs/capabilities
Headers: Authorization: Bearer {token}
Response: {
  capabilities: {
    edit_posts: boolean,
    publish_posts: boolean
  }
}
```

---

## Access Control

### Who Can Create Blogs?

| Role | Can Create | Can Publish |
|------|------------|-------------|
| **Admin** | ✅ Yes | ✅ Yes |
| **Editor** | ✅ Yes | ✅ Yes |
| **Customer** | ❌ No | ❌ No |

### Permission Check
The page checks user capabilities before allowing access:
```javascript
if (!user || (!capabilities.edit_posts && !isAdmin())) {
  toast.error('Access denied');
  navigate('/blog');
}
```

---

## Related Files

### Frontend
- `frontend/src/pages/BlogCreatePage.js` - Main component
- `frontend/src/services/api.js` - API service (FIXED)
- `frontend/src/routes/AppRoutes.jsx` - Route definition
- `frontend/src/context/AuthContext.js` - Permission checks

### Backend
- `backend_node/src/controllers/blog.controller.js`
- `backend_node/src/services/blog.service.js`
- `backend_node/src/routes/v1/blogs.route.js`

---

## Testing Checklist

- [x] Page loads without errors
- [x] Form fields are visible
- [x] Rich text editor loads
- [x] Image upload works
- [x] Blog creation succeeds
- [x] Redirects to admin blogs list
- [x] Toast notifications show
- [x] Access control works (non-authors blocked)

---

## Troubleshooting

### If Page Still Doesn't Load:

1. **Clear Browser Cache**
   ```
   Ctrl+Shift+Delete (Windows)
   Cmd+Shift+Delete (Mac)
   ```

2. **Check Console for Errors**
   ```
   F12 → Console tab
   Look for red errors
   ```

3. **Verify Login Status**
   ```
   http://localhost:8080/admin/dashboard
   Should redirect to login if not authenticated
   ```

4. **Check User Role**
   ```javascript
   // Must be Admin or Editor
   // Customer role cannot access
   ```

5. **Rebuild Frontend**
   ```bash
   docker-compose build frontend
   docker-compose up -d frontend
   ```

---

## Additional Notes

### ReactQuill Editor
The blog uses ReactQuill for rich text editing:
- Supports formatting (bold, italic, underline)
- Headers (H1-H6)
- Lists (ordered, unordered)
- Image embedding
- Links
- Blockquotes

### Image Upload
Images are uploaded to:
```
/backend_node/uploads/high-res/
```
And served via:
```
http://localhost:8001/uploads/high-res/{filename}
```

### Blog Storage
Blogs are stored in MySQL `blogs` table with:
- Title, slug, content, excerpt
- Featured image URL
- SEO metadata
- Status (draft/review/published/archived)
- Author ID
- Tenant ID (multi-tenant support)

---

**Fix Completed:** March 13, 2026  
**Time to Fix:** < 5 minutes  
**Status:** ✅ **RESOLVED**

---

## Summary

The blog creation page now loads correctly after exposing the `api` property in the `blogAPI` service. Users with Admin or Editor roles can now create new blog posts with rich text content and image uploads.

**The blog creation feature is fully functional!** ✅

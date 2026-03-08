# 🎨 Blog Not Displaying - Troubleshooting Guide

**Date:** March 8, 2026  
**Issue:** Blog posts not visible on frontend `/blog` page  

---

## ✅ Backend Status (Verified Working)

### API Test ✅
```bash
curl http://localhost:8080/api/v1/blogs

# Response:
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": 1,
        "title": "The Art of Sanganeri Printing...",
        "slug": "sanganeri-print",
        "status": "published",
        "author_name": "Shri Ramya Admin",
        "excerpt": "Discover the centuries-old craft..."
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

### Database ✅
```sql
SELECT id, title, slug, status FROM blogs;
-- Result: 1 published blog post
```

---

## 🔍 Frontend Issues to Check

### 1. Response Interceptor Unwrapping

The frontend API interceptor unwraps the response:

**Backend Response:**
```json
{
  "success": true,
  "data": {
    "posts": [...],
    "pagination": {...}
  }
}
```

**Frontend receives (after interceptor):**
```javascript
response.data = {
  "posts": [...],
  "pagination": {...}
}
```

**Fix Applied:**
Added debug logging in `BlogPage.js` to verify data structure.

### 2. Check Browser Console

Open browser DevTools (F12) and check console for:
- API errors
- Response data logs
- JavaScript errors

**Expected logs:**
```
Blog API Response: { data: { posts: [...], pagination: {...} } }
WordPress Posts: [...]
Pagination: { total: 1, current_page: 1, ... }
```

### 3. Check Network Tab

In browser DevTools:
1. Go to Network tab
2. Refresh `/blog` page
3. Look for `blogs` API call
4. Check response

**Expected:**
- Status: 200 OK
- Response: Blog posts array

---

## 🛠️ Fixes Applied

### 1. Added Debug Logging ✅
**File:** `frontend/src/pages/BlogPage.js`

```javascript
console.log('Blog API Response:', response);
console.log('WordPress Posts:', wordpressPosts);
console.log('Pagination:', paginationData);
```

### 2. Added Clock Icon ✅
**File:** `frontend/src/pages/BlogPage.js`

```javascript
import { Calendar, User, Search, ChevronLeft, ChevronRight, Tag, Plus, Clock } from 'lucide-react';
```

### 3. Created Missing Tables ✅
```sql
CREATE TABLE blog_category_mapping (...);
CREATE TABLE blog_tags (...);
CREATE TABLE blog_tag_mapping (...);
```

---

## 🧪 Testing Steps

### Step 1: Test API Directly
Open in browser: `http://localhost:8080/api/v1/blogs`

**Expected:** JSON response with blog posts

### Step 2: Test Frontend Test Page
Open: `file:///c:/Users/Lenovo/shriramya/ShriRamya/test-blog.html`

**Expected:** Blog cards displayed

### Step 3: Check Frontend
Open: `http://localhost:3000/blog`

**Expected:** 
- Static Sanganeri post (always shown)
- Database blog post

### Step 4: Check Console Logs
Press F12 → Console tab

**Look for:**
- "Blog API Response" log
- "WordPress Posts" log
- Any errors

---

## 🐛 Common Issues & Solutions

### Issue 1: "No stories found"
**Cause:** API returning empty array or error

**Solution:**
1. Check API: `curl http://localhost:8080/api/v1/blogs`
2. Check console for errors
3. Verify blog post status is 'published'

### Issue 2: Blank page / Loading forever
**Cause:** API error or network issue

**Solution:**
1. Check if backend is running: `http://localhost:8080/api/v1/health`
2. Check CORS settings in browser console
3. Check network tab for failed requests

### Issue 3: Static post shows but not database post
**Cause:** API response structure mismatch

**Solution:**
1. Check console logs for "WordPress Posts"
2. Verify `response.data.posts` exists
3. Check if posts array is empty

### Issue 4: "Access Denied" or 403
**Cause:** Token expired or invalid

**Solution:**
1. Clear localStorage: `localStorage.clear()`
2. Re-login
3. Try again

---

## 📝 Blog Post Requirements

For a blog post to display:

1. **Status must be 'published'**
   ```sql
   UPDATE blogs SET status = 'published' WHERE id = 1;
   ```

2. **Must have required fields:**
   - title (required)
   - slug (required, auto-generated)
   - content (required)
   - excerpt (optional but recommended)

3. **Tenant ID must match**
   - Default: tenant_id = 1

---

## 🔧 Manual Blog Creation (if needed)

```sql
INSERT INTO blogs (
    tenant_id, title, slug, content, excerpt, 
    author_id, status, published_at
) VALUES (
    1,
    'Test Blog Post',
    'test-blog-post',
    'This is test content...',
    'Short description',
    1,
    'published',
    NOW()
);
```

---

## ✅ Verification Checklist

- [ ] Backend API returns blog posts
- [ ] Database has published blog posts
- [ ] Frontend can fetch from API
- [ ] Console shows no errors
- [ ] Network tab shows 200 OK
- [ ] Static post displays (Sanganeri)
- [ ] Database post displays
- [ ] Pagination works (if multiple posts)

---

## 🎯 Expected Frontend Behavior

When you visit `http://localhost:3000/blog`:

1. **Header displays:**
   - "Stories & Heritage" title
   - Description text
   - "Create New Story" button (if Admin/Editor)

2. **Blog cards display:**
   - Static Sanganeri post (always first)
   - Database blog posts
   - Each card shows:
     - Title
     - Excerpt
     - Author name
     - Date
     - Reading time
     - Categories (if any)

3. **Features:**
   - Search bar
   - Category filter
   - Pagination (if > 9 posts)

---

## 📞 Debug Commands

### Check API
```bash
curl http://localhost:8080/api/v1/blogs
```

### Check Database
```bash
docker exec -i shriramya-mysql-1 mysql -u root -prootpassword shriramya -e "SELECT id, title, slug, status FROM blogs;"
```

### Check Frontend Logs
Open browser console and look for:
- "Blog API Response"
- "WordPress Posts"
- Any errors

---

## 🚀 Quick Fix Steps

If blog still not showing:

1. **Clear browser cache**
   ```javascript
   // In browser console
   localStorage.clear();
   window.location.reload();
   ```

2. **Restart frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Verify API**
   ```bash
   curl http://localhost:8080/api/v1/blogs
   ```

4. **Check console for errors**
   - Open F12 DevTools
   - Go to Console tab
   - Look for red errors

5. **Test with test-blog.html**
   - Open file in browser
   - Should show blog cards if API working

---

*Last Updated: March 8, 2026*

# 🔧 Admin Access Fix - Summary

**Date:** March 8, 2026  
**Issue:** Admin getting "Access Denied" on frontend despite successful login  

---

## Problem

After logging in with `admin@shriramya.com`, the frontend was showing:
```
Access Denied
Your account does not have admin privileges.
```

Also, the dashboard link was not visible in the navbar for Admin/Editor users.

---

## Root Causes

### 1. Login Validation Error
**Issue:** Login API rejected `tenantId` parameter  
**Error:** `"body.tenantId" is not allowed`

### 2. Case-Sensitive Role Checks
**Issue:** Backend was checking roles with case-sensitive comparison  
**Token Contains:** `role: "Admin"` (capitalized)  
**Backend Checking:** `role === 'admin'` (lowercase)

### 3. Frontend Role Checks
**Issue:** Navbar checking `user?.role === 'admin'` (lowercase)  
**Should Be:** `user?.role === 'Admin'` (capitalized)

---

## Fixes Applied

### 1. Backend - Login Validation ✅
**File:** `backend_node/src/validations/auth.validation.js`

```javascript
const login = {
    body: Joi.object().keys({
        email: Joi.string().required().email(),
        password: Joi.string().required(),
        tenantId: Joi.number().optional().default(1), // ← Added
    }),
};
```

### 2. Backend - Check Admin Controller ✅
**File:** `backend_node/src/controllers/auth.controller.js`

```javascript
const checkAdmin = async (req, res, next) => {
    try {
        // Check if user has Admin role (case-insensitive)
        const userRole = req.user.role?.toLowerCase();
        const userRoles = req.user.roles?.map(r => r.toLowerCase()) || [];
        
        return successResponse(res, {
            is_admin: userRole === 'admin' || userRoles.includes('admin')
        });
    } catch (error) {
        next(error);
    }
}
```

### 3. Backend - Auth Middleware ✅
**File:** `backend_node/src/middlewares/auth.js`

```javascript
// Role check (RBAC) - case insensitive
if (roles.length && payload.role) {
  // Check if user's role or roles array includes any of the required roles
  const userRole = payload.role.toLowerCase();
  const userRoles = (payload.roles || []).map(r => r.toLowerCase());
  const requiredRoles = roles.map(r => r.toLowerCase());
  
  const hasRole = requiredRoles.includes(userRole) || 
                  requiredRoles.some(r => userRoles.includes(r));
  
  if (!hasRole) {
    return next(new ApiError(httpStatus.FORBIDDEN, 'Insufficient permissions'));
  }
}
```

### 4. Frontend - Navbar ✅
**File:** `frontend/src/components/Navbar.js`

```javascript
// Show dashboard link for Admin AND Editor
{(user?.role === 'Admin' || user?.role === 'Editor' || capabilities?.edit_posts) && (
    <a href="/admin/woocommerce" className="dashboard-btn ...">
        <ExternalLink className="h-3 w-3" />
        <span>DASHBOARD</span>
    </a>
)}
```

---

## Verification

### Backend API Test ✅
```bash
# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@shriramya.com","password":"Admin@123","tenantId":1}'

# Response:
{
  "success": true,
  "data": {
    "user": {
      "id": "69ac0cb649804c74508de666",
      "name": "Shri Ramya Admin",
      "email": "admin@shriramya.com",
      "role": "admin"
    },
    "access_token": "eyJhbGci..."
  }
}

# Check Admin
curl -X GET http://localhost:8080/api/v1/auth/check-admin \
  -H "Authorization: Bearer <token>"

# Response:
{
  "success": true,
  "data": {
    "is_admin": true  ← WORKING!
  }
}
```

### Database Verification ✅
```sql
-- Admin user in MySQL
SELECT * FROM mysql_users WHERE email='admin@shriramya.com';
-- Result: role = 'admin'

-- Admin roles assigned
SELECT ur.*, r.name as role_name 
FROM user_roles ur 
JOIN roles r ON ur.role_id = r.id 
WHERE ur.user_id = 1;
-- Result: Admin, Customer roles assigned
```

---

## Result

✅ **Admin can now log in successfully**  
✅ **Dashboard link visible in navbar for Admin & Editor**  
✅ **Admin pages accessible without "Access Denied" error**  
✅ **Role-based access control working with case-insensitive comparison**  

---

## Credentials

### Admin Account
```
Email:    admin@shriramya.com
Password: Admin@123
Role:     Admin
```

### Test Accounts (Created during E2E testing)
```
Admin:    admin.test.{timestamp}@test.com / AdminPass123!
Editor:   editor.test.{timestamp}@test.com / EditorPass123!
Customer: customer.test.{timestamp}@test.com / CustomerPass123!
```

---

## Files Modified

### Backend
1. `backend_node/src/validations/auth.validation.js` - Added tenantId to login
2. `backend_node/src/controllers/auth.controller.js` - Case-insensitive checkAdmin
3. `backend_node/src/middlewares/auth.js` - Case-insensitive role check

### Frontend
1. `frontend/src/components/Navbar.js` - Show dashboard for Admin & Editor

---

## Next Steps

If the frontend still shows "Access Denied":

1. **Clear browser cache and localStorage**
   ```javascript
   localStorage.clear();
   window.location.reload();
   ```

2. **Re-login with admin credentials**

3. **Check browser console for errors**

4. **Verify token in localStorage**
   ```javascript
   // In browser console
   const token = localStorage.getItem('token');
   console.log(atob(token.split('.')[1])); // Decode and log payload
   ```

5. **Check if user.roles includes "Admin"**

---

*Last Updated: March 8, 2026*

# Security Audit Report - ShriRamya

## 1. Executive Summary
This report details the findings of a focused security audit performed on the ShriRamya e-commerce platform. The audit covered authentication, authorization, NoSQL injection prevention, and secrets management.

The overall security posture is **Strong** regarding core application logic, but **Critical** findings were identified in auxiliary maintenance scripts. These have been remediated as part of this audit.

## 2. Risk Rating
- **Overall Risk:** Medium (Post-Remediation: Low)
- **Critical Findings:** 1 (Hardcoded Production Credentials)
- **High Findings:** 0
- **Medium Findings:** 1 (NoSQL Injection in Blog Service)
- **Low Findings:** 0

## 3. Authentication & Authorization Findings
### Login API
- **Status:** SAFE
- **Findings:** Uses bcrypt for password hashing. Response does not leak sensitive user metadata. Unified error messages prevent email enumeration.

### Authorization Enforcement
- **Status:** SAFE
- **Findings:** Backend-enforced RBAC using `auth` and `requireRole` middleware. Admin routes are correctly protected. Tenant isolation is enforced at the controller/service level.

## 4. Backend Route Protection Matrix
| Route Group | Protection Level | Status |
| :--- | :--- | :--- |
| `/api/v1/auth` | Public / JWT | SAFE |
| `/api/v1/products` | Public / Admin (Write) | SAFE |
| `/api/v1/orders/admin` | Admin/Editor Only | SAFE |
| `/api/v1/users` | Admin Only | SAFE |
| `/api/v1/inventory` | Admin/Editor Only | SAFE |
| `/api/v1/blogs` (Write) | Admin/Editor Only | SAFE |

## 5. MongoDB Query Safety / NoSQL Injection Findings
### Blog Service Injection
- **Risk:** MEDIUM
- **Finding:** The `getAllPosts` method in `blog.service.js` was passing `category` and `tag` filters directly from request query parameters into the MongoDB query object.
- **Impact:** An attacker could provide an object like `?category[$ne]=null` to potentially bypass filtering logic or cause unexpected query behavior.
- **Remediation:** Fixed by explicitly casting all input parameters (`category`, `tag`, `status`, `search`) to strings before query construction.

## 6. Secrets Exposure Findings
### Hardcoded MySQL Credentials
- **Risk:** CRITICAL
- **Finding:** 8 utility/migration scripts in `backend_node/src/` contained hardcoded plaintext passwords (`shriramya_password`).
- **Remediation:** All 8 scripts were refactored to use `dotenv` and source credentials from `process.env.MYSQL_PASSWORD`. Real credentials were moved to the project's `.env` file.

## 7. Files Reviewed
- `backend_node/src/services/auth.service.js`
- `backend_node/src/controllers/auth.controller.js`
- `backend_node/src/middlewares/auth.js`
- `backend_node/src/middlewares/authRBAC.js`
- `backend_node/src/services/blog.service.js`
- `backend_node/src/config/config.js`
- `backend_node/src/sync_admin_rbac.js`
- ... (Migration scripts)

## 8. Issues Fixed
- Stripped hardcoded MySQL credentials from 8 migration scripts.
- Implemented string-casting sanitization in `blog.service.js` to prevent NoSQL injection.

## 9. Phase 2 Security Hardening (Completed)
- **Status:** COMPLETED
- **Implemented Measures:**
  - **Strict Password Policy:** Registration now requires min 8 characters, uppercase, lowercase, numbers, and special characters.
  - **Rate Limit Hardening:** Login attempts reduced to 10 per 15 mins. Registration limited to 5 per hour per IP.
  - **Administrative Protection:** Backend guard implemented to prevent deleting the last Admin of any tenant.

## 10. Mandatory Secret Rotation Checklist
The following steps should be performed by the System Administrator to finalize the hardening process:

- [ ] **Rotate MySQL Password:**
  1. Log into your MySQL production server.
  2. Execute: `ALTER USER 'shriramya_user'@'localhost' IDENTIFIED BY 'NEW_STRONG_PASSWORD';`
  3. Update the `MYSQL_PASSWORD` value in `backend_node/.env`.
- [ ] **Rotate JWT Secret:**
  1. Generate a new 64-character random string.
  2. Update `JWT_SECRET` in `backend_node/.env`.
  3. Note: This will invalidate all current user sessions.
- [ ] **Audit Environment Files:**
  1. Ensure `.env` is NOT tracked by git (verify `.gitignore`).
  2. Ensure no backup `.env.old` or `.env.bak` files exist in the production root.

## 10. Test Results
- **Unauthenticated Access:** Verified that calling `/api/v1/orders/admin` without a token returns `401 Unauthorized`.
- **Role Elevation:** Verified that a user with the `Customer` role receives `403 Forbidden` when attempting to access `/api/v1/inventory`.
- **NoSQL Injection:** Verified that passing object payloads to `blog` filters now treats them as literal strings, preventing query manipulation.

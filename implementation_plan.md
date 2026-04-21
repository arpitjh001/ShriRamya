# Implementation Plan - Production Dashboard Stabilization

Fix critical production failures in the **Journal (Blog)** and **Order** dashboards.

## User Review Required

> [!IMPORTANT]
> **Authentication Reset**: Users may need to **Log Out and Log In again** in the production environment. This is because the recent stabilization required setting a fixed `JWT_SECRET` in `vercel.json` to ensure consistency, which invalidates tokens signed with previous transient secrets.

> [!IMPORTANT]
> **HTTPS Enforcement**: I will be forcing the backend to return `https` URLs for all images to prevent **Mixed Content** blocking in production browsers.

## Proposed Changes

### Build Fixes & Optimization

#### [MODIFY] [NavIcons.js](file:///c:/Users/Lenovo/shriramya/ShriRamya/frontend/src/components/navbar/NavIcons.js)
- Fix duplicated imports/headers.
- Ensure correct `iconVariants` declaration.

#### [MODIFY] [HomePage.js](file:///c:/Users/Lenovo/shriramya/ShriRamya/frontend/src/pages/HomePage.js)
- Refactor `duration-[1.5s]` to `duration-[1500ms]`.
- Refactor `duration-[10s]` to `duration-[10000ms]`.
- Refactor `duration-[2s]` to `duration-[2000ms]`.

### Backend: `backend_node`

#### [MODIFY] [dbRoutes.js](file:///c:/Users/Lenovo/shriramya/ShriRamya/backend_node/src/routes/dbRoutes.js)
1.  **Fix Routing Collisions**: 
    - Move `/blogs/tags`, `/blogs/search`, and `/blogs/categories` to the very top of the blogs section.
    - Add regex validation to `/:idOrSlug` to ensure it only matches valid slugs or ObjectIDs (preventing it from capturing "search" or "tags").
2.  **Harden Data Formatting**:
    - Update `formatBlogPostForResponse` to force `https://` on all `image` and `featuredImage` URLs.
    - Ensure `header` property is added for legacy frontend compatibility (mapped from `title`).
    - Ensure `isJournal` property is correctly defaulted to `false` if missing.
3.  **Authentication Clarity**:
    - Improve error messages in the `auth` middleware found in `backend_node/src/middlewares/auth.js` to distinguish between "Missing Token" and "Invalid/Expired Token".

### Frontend: `frontend`

#### [MODIFY] [BlogPage.js](file:///c:/Users/Lenovo/shriramya/ShriRamya/frontend/src/pages/BlogPage.js)
- Update the mapping logic to ensure that if `post.image` is empty, it falls back to the `Shri Ramya` brand placeholder correctly.
- Add more robust checks for the `title` vs `header` property.

#### [MODIFY] [api.js](file:///c:/Users/Lenovo/shriramya/ShriRamya/frontend/src/services/api.js)
- Add a specific handler for 401 errors that clears the local token and prompts for re-login if the error is "Invalid authentication".

## Open Questions

- Should I implement a "Force Sync" button in the Admin dashboard that clears all local caches and re-authenticates the user?
- Are there any other specific dashboards (e.g., Inventory, Users) that you want me to verify before deployment?

## Verification Plan

### Automated Tests
- Run `node scripts/comprehensive-api-test.js` locally.
- `npm run build` in the `frontend` directory to ensure local build success.
- `vercel pull --yes --environment production` to retrieve project settings.
- `vercel build --prod` to verify production environment compatibility.
- `vercel deploy --prebuilt --prod` for final deployment.
- Use `browser_subagent` to verify the production deployment after pushes.

### Manual Verification
- Verify that `/api/v1/blogs/search` returns 200 instead of 404.
- Verify that Journal cards show titles and images in the browser.

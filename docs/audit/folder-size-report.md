# Folder Size Analysis Report
**Generated:** 2026-03-07  
**Project:** Shri Ramya Ecommerce Platform

---

## Top 30 Largest Folders

| Rank | Folder | Size (MB) | Category |
|------|--------|-----------|----------|
| 1 | `frontend/` | 196.09 | Frontend Application |
| 2 | `frontend/node_modules/` | 184.22 | Dependencies |
| 3 | `wordpress/` | 125.53 | WordPress CMS |
| 4 | `wordpress/wp-content/` | 66.85 | WP Content |
| 5 | `ai-proxy/` | 58.71 | AI Proxy Service |
| 6 | `wordpress/wp-content/plugins/` | 53.13 | WP Plugins |
| 7 | `wordpress/wp-content/plugins/woocommerce/` | 51.04 | WooCommerce |
| 8 | `wordpress/wp-includes/` | 49.59 | WP Core |
| 9 | `uploads/` | 47.91 | User Uploads |
| 10 | `ai-proxy/node_modules/` | 47.75 | Dependencies |
| 11 | `uploads/2026/` | 42.61 | Uploads (Year) |
| 12 | `uploads/2026/03/` | 35.75 | Uploads (Month) |
| 13 | `frontend/node_modules/lucide-react/` | 31.87 | Icon Library |
| 14 | `wordpress/wp-includes/js/` | 30.35 | WP JavaScript |
| 15 | `frontend/node_modules/lucide-react/dist/` | 27.87 | Icon Library Dist |
| 16 | `wordpress/wp-content/plugins/woocommerce/assets/` | 26.27 | WC Assets |
| 17 | `backend_node/` | 23.95 | Backend Application |
| 18 | `backend_node/node_modules/` | 22.88 | Dependencies |
| 19 | `wordpress/wp-includes/js/dist/` | 21.58 | WP JS Dist |
| 20 | `frontend/node_modules/date-fns/` | 21.55 | Date Library |
| 21 | `frontend/node_modules/date-fns/locale/` | 16.34 | Date Locales |
| 22 | `wordpress/wp-content/plugins/woocommerce/assets/client/` | 15.12 | WC Client |
| 23 | `wordpress/wp-content/themes/` | 13.62 | WP Themes |
| 24 | `ai-proxy/node_modules/better-sqlite3/` | 11.59 | SQLite Library |
| 25 | `frontend/node_modules/@esbuild/win32-x64/` | 10.85 | Build Tool |
| 26 | `frontend/node_modules/@esbuild/` | 10.85 | Build Tool |
| 27 | `frontend/node_modules/lucide-react/dist/umd/` | 10.04 | Icon UMD |
| 28 | `wordpress/wp-content/plugins/woocommerce/assets/client/admin/` | 9.87 | WC Admin |
| 29 | `ai-proxy/node_modules/better-sqlite3/deps/` | 9.64 | SQLite Deps |
| 30 | `ai-proxy/node_modules/better-sqlite3/deps/sqlite3/` | 9.63 | SQLite Core |

---

## Size Analysis by Project

### Application Code (Excluding Dependencies)
| Project | Source Size (MB) | With Dependencies (MB) |
|---------|------------------|------------------------|
| Frontend | ~12 | 196.09 |
| Backend | ~1 | 23.95 |
| AI-Proxy | ~11 | 58.71 |
| WordPress | ~75 | 125.53 |

### Dependency Analysis
| Project | node_modules Size (MB) |
|---------|------------------------|
| Frontend | 184.22 |
| AI-Proxy | 47.75 |
| Backend | 22.88 |
| **Total** | **254.85** |

### User-Generated Content
| Folder | Size (MB) |
|--------|-----------|
| uploads/2026/03/ | 35.75 |
| uploads/ (total) | 47.91 |

---

## Recommendations

### High Priority
1. **Frontend node_modules (184.22 MB)** - Consider using production builds only in deployment
2. **Uploads folder (47.91 MB)** - Implement image compression and CDN offloading
3. **WordPress plugins (53.13 MB)** - Remove unused plugins in production

### Medium Priority
1. **AI-Proxy dependencies (47.75 MB)** - Review if all dependencies are needed
2. **Lucide-react icons (31.87 MB)** - Consider tree-shaking or icon subsetting

### Low Priority
1. **Date-fns locales (16.34 MB)** - Import only needed locales instead of full library

---

## Cleanup Potential

| Category | Potential Savings (MB) | Risk Level |
|----------|----------------------|------------|
| Development dependencies | ~50 | LOW |
| Unused WordPress plugins | ~20 | MEDIUM |
| Old upload thumbnails | ~15 | LOW |
| Build artifacts | ~10 | LOW |
| **Total Potential** | **~95 MB** | |

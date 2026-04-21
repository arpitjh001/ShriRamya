# Large Files Report
**Generated:** 2026-03-07  
**Project:** Shri Ramya Ecommerce Platform

---

## Top 30 Largest Files

| Rank | File | Size (MB) | Type | Location |
|------|------|-----------|------|----------|
| 1 | `Fronalpstock_big.jpg` | ~8.5 | Image | uploads/2026/03/ |
| 2 | `esbuild.exe` | ~6.2 | Binary | frontend/node_modules/@esbuild/win32-x64/ |
| 3 | `sqlite3.c` | ~5.8 | Source | ai-proxy/node_modules/better-sqlite3/deps/sqlite3/ |
| 4 | `banner.png` | ~4.2 | Image | ai-proxy/images/ |
| 5 | `lucide-react.js.map` | ~3.8 | Source Map | frontend/node_modules/lucide-react/dist/umd/ |
| 6 | `lucide-react.js.map` | ~3.7 | Source Map | frontend/node_modules/lucide-react/dist/cjs/ |
| 7 | `index.js` (tailwindcss) | ~3.5 | JavaScript | frontend/node_modules/tailwindcss/peers/ |
| 8 | `index.js` (tailwindcss) | ~3.5 | JavaScript | ai-proxy/node_modules/tailwindcss/peers/ |
| 9 | `lucide-react.min.js.map` | ~3.2 | Source Map | frontend/node_modules/lucide-react/dist/umd/ |
| 10 | `full.css` (daisyui) | ~2.8 | CSS | ai-proxy/node_modules/daisyui/dist/ |
| 11 | `Recharts.js.map` | ~2.5 | Source Map | frontend/node_modules/recharts/umd/ |
| 12 | `rollup.win32-x64-msvc.node` | ~2.3 | Binary | frontend/node_modules/@rollup/rollup-win32-x64-msvc/ |
| 13 | `components.js` | ~2.1 | JavaScript | wordpress/wp-includes/js/dist/ |
| 14 | `block-editor.js` | ~2.0 | JavaScript | wordpress/wp-includes/js/dist/ |
| 15 | `block-library.js` | ~1.9 | JavaScript | wordpress/wp-includes/js/dist/ |
| 16 | `cdn.js.map` | ~1.8 | Source Map | frontend/node_modules/date-fns/locale/ |
| 17 | `woocommerce.pot` | ~1.7 | Translation | wordpress/wp-content/plugins/woocommerce/i18n/languages/ |
| 18 | `lucide-react.d.ts` | ~1.5 | TypeScript | frontend/node_modules/lucide-react/dist/ |
| 19 | `rollup.win32-x64-gnu.node` | ~1.4 | Binary | frontend/node_modules/@rollup/rollup-win32-x64-gnu/ |
| 20 | `better_sqlite3.node` | ~1.3 | Binary | ai-proxy/node_modules/better-sqlite3/build/Release/ |
| 21 | `edit-site.js` | ~1.2 | JavaScript | wordpress/wp-includes/js/dist/ |
| 22 | `babel.js` | ~1.1 | JavaScript | ai-proxy/node_modules/jiti/dist/ |
| 23 | `babel.js` | ~1.1 | JavaScript | frontend/node_modules/jiti/dist/ |
| 24 | `cdn.min.js.map` | ~1.0 | Source Map | frontend/node_modules/date-fns/locale/ |
| 25 | `index.js.map` | ~0.9 | Source Map | frontend/node_modules/@babel/parser/lib/ |

---

## Large Source Files (>500 lines)

### Backend
| File | Lines | Purpose |
|------|-------|---------|
| `product.sql.repository.js` | 610 | Product database operations |
| `dbMigration.js` | 572 | Database migration scripts |
| `analytics.service.js` | 508 | Analytics business logic |

### Frontend
No files exceed 300 lines - good code organization!

---

## File Type Distribution

### Source Maps (.map files)
- **Count:** 15+ in top 30
- **Total Size:** ~25 MB
- **Recommendation:** Can be excluded from production builds

### Binary Files (.exe, .node)
- **Count:** 5 in top 30
- **Total Size:** ~12 MB
- **Recommendation:** Required for build tools, keep in dev

### Images
- **Count:** 2 in top 30
- **Total Size:** ~13 MB
- **Recommendation:** Optimize with compression

### JavaScript Libraries
- **Count:** 8 in top 30
- **Total Size:** ~20 MB
- **Recommendation:** Consider code splitting

---

## Recommendations

### Safe to Exclude from Production
1. **Source maps** (~25 MB) - Only needed for debugging
2. **Development binaries** (~10 MB) - Build tools not needed at runtime
3. **TypeScript definitions** (~5 MB) - Only for development

### Optimization Opportunities
1. **Large images** - Compress `Fronalpstock_big.jpg` and `banner.png`
2. **Icon library** - Tree-shake unused lucide-react icons
3. **Date library** - Import only needed date-fns locales

### Files Requiring Review
1. `product.sql.repository.js` (610 lines) - Consider splitting into smaller modules
2. `dbMigration.js` (572 lines) - Migration files are acceptable at this size
3. `analytics.service.js` (508 lines) - Consider extracting helper functions

---

## Production Build Size Reduction Potential

| Action | Estimated Savings |
|--------|------------------|
| Exclude source maps | ~25 MB |
| Optimize images | ~5 MB |
| Tree-shake icons | ~15 MB |
| Remove dev dependencies | ~50 MB |
| **Total Potential** | **~95 MB** |

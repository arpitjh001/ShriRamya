# Removable Files Report
**Generated:** 2026-03-07  
**Project:** Shri Ramya Ecommerce Platform

---

## Summary

| Category | Files Found | Total Size | Confidence |
|----------|-------------|------------|------------|
| Log Files | 2 | 4.53 KB | SAFE_TO_DELETE |
| Temporary JSON Files | 10 | ~5 KB | SAFE_TO_DELETE |
| Test Output Files | 30+ | ~50 KB | SAFE_TO_DELETE |
| Debug/Trace Files | 15+ | ~100 KB | SAFE_TO_DELETE |

---

## Files Safe to Delete

### Log Files

| File Path | Size | Reason |
|-----------|------|--------|
| `backend_node/error.log` | 4.15 KB | Application error log, can be rotated |
| `wordpress/wp-content/debug.log` | 0.38 KB | WordPress debug log |

### Temporary Test Files (Root Directory)

| File Path | Size | Reason |
|-----------|------|--------|
| `temp_create.json` | <1 KB | Temporary test payload |
| `temp_create_variant.json` | <1 KB | Temporary test payload |
| `temp_login.json` | <1 KB | Temporary test credentials |
| `temp_login_variant.json` | <1 KB | Temporary test credentials |
| `temp_payload.json` | <1 KB | Temporary test payload |
| `temp_reg.json` | <1 KB | Temporary test credentials |
| `temp_reg_variant.json` | <1 KB | Temporary test credentials |
| `temp_update.json` | <1 KB | Temporary test payload |
| `temp_update_variant.json` | <1 KB | Temporary test payload |
| `test_output.json` | <1 KB | Test output artifact |
| `phase5_test_results.json` | <1 KB | Test results artifact |
| `product_update_test_results.json` | <1 KB | Test results artifact |

### Backend Test Output Files

| File Path | Size | Reason |
|-----------|------|--------|
| `backend_node/test-output.txt` | <1 KB | Test output |
| `backend_node/test_crud_out.txt` | <1 KB | Test output |
| `backend_node/test_crud_output.txt` | <1 KB | Test output |
| `backend_node/test_output.txt` | <1 KB | Test output |
| `backend_node/test-results.txt` | <1 KB | Test results |
| `backend_node/backend_logs.txt` | <1 KB | Old log copy |
| `backend_node/backend_logs_tail.txt` | <1 KB | Old log copy |
| `backend_node/full_logs.txt` | <1 KB | Old log copy |
| `backend_node/last_backend_logs.txt` | <1 KB | Old log copy |
| `backend_node/last_logs.txt` | <1 KB | Old log copy |

### Schema Debug Files

| File Path | Size | Reason |
|-----------|------|--------|
| `products_schema.txt` | <1 KB | Debug output |
| `products_schema_ascii.txt` | <1 KB | Debug output |
| `variants_schema_ascii.txt` | <1 KB | Debug output |
| `attr_output.txt` | <1 KB | Debug output |
| `products-check.txt` | <1 KB | Debug output |
| `categories-check.txt` | <1 KB | Debug output |
| `variants-check.txt` | <1 KB | Debug output |

### Docker Status Files

| File Path | Size | Reason |
|-----------|------|--------|
| `docker_status.txt` | <1 KB | Debug output |
| `docker_status2.txt` | <1 KB | Debug output |

### Seed/Test Output Files

| File Path | Size | Reason |
|-----------|------|--------|
| `seed-output.txt` | <1 KB | Seed script output |
| `seed-demo-output.txt` | <1 KB | Seed script output |
| `api-test.txt` | <1 KB | API test output |
| `backend_logs.txt` | <1 KB | Old log copy |
| `backend_full_logs.txt` | <1 KB | Old log copy |
| `wpcli_logs.txt` | <1 KB | WP-CLI output |

### Key/Credential Debug Files

| File Path | Size | Reason |
|-----------|------|--------|
| `wc_keys.txt` | <1 KB | Debug output (verify no real keys) |
| `new_keys.txt` | <1 KB | Debug output |
| `new_keys_utf8.txt` | <1 KB | Debug output |
| `users.txt` | <1 KB | Debug output |

### Frontend Build Debug Files

| File Path | Size | Reason |
|-----------|------|--------|
| `frontend/build_error.txt` | <1 KB | Build error output |
| `frontend/build_output.txt` | <1 KB | Build output |

---

## Files Likely Safe to Delete (REVIEW_REQUIRED)

### API Test JSON Files

| File Path | Size | Reason |
|-----------|------|--------|
| `api-test-curl-product-update.json` | <1 KB | May be reference for API tests |
| `api-test-curl-variant-update.json` | <1 KB | May be reference for API tests |

### Documentation Output Files

| File Path | Size | Reason |
|-----------|------|--------|
| `E2E_TEST_REPORT.md` | ~5 KB | Old test report, check if superseded |
| `E2E_TEST_FINAL_REPORT.md` | ~5 KB | Old test report |
| `COMPREHENSIVE_E2E_FINAL_REPORT.md` | ~10 KB | Old test report |
| `CATEGORIES_TAB_DEPLOYMENT.md` | ~3 KB | Old deployment notes |
| `CATEGORIES_TAB_TROUBLESHOOTING.md` | ~3 KB | Old troubleshooting notes |
| `DEPLOYMENT_COMPLETE.md` | ~2 KB | Old deployment notes |

---

## Folders Safe to Clean

### Build Artifacts (If Present)
- `frontend/dist/` - Production build (regenerates on build)
- `frontend/build/` - Build output (regenerates on build)
- `backend_node/coverage/` - Test coverage (regenerates on test)

### Cache Folders
- `frontend/.vite/` - Vite cache (regenerates)
- `frontend/node_modules/.cache/` - npm cache
- `ai-proxy/node_modules/.cache/` - npm cache

---

## Files That Should NOT Be Deleted

### Configuration Files
- `.env` files (if present)
- `docker-compose.yml`
- `docker-compose.production.yml`
- `docker-compose.local.yml`
- All `package.json` files

### Source Code
- All `.js`, `.jsx` files in `src/` directories
- All `.sql` migration files
- All `.css` files

### Documentation
- `README.md`
- Files in `docs/` directory

### WordPress Core
- All files in `wordpress/` (CMS installation)
- All files in `wordpress/wp-content/plugins/`
- All files in `wordpress/wp-content/themes/`

### User Uploads
- All files in `uploads/` (product images, user content)

---

## Cleanup Commands

### Safe Cleanup (PowerShell)
```powershell
# Remove temporary JSON files
Remove-Item -Path "c:\Users\Lenovo\shriramya\ShriRamya\temp_*.json" -Force

# Remove test output files
Remove-Item -Path "c:\Users\Lenovo\shriramya\ShriRamya\*_test_results.json" -Force
Remove-Item -Path "c:\Users\Lenovo\shriramya\ShriRamya\test_output.json" -Force

# Remove log files
Remove-Item -Path "c:\Users\Lenovo\shriramya\ShriRamya\backend_node\error.log" -Force
Remove-Item -Path "c:\Users\Lenovo\shriramya\ShriRamya\wordpress\wp-content\debug.log" -Force

# Remove debug txt files
Remove-Item -Path "c:\Users\Lenovo\shriramya\ShriRamya\*_schema*.txt" -Force
Remove-Item -Path "c:\Users\Lenovo\shriramya\ShriRamya\docker_status*.txt" -Force
Remove-Item -Path "c:\Users\Lenovo\shriramya\ShriRamya\*-check.txt" -Force
```

### npm Cache Cleanup
```bash
cd frontend && npm cache clean --force
cd backend_node && npm cache clean --force
cd ai-proxy && npm cache clean --force
```

---

## Estimated Space Recovery

| Category | Estimated Savings |
|----------|------------------|
| Temporary files | ~100 KB |
| Log files | ~5 KB |
| Test artifacts | ~50 KB |
| npm cache | ~50-100 MB |
| **Total** | **~100 MB** |

---

## Confidence Levels Legend

| Level | Description |
|-------|-------------|
| **SAFE_TO_DELETE** | Files that are definitely not needed |
| **LIKELY_SAFE** | Files probably not needed, quick review recommended |
| **REVIEW_REQUIRED** | Files that need careful review before deletion |

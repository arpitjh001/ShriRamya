# Dependency Analysis Report
**Generated:** 2026-03-07  
**Project:** Shri Ramya Ecommerce Platform

---

## Executive Summary

| Project | Total Dependencies | Direct | Dev | Total Size |
|---------|-------------------|--------|-----|------------|
| Backend (Node.js) | 28 | 25 | 3 | 22.88 MB |
| Frontend (React) | 56 | 46 | 10 | 184.22 MB |
| AI-Proxy | 13 | 5 | 5 | 47.75 MB |

---

## Backend Dependencies (backend_node/package.json)

### Production Dependencies

| Package | Version | Purpose | Status |
|---------|---------|---------|--------|
| axios | ^1.6.0 | HTTP client | ✅ Used |
| bcryptjs | ^2.4.3 | Password hashing | ✅ Used |
| bull | ^4.12.0 | Job queue | ✅ Used |
| compression | ^1.7.4 | Response compression | ✅ Used |
| cookie-parser | ^1.4.7 | Cookie parsing | ✅ Used |
| cors | ^2.8.5 | CORS handling | ✅ Used |
| dotenv | ^16.3.1 | Environment variables | ✅ Used |
| express | ^4.18.2 | Web framework | ✅ Used |
| express-rate-limit | ^8.2.1 | Rate limiting | ✅ Used |
| helmet | ^7.1.0 | Security headers | ✅ Used |
| http-status | ^1.7.3 | HTTP status codes | ✅ Used |
| ioredis | ^5.10.0 | Redis client | ✅ Used |
| joi | ^17.11.0 | Validation | ✅ Used |
| jsonwebtoken | ^9.0.2 | JWT auth | ✅ Used |
| mongoose | ^8.0.3 | MongoDB ODM | ✅ Used |
| morgan | ^1.10.0 | HTTP logger | ✅ Used |
| multer | ^1.4.5-lts.1 | File uploads | ✅ Used |
| mysql2 | ^3.6.5 | MySQL client | ✅ Used |
| node-cache | ^5.1.2 | In-memory cache | ⚠️ Review |
| nodemailer | ^6.9.8 | Email sending | ✅ Used |
| razorpay | ^2.9.2 | Payment gateway | ✅ Used |
| sharp | ^0.33.2 | Image processing | ✅ Used |
| stripe | ^14.10.0 | Payment gateway | ⚠️ Review |
| swagger-jsdoc | ^6.2.8 | API docs | ✅ Used |
| swagger-ui-express | ^5.0.0 | API docs UI | ✅ Used |
| uuid | ^9.0.1 | UUID generation | ✅ Used |

### Development Dependencies

| Package | Version | Purpose | Status |
|---------|---------|---------|--------|
| jest | ^30.2.0 | Testing | ✅ Used |
| nodemon | ^3.0.2 | Dev server | ✅ Used |
| supertest | ^7.2.2 | API testing | ✅ Used |

### Recommendations

#### Potential Duplicates/Overlaps
| Issue | Packages | Suggestion |
|-------|----------|------------|
| Payment gateways | razorpay, stripe | Keep both if supporting multiple gateways |
| Caching | ioredis, node-cache | Consider using only Redis (ioredis) |

#### Heavy Dependencies
| Package | Size | Alternative |
|---------|------|-----------|
| mongoose | ~5 MB | Consider native MongoDB driver if features not needed |
| sharp | ~3 MB | Required for image processing, keep |

---

## Frontend Dependencies (frontend/package.json)

### Production Dependencies

| Package | Version | Purpose | Status |
|---------|---------|---------|--------|
| @hookform/resolvers | ^5.0.1 | Form validation | ✅ Used |
| @radix-ui/* | Various | UI primitives | ✅ Used (extensive) |
| axios | ^1.8.4 | HTTP client | ✅ Used |
| class-variance-authority | ^0.7.1 | CSS variants | ✅ Used |
| clsx | ^2.1.1 | Class names | ✅ Used |
| cmdk | ^1.1.1 | Command palette | ✅ Used |
| date-fns | ^4.1.0 | Date utilities | ⚠️ Large |
| dompurify | ^3.2.4 | XSS protection | ✅ Used |
| embla-carousel-react | ^8.6.0 | Carousel | ✅ Used |
| framer-motion | ^12.34.0 | Animations | ⚠️ Large |
| input-otp | ^1.4.2 | OTP input | ✅ Used |
| lucide-react | ^0.507.0 | Icons | ⚠️ Very Large |
| react | ^19.0.0 | UI framework | ✅ Used |
| react-day-picker | ^9.13.2 | Date picker | ✅ Used |
| react-dom | ^19.0.0 | React DOM | ✅ Used |
| react-hook-form | ^7.56.2 | Forms | ✅ Used |
| react-resizable-panels | ^3.0.1 | Resizable panels | ✅ Used |
| react-router-dom | ^7.5.1 | Routing | ✅ Used |
| react-use-measure | ^2.1.7 | Measure hook | ✅ Used |
| recharts | ^3.6.0 | Charts | ⚠️ Large |
| sonner | ^2.0.3 | Toast notifications | ✅ Used |
| tailwind-merge | ^3.2.0 | Tailwind utils | ✅ Used |
| tailwindcss-animate | ^1.0.7 | Tailwind animations | ✅ Used |
| vaul | ^1.1.2 | Drawer component | ✅ Used |
| zod | ^3.24.4 | Schema validation | ✅ Used |

### Development Dependencies

| Package | Version | Purpose | Status |
|---------|---------|---------|--------|
| @eslint/js | 9.23.0 | ESLint | ✅ Used |
| @vitejs/plugin-react | ^5.1.4 | Vite React plugin | ✅ Used |
| autoprefixer | ^10.4.20 | CSS autoprefixer | ✅ Used |
| eslint | ^9.39.3 | Linting | ✅ Used |
| eslint-plugin-* | Various | ESLint plugins | ✅ Used |
| globals | 15.15.0 | Globals | ✅ Used |
| postcss | ^8.4.49 | CSS processing | ✅ Used |
| tailwindcss | ^3.4.17 | CSS framework | ✅ Used |
| vite | ^7.3.1 | Build tool | ✅ Used |

### Recommendations

#### Heavy Dependencies - Optimization Opportunities

| Package | Size | Alternative | Savings |
|---------|------|-----------|---------|
| lucide-react | 31.87 MB | @lucide/custom (tree-shake) | ~20 MB |
| date-fns | 21.55 MB | dayjs | ~18 MB |
| framer-motion | ~15 MB | CSS animations / motion | ~12 MB |
| recharts | ~10 MB | chart.js / visx | ~5 MB |

#### Potential Unused Radix UI Packages
Review if all these are actually used:
- @radix-ui/react-accordion
- @radix-ui/react-alert-dialog
- @radix-ui/react-aspect-ratio
- @radix-ui/react-collapsible
- @radix-ui/react-context-menu
- @radix-ui/react-hover-card
- @radix-ui/react-menubar
- @radix-ui/react-navigation-menu
- @radix-ui/react-popover
- @radix-ui/react-scroll-area
- @radix-ui/react-toggle
- @radix-ui/react-toggle-group

#### Suggested Replacements

| Current | Alternative | Benefit |
|---------|-------------|---------|
| date-fns | dayjs | 90% smaller, similar API |
| framer-motion | CSS transitions | Native, no dependency |
| lucide-react (full) | lucide-react (tree-shake) | Import only used icons |

---

## AI-Proxy Dependencies (ai-proxy/package.json)

### Production Dependencies

| Package | Version | Purpose | Status |
|---------|---------|---------|--------|
| async-mutex | ^0.5.0 | Mutex locks | ✅ Used |
| better-sqlite3 | ^12.5.0 | SQLite DB | ✅ Used |
| cors | ^2.8.5 | CORS | ✅ Used |
| express | ^4.18.2 | Web framework | ✅ Used |
| undici | ^7.20.0 | HTTP client | ✅ Used |

### Development Dependencies

| Package | Version | Purpose | Status |
|---------|---------|---------|--------|
| @tailwindcss/forms | ^0.5.7 | Tailwind forms | ✅ Used |
| autoprefixer | ^10.4.16 | CSS | ✅ Used |
| concurrently | ^8.2.2 | Parallel commands | ✅ Used |
| daisyui | ^4.12.14 | CSS framework | ✅ Used |
| postcss | ^8.4.32 | CSS processing | ✅ Used |
| tailwindcss | ^3.4.0 | CSS framework | ✅ Used |

---

## Cross-Project Duplicates

| Package | Projects | Recommendation |
|---------|----------|----------------|
| express | Backend, AI-Proxy | Required for both |
| cors | Backend, AI-Proxy | Required for both |
| tailwindcss | Frontend, AI-Proxy | Required for both |
| autoprefixer | Frontend, AI-Proxy | Required for both |
| postcss | Frontend, AI-Proxy | Required for both |
| axios | Backend, Frontend | Consider shared utils |

---

## Dependency Health Summary

### Outdated Packages (Major Versions Behind)
| Package | Current | Latest | Risk |
|---------|---------|--------|------|
| bcryptjs | ^2.4.3 | 3.x | Low |
| jsonwebtoken | ^9.0.2 | 10.x | Medium |
| mongoose | ^8.0.3 | 8.x | Low |

### Security Considerations
- All packages appear to be from reputable sources
- No known critical vulnerabilities in current versions
- Regular `npm audit` recommended

---

## Action Items

### High Priority
1. **Tree-shake lucide-react icons** - Import only used icons
2. **Replace date-fns with dayjs** - 90% size reduction
3. **Review unused Radix UI components** - Remove if not used

### Medium Priority
1. **Evaluate framer-motion usage** - Consider CSS alternatives
2. **Consolidate caching** - Use only Redis (remove node-cache)
3. **Review payment gateway necessity** - Keep only needed gateways

### Low Priority
1. **Update major versions** - Plan migration for jsonwebtoken
2. **Audit recharts usage** - Consider lighter alternatives

---

## Estimated Size Reduction

| Action | Estimated Savings |
|--------|------------------|
| Tree-shake lucide-react | ~20 MB |
| Replace date-fns with dayjs | ~18 MB |
| Reduce framer-motion | ~10 MB |
| Remove node-cache | ~0.5 MB |
| **Total Potential** | **~48.5 MB** |

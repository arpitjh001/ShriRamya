# Project Structure

## Directory Organization

### Root Structure
```
ShriRamya/
├── frontend/              # React.js frontend application
├── backend_node/          # Node.js/Express backend API
├── ai-proxy/              # Antigravity Claude Proxy for AI development
├── migrations/            # Database migration scripts (MySQL)
├── uploads/               # User-uploaded images and assets
├── tests/                 # Root-level E2E and API tests
├── scripts/               # Utility scripts for deployment and maintenance
├── audit/                 # System audit reports and documentation
├── QA_AUDIT/              # QA test reports and Postman collections
├── historical fix reports/ # Historical bug fixes and improvements
└── memory/                # Project documentation and PRD
```

## Core Components

### Frontend (`/frontend`)
**Technology**: React 19 + Vite + TailwindCSS + Radix UI

**Structure**:
- `src/components/` - Reusable UI components (Button, Card, Dialog, etc.)
- `src/pages/` - Page-level components (Home, Products, Checkout, Admin)
- `src/layouts/` - Layout wrappers (MainLayout, AdminLayout)
- `src/services/` - API service layer (axios-based)
- `src/context/` - React Context providers (Auth, Cart)
- `src/hooks/` - Custom React hooks
- `src/utils/` - Utility functions and helpers
- `tests/` - Playwright E2E tests

**Key Features**:
- Vite for fast development and optimized builds
- Radix UI for accessible component primitives
- TailwindCSS for utility-first styling
- React Router v7 for navigation
- Framer Motion for animations

### Backend (`/backend_node`)
**Technology**: Node.js 18+ + Express + MongoDB + MySQL

**Structure**:
- `src/config/` - Configuration files (database, JWT, Redis)
- `src/controllers/` - Request handlers for each domain
- `src/models/` - Mongoose schemas (MongoDB) and MySQL models
- `src/routes/` - Express route definitions
- `src/services/` - Business logic layer
- `src/repositories/` - Data access layer
- `src/middlewares/` - Auth, validation, error handling
- `src/validations/` - Joi validation schemas
- `src/utils/` - Helper functions and utilities
- `tests/` - Jest + Supertest unit and integration tests
- `scripts/` - Database seeding and migration scripts

**Key Patterns**:
- **Layered Architecture**: Controllers → Services → Repositories → Models
- **Dual Database**: MongoDB for users/orders, MySQL for products/blogs/CMS
- **Repository Pattern**: Abstracted data access for testability
- **Service Layer**: Business logic separated from controllers
- **Middleware Chain**: Auth → Validation → Rate Limiting → Error Handling

### AI Proxy (`/ai-proxy`)
**Technology**: Node.js + Express + Google Antigravity

**Purpose**: Enables Claude Code CLI and Anthropic-compatible tools to use Google Gemini models through a proxy server.

**Structure**:
- `src/account-manager/` - Google account authentication and management
- `src/cloudcode/` - Gemini API integration
- `src/webui/` - Web console for account management
- `public/` - Static assets for web UI

## Architectural Patterns

### Multi-Tenant Architecture
- Tenant isolation at database level
- Tenant context propagated through middleware
- RBAC with tenant-scoped permissions

### Caching Strategy
- Redis for session storage
- Product catalog caching with TTL
- Cache invalidation on updates

### Authentication Flow
1. User login → JWT token generation
2. Token stored in HTTP-only cookie
3. Middleware validates token on protected routes
4. User context attached to request object

### API Versioning
- All APIs under `/api/v1/` namespace
- Version prefix allows future API evolution
- Consistent response format across endpoints

### Error Handling
- Centralized error middleware
- Custom error classes (ValidationError, AuthError, etc.)
- Structured error responses with status codes

### Database Relationships
**MongoDB Collections**:
- `users` - User accounts and authentication
- `orders` - Order documents with embedded items
- `sessions` - User session data

**MySQL Tables**:
- `products` - Product catalog
- `categories` - Product categories and subcategories
- `product_variants` - Size/color variants
- `blogs` - Blog posts and content
- `coupons` - Discount codes
- `inventory_reservations` - Stock management

### Testing Strategy
- **Unit Tests**: Jest for services and utilities
- **Integration Tests**: Supertest for API endpoints
- **E2E Tests**: Playwright for user flows
- **Test Coverage**: Comprehensive coverage for critical paths

## Configuration Management
- Environment-based configuration (`.env` files)
- Separate configs for development, production, and testing
- Secrets managed through environment variables
- Vercel deployment configuration (`vercel.json`)

## Build and Deployment
- **Frontend**: Vite build → Static assets → Vercel
- **Backend**: Node.js server → Vercel Serverless Functions
- **Database**: MongoDB Atlas + MySQL (hosted)
- **CDN**: Image optimization and delivery

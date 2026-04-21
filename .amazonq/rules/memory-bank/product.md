# Product Overview

## Project Purpose
Shri Ramya is a luxury ethnic fashion e-commerce platform specializing in traditional Indian garments including sarees, sherwanis, and ethnic jewelry. The platform provides a complete online shopping experience with product catalog management, user authentication, shopping cart, checkout, order management, and a native CMS for content management.

## Value Proposition
- **Luxury Ethnic Fashion**: Curated collection of high-quality traditional Indian fashion items
- **Full-Stack E-commerce**: Complete shopping experience from browsing to checkout
- **Multi-Database Architecture**: Hybrid MongoDB + MySQL for optimal performance
- **Native CMS**: Built-in content management for blogs, products, and categories
- **Multi-Tenant RBAC**: Role-based access control with tenant isolation
- **Production-Ready**: Comprehensive testing, caching, and deployment configurations

## Key Features

### Customer Features
- Product browsing with advanced filtering and search
- Product variants (size, color) with inventory management
- Shopping cart with session persistence
- Secure checkout with payment gateway integration (Razorpay, Stripe)
- User authentication and account management
- Order tracking and history
- Wishlist functionality
- Address book management
- Blog content for fashion guides and collections

### Admin Features
- Product management (CRUD operations)
- Category and subcategory management
- Inventory tracking and stock management
- Order management and fulfillment
- Blog post creation and management
- User and role management
- Analytics dashboard
- Coupon and discount management

### Technical Features
- JWT-based authentication
- Redis caching for performance
- Image optimization with Sharp
- Multi-tenant architecture
- RBAC with granular permissions
- API rate limiting
- Comprehensive error handling
- Automated testing (Jest, Playwright)

## Target Users

### Primary Users
- **Customers**: Individuals shopping for luxury ethnic fashion online
- **Administrators**: Store managers handling product catalog and orders
- **Content Managers**: Team members managing blog content and marketing materials

### Use Cases
1. **Customer Shopping Journey**: Browse products → Add to cart → Checkout → Track order
2. **Admin Product Management**: Create products → Manage variants → Track inventory → Fulfill orders
3. **Content Publishing**: Create blog posts → Manage categories → Publish fashion guides
4. **Multi-Tenant Operations**: Separate tenant data → Role-based access → Isolated operations

## Technology Migration
This project was fully migrated from FastAPI (Python) to Node.js/Express, maintaining all functionality while improving performance and scalability. The migration includes comprehensive test coverage to ensure feature parity.

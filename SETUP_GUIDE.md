# Shri Ramya - Headless eCommerce Setup Guide

## Project Overview

Shri Ramya is a modern headless eCommerce website for an ethnic women's clothing brand. The architecture separates the frontend (React) from the backend (FastAPI + MongoDB), with plans to integrate WooCommerce as the product and inventory management system.

## Current Architecture

### Backend (FastAPI)
- **Location**: `/app/backend/`
- **Framework**: FastAPI (Python)
- **Database**: MongoDB
- **Features**:
  - Product management (currently mocked)
  - User authentication (JWT-based)
  - Shopping cart management
  - Order processing
  - Wishlist functionality
  - Blog posts
  - Payment integration (Razorpay)

### Frontend (React)
- **Location**: `/app/frontend/`
- **Framework**: React with React Router
- **Styling**: Tailwind CSS with custom brand colors
- **UI Components**: Shadcn UI
- **Features**:
  - Product browsing and filtering
  - Product detail pages
  - Shopping cart
  - Checkout with Razorpay
  - User account management
  - Wishlist
  - Lookbook gallery
  - Blog
  - Fabric care guide

## WooCommerce Integration Guide

### Step 1: Install WordPress + WooCommerce

1. **Install WordPress**:
   ```bash
   # On your server or local machine
   wget https://wordpress.org/latest.tar.gz
   tar -xzf latest.tar.gz
   # Configure wp-config.php with your database credentials
   ```

2. **Install WooCommerce Plugin**:
   - Log into WordPress admin panel
   - Navigate to Plugins > Add New
   - Search for "WooCommerce"
   - Click "Install Now" and then "Activate"
   - Follow the WooCommerce setup wizard

### Step 2: Enable WooCommerce REST API

1. **Generate API Keys**:
   - In WordPress admin, go to WooCommerce > Settings > Advanced > REST API
   - Click "Add Key"
   - Set description: "Shri Ramya Headless Frontend"
   - Set User: Your admin user
   - Set Permissions: Read/Write
   - Click "Generate API Key"
   - **Important**: Copy the Consumer Key and Consumer Secret immediately

2. **Configure API Access**:
   - Enable "Legacy API" if needed (WooCommerce > Settings > Advanced > Legacy API)
   - Ensure your WordPress installation has pretty permalinks enabled

### Step 3: Configure Backend to Use WooCommerce API

1. **Install WooCommerce Python Client**:
   ```bash
   cd /app/backend
   pip install woocommerce
   pip freeze > requirements.txt
   ```

2. **Update Environment Variables**:
   Add to `/app/backend/.env`:
   ```env
   WOOCOMMERCE_URL=https://your-wordpress-site.com
   WOOCOMMERCE_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxxxxxxx
   WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxxxxxxx
   ```

3. **Update Backend Code**:
   Replace the mock product endpoints in `server.py` with WooCommerce API calls:

   ```python
   from woocommerce import API
   
   wcapi = API(
       url=os.getenv('WOOCOMMERCE_URL'),
       consumer_key=os.getenv('WOOCOMMERCE_CONSUMER_KEY'),
       consumer_secret=os.getenv('WOOCOMMERCE_CONSUMER_SECRET'),
       version="wc/v3"
   )
   
   @api_router.get("/products")
   async def get_products(category: Optional[str] = None):
       params = {}
       if category:
           params['category'] = category
       response = wcapi.get("products", params=params)
       return response.json()
   ```

### Step 4: Import Products to WooCommerce

1. **Manual Product Entry**:
   - Go to Products > Add New in WordPress admin
   - Enter product details matching your brand:
     - Name, Description, Price
     - Product Categories (Sarees, Lehengas, Suits, Dupattas)
     - Product Tags (Banarasi, Jaipuri, Bandhani, etc.)
     - Product Images
     - Stock Status and Quantity

2. **Bulk Import via CSV**:
   - Prepare CSV file with product data
   - Go to WooCommerce > Products
   - Click "Import" and follow the wizard

3. **Categories to Create**:
   - Sarees
     - Banarasi
     - Leheriya
     - Festive
   - Lehengas
     - Bridal
     - Festive
   - Suits
     - Jaipuri
     - Anarkali
   - Dupattas
     - Bandhani
     - Silk

### Step 5: Sync Orders to WooCommerce

Update the order creation endpoint to sync with WooCommerce:

```python
@api_router.post("/orders/create")
async def create_order(order_request: CreateOrderRequest):
    # Create order in WooCommerce
    wc_order_data = {
        "payment_method": "razorpay",
        "payment_method_title": "Razorpay",
        "set_paid": False,
        "billing": {
            "first_name": order_request.shipping_address.name,
            "email": order_request.email,
            "phone": order_request.shipping_address.phone,
            "address_1": order_request.shipping_address.address_line1,
            "city": order_request.shipping_address.city,
            "state": order_request.shipping_address.state,
            "postcode": order_request.shipping_address.pincode,
        },
        "shipping": {
            "first_name": order_request.shipping_address.name,
            "address_1": order_request.shipping_address.address_line1,
            "city": order_request.shipping_address.city,
            "state": order_request.shipping_address.state,
            "postcode": order_request.shipping_address.pincode,
        },
        "line_items": [
            {"product_id": item.product_id, "quantity": item.quantity}
            for item in order_request.items
        ],
    }
    
    wc_order = wcapi.post("orders", wc_order_data)
    # Continue with your existing order creation logic
```

## Payment Integration

### Razorpay Setup

1. **Create Razorpay Account**:
   - Visit https://razorpay.com/
   - Sign up for a merchant account

2. **Get API Keys**:
   - Go to Settings > API Keys
   - Generate Test Keys (for development)
   - Generate Live Keys (for production)

3. **Update Environment Variables**:
   Add to `/app/backend/.env`:
   ```env
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
   ```

4. **Test Payment Flow**:
   - Use Razorpay test cards:
     - Card: 4111 1111 1111 1111
     - CVV: Any 3 digits
     - Expiry: Any future date

## Deployment Considerations

### For Kubernetes/Rancher Deployment

1. **Docker Containers**:
   - Backend: FastAPI container
   - Frontend: Nginx serving React build
   - WooCommerce: Separate WordPress container or external service

2. **Environment Variables**:
   - Use Kubernetes Secrets for API keys
   - Use ConfigMaps for non-sensitive configuration

3. **Database**:
   - MongoDB for FastAPI backend data
   - MySQL for WordPress/WooCommerce

4. **Networking**:
   - API Gateway to route requests
   - Internal network for backend services
   - Public endpoints for frontend and WordPress admin

## Development Workflow

### Running Locally

1. **Backend**:
   ```bash
   cd /app/backend
   python server.py
   # Runs on http://localhost:8001
   ```

2. **Frontend**:
   ```bash
   cd /app/frontend
   yarn start
   # Runs on http://localhost:3000
   ```

3. **MongoDB**:
   - Already running via supervisor on the pod

### Testing

1. **Backend API**:
   ```bash
   # Test product endpoint
   curl http://localhost:8001/api/products
   
   # Test authentication
   curl -X POST http://localhost:8001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
   ```

2. **Frontend**:
   - Open http://localhost:3000
   - Test user flows manually
   - Check browser console for errors

## Database Schema

### Current Collections (MongoDB)

1. **users**
   - id, email, password (hashed), name, phone, addresses, created_at

2. **products** (will be synced from WooCommerce)
   - id, name, slug, description, price, sale_price, category, subcategory, images, variations, fabric, occasion, care_instructions, in_stock, stock_quantity, featured, trending

3. **carts**
   - id, user_id, session_id, items, updated_at

4. **wishlists**
   - id, user_id, items

5. **orders**
   - id, order_number, user_id, email, items, subtotal, shipping, discount, total, payment_method, payment_status, razorpay_order_id, razorpay_payment_id, shipping_address, order_status, tracking_number, created_at, updated_at

6. **blog_posts**
   - id, title, slug, excerpt, content, image, author, category, tags, published_at

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - List products (with filters)
- `GET /api/products/{id}` - Get product details
- `GET /api/categories` - List categories
- `GET /api/recommendations/{id}` - Get product recommendations

### Cart
- `GET /api/cart` - Get cart
- `POST /api/cart` - Add to cart
- `DELETE /api/cart/item/{id}` - Remove from cart
- `DELETE /api/cart` - Clear cart

### Wishlist
- `GET /api/wishlist` - Get wishlist
- `POST /api/wishlist/{id}` - Add to wishlist
- `DELETE /api/wishlist/{id}` - Remove from wishlist

### Orders
- `POST /api/orders/create` - Create order
- `POST /api/orders/{id}/payment` - Confirm payment
- `GET /api/orders` - List user orders
- `GET /api/orders/{id}` - Get order details
- `GET /api/orders/track/{order_number}` - Track order

### Blog
- `GET /api/blog` - List blog posts
- `GET /api/blog/{slug}` - Get blog post

## Brand Guidelines

### Colors
- Primary: Royal Maroon (#800020)
- Secondary: Gold (#D4AF37)
- Background: Cream (#FDFBF7)
- Foreground: Charcoal (#1A1A1A)

### Typography
- Headings: Playfair Display
- Body: Manrope
- Accent: Cormorant Garamond (italic)

### Design Principles
- Premium, elegant feel
- Generous spacing
- High-quality product imagery
- Minimal but sophisticated
- Mobile-first responsive design

## Support

For any issues or questions:
- Backend API: Check `/var/log/supervisor/backend.err.log`
- Frontend: Check browser console and `/var/log/supervisor/frontend.err.log`
- Database: Check MongoDB connection and collections

## Next Steps

1. Set up WordPress + WooCommerce instance
2. Generate WooCommerce API keys
3. Update backend to integrate with WooCommerce API
4. Import product catalog to WooCommerce
5. Test end-to-end order flow
6. Configure Razorpay with live keys for production
7. Set up SSL certificates
8. Deploy to Kubernetes/Rancher
9. Configure domain and DNS
10. Set up monitoring and analytics
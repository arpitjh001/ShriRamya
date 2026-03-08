# Order Processing Engine Documentation

A Shopify/Magento-level order processing engine for Node.js + MySQL ecommerce platform.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Order Lifecycle](#order-lifecycle)
5. [API Reference](#api-reference)
6. [Payment Integration](#payment-integration)
7. [Installation & Setup](#installation--setup)

---

## Overview

This order processing engine provides:

- ✅ **Strict Order State Machine** - Prevents invalid status transitions
- ✅ **Multi-Gateway Payment Support** - Razorpay, Stripe, Cash on Delivery
- ✅ **Shipment Management** - Track shipments with carriers
- ✅ **Refund Processing** - Full/partial refunds with inventory restoration
- ✅ **Event System** - Order events for notifications and audit trail
- ✅ **Email Notifications** - Automated emails for order events
- ✅ **Customer & Admin APIs** - Separate endpoints for customers and admins
- ✅ **Analytics Dashboard** - Order metrics and revenue tracking
- ✅ **Concurrency Safety** - Transaction-based inventory locking

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │  Customer   │ │    Admin    │ │   Webhook   │               │
│  │   Routes    │ │   Routes    │ │   Routes    │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      Controller Layer                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │   Order     │ │  Shipment   │ │   Refund    │               │
│  │ Controller  │ │ Controller  │ │ Controller  │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                       Service Layer                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │Order State  │ │  Shipment   │ │   Refund    │               │
│  │   Machine   │ │   Service   │ │   Service   │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │   Payment   │ │ Order Event │ │    Email    │               │
│  │   Service   │ │   Service   │ │   Service   │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    Payment Gateway Layer                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │  Razorpay   │ │   Stripe    │ │     COD     │               │
│  │   Gateway   │ │   Gateway   │ │   Gateway   │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      Repository Layer                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │   Order     │ │  Shipment   │ │   Refund    │               │
│  │ Repository  │ │ Repository  │ │ Repository  │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                        MySQL Database                            │
│  orders | order_items | shipments | refunds | order_events      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Orders Table
```sql
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    status ENUM('pending_payment', 'payment_failed', 'paid', 'processing', 
                'shipped', 'delivered', 'cancelled', 'refunded'),
    payment_status ENUM('pending', 'paid', 'failed', 'refunded'),
    fulfillment_status ENUM('unfulfilled', 'processing', 'shipped', 'delivered'),
    subtotal, discount_total, tax_total, shipping_cost, grand_total DECIMAL(10,2),
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    customer_email VARCHAR(255),
    billing_*, shipping_* -- Address fields
    created_at, updated_at, paid_at, shipped_at, delivered_at, cancelled_at TIMESTAMP
);
```

### Shipments Table
```sql
CREATE TABLE shipments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    carrier VARCHAR(100),
    tracking_number VARCHAR(100),
    tracking_url VARCHAR(500),
    status ENUM('pending', 'shipped', 'in_transit', 'delivered', 'returned'),
    shipped_at, delivered_at TIMESTAMP
);
```

### Refunds Table
```sql
CREATE TABLE refunds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    payment_id INT,
    amount DECIMAL(10,2),
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected', 'completed'),
    refund_transaction_id VARCHAR(100),
    processed_at TIMESTAMP
);
```

### Order Events Table (Timeline)
```sql
CREATE TABLE order_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    event_type VARCHAR(50),
    event_category VARCHAR(50),
    description TEXT,
    metadata JSON,
    user_id INT,
    user_type ENUM('customer', 'admin', 'system'),
    created_at TIMESTAMP
);
```

---

## Order Lifecycle

### State Machine Diagram

```
pending_payment ──→ paid ──→ processing ──→ shipped ──→ delivered
       │              │           │              │
       │              │           │              │
       ↓              ↓           ↓              │
  payment_failed   cancelled     │              │
       │                         │              │
       └─────────────────────────┘              │
                                                ↓
                                          delivered

paid ──→ refunded (full refund)
```

### Valid Transitions

| From Status | To Statuses |
|-------------|-------------|
| `pending_payment` | `paid`, `payment_failed`, `cancelled` |
| `payment_failed` | `pending_payment`, `cancelled` |
| `paid` | `processing`, `cancelled`, `refunded` |
| `processing` | `shipped`, `cancelled` |
| `shipped` | `delivered` |
| `delivered` | (terminal) |
| `cancelled` | (terminal) |
| `refunded` | (terminal) |

---

## API Reference

### Customer APIs

#### Create Order
```http
POST /api/v1/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "productId": 1,
      "variantId": 5,
      "quantity": 2,
      "attributes": { "Size": "M", "Color": "Red" }
    }
  ],
  "billing": {
    "firstName": "John",
    "lastName": "Doe",
    "address1": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postcode": "400001",
    "country": "IN",
    "phone": "9876543210"
  },
  "shipping": { ... },
  "paymentMethod": "razorpay",
  "customerNotes": "Please deliver before 6 PM"
}
```

#### Get My Orders
```http
GET /api/v1/orders/my?page=1&limit=10&status=paid
Authorization: Bearer <token>
```

#### Get Order Details
```http
GET /api/v1/orders/:id
Authorization: Bearer <token>
```

#### Cancel Order
```http
POST /api/v1/orders/my/:id/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Changed my mind"
}
```

#### Get Order Tracking
```http
GET /api/v1/orders/:id/tracking
Authorization: Bearer <token>
```

#### Request Refund
```http
POST /api/v1/orders/:id/refunds
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 500,
  "reason": "Product damaged",
  "items": [
    {
      "orderItemId": 1,
      "quantity": 1,
      "amount": 500,
      "reason": "Wrong size"
    }
  ]
}
```

---

### Admin APIs

#### Get All Orders
```http
GET /api/v1/orders/admin/all?page=1&limit=20&status=paid&paymentStatus=paid
Authorization: Bearer <token>
```

#### Update Order Status
```http
PATCH /api/v1/orders/admin/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "shipped",
  "reason": "Order dispatched"
}
```

#### Create Shipment
```http
POST /api/v1/orders/admin/:id/shipments
Authorization: Bearer <token>
Content-Type: application/json

{
  "carrier": "Delhivery",
  "trackingNumber": "DLV12345678",
  "trackingUrl": "https://delhivery.com/track/DLV12345678",
  "shippingMethod": "Standard"
}
```

#### Mark Shipment as Shipped
```http
POST /api/v1/orders/admin/shipments/:id/ship
Authorization: Bearer <token>
```

#### Mark Shipment as Delivered
```http
POST /api/v1/orders/admin/shipments/:id/deliver
Authorization: Bearer <token>
```

#### Approve Refund
```http
POST /api/v1/orders/admin/refunds/:id/approve
Authorization: Bearer <token>
```

#### Process Refund
```http
POST /api/v1/orders/admin/refunds/:id/process
Authorization: Bearer <token>
```

#### Reject Refund
```http
POST /api/v1/orders/admin/refunds/:id/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Product not returned"
}
```

#### Get Order Analytics
```http
GET /api/v1/orders/admin/analytics/orders?startDate=2026-03-01&endDate=2026-03-31
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "totalOrders": 150,
    "totalRevenue": 450000,
    "averageOrderValue": 3000,
    "ordersByStatus": [
      { "status": "paid", "count": 50 },
      { "status": "shipped", "count": 30 },
      { "status": "delivered", "count": 60 }
    ],
    "recentOrdersCount": 25
  }
}
```

---

### Webhook Endpoints

#### Razorpay Webhook
```http
POST /api/v1/orders/webhooks/payment/razorpay
Content-Type: application/json
X-Razorpay-Signature: <signature>

{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_123",
        "amount": 100000,
        "notes": { "orderId": "1" }
      }
    }
  }
}
```

#### Stripe Webhook
```http
POST /api/v1/orders/webhooks/payment/stripe
Content-Type: application/json
Stripe-Signature: <signature>

{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_123",
      "amount": 100000,
      "metadata": { "orderId": "1" }
    }
  }
}
```

---

## Payment Integration

### Supported Gateways

| Gateway | Methods | Features |
|---------|---------|----------|
| Razorpay | Card, UPI, Netbanking, Wallet | Full support |
| Stripe | Card, Apple Pay, Google Pay | Full support |
| COD | Cash on Delivery | Basic support |

### Gateway Configuration

```env
# Razorpay
RAZORPAY_KEY_ID=rzp_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx

# Stripe
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# COD
COD_AVAILABLE_PINCODES=400001,400002,400003
COD_CHARGES=50
COD_MIN_ORDER_VALUE=500
```

### Payment Flow

```
1. Customer creates order → pending_payment
2. Select payment method → Gateway selection
3. Process payment → Gateway API call
4. Webhook received → Verify signature
5. Update order → paid status
6. Send confirmation → Email notification
```

---

## Installation & Setup

### 1. Run Migrations

```bash
cd backend_node
node scripts/run-order-migration.js
node scripts/migrations/20260306_create_payment_tables.sql
```

### 2. Configure Environment

Add to `.env`:

```env
# Payment Gateways
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
STRIPE_SECRET_KEY=your_secret_key

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_password
SMTP_FROM=noreply@shriramya.com

# Public URL
PUBLIC_BASE_URL=http://localhost:8080
```

### 3. Restart Server

```bash
docker restart shriramya-backend-1
```

---

## File Structure

```
backend_node/src/
├── controllers/
│   ├── order.controller.js      # Order CRUD + Admin APIs
│   ├── shipment.controller.js   # Shipment management
│   ├── refund.controller.js     # Refund processing
│   └── webhook.controller.js    # Payment webhooks
├── services/
│   ├── orderStateMachine.js     # Order lifecycle management
│   ├── shipment.service.js      # Shipment business logic
│   ├── refund.service.js        # Refund business logic
│   ├── payments/
│   │   ├── PaymentService.js    # Payment orchestration
│   │   ├── RazorpayGateway.js   # Razorpay implementation
│   │   ├── StripeGateway.js     # Stripe implementation
│   │   └── CashOnDelivery.js    # COD implementation
│   ├── events/
│   │   └── orderEvent.service.js # Event logging
│   └── email/
│       └── orderEmail.service.js # Email notifications
├── repositories/
│   ├── shipment.repository.js   # Shipment DB operations
│   └── order.sql.repository.js  # Order DB operations
├── routes/v1/
│   └── orders.route.js          # All order routes
└── validations/
    └── order.validation.js      # Joi schemas
```

---

## Events & Notifications

### Order Events

| Event | Trigger | Email Sent |
|-------|---------|------------|
| `order_created` | Order placed | Order confirmation |
| `payment_success` | Payment received | Payment receipt |
| `payment_failed` | Payment declined | - |
| `order_shipped` | Shipment created | Shipping notification |
| `order_delivered` | Delivery confirmed | Delivery confirmation |
| `order_cancelled` | Order cancelled | Cancellation notice |
| `refund_requested` | Customer request | - |
| `refund_approved` | Admin approval | - |
| `refund_completed` | Refund processed | Refund confirmation |

---

## Security Features

- ✅ **JWT Authentication** - All APIs require valid token
- ✅ **Role-based Access** - Customer vs Admin endpoints
- ✅ **Webhook Signature Verification** - Prevents fake webhooks
- ✅ **Transaction Safety** - DB transactions for data integrity
- ✅ **Input Validation** - Joi schemas for all inputs
- ✅ **SQL Injection Prevention** - Parameterized queries

---

## Concurrency Safety

### Inventory Locking

```sql
-- Reserve inventory on order creation
INSERT INTO inventory_reservations 
(order_id, variant_id, quantity, status, expires_at)
VALUES (?, ?, ?, 'reserved', DATE_ADD(NOW(), INTERVAL 30 MINUTE));

-- Confirm on payment
UPDATE inventory_reservations 
SET status = 'confirmed', confirmed_at = NOW()
WHERE order_id = ?;

-- Release on cancellation
UPDATE inventory_reservations 
SET status = 'released', released_at = NOW()
WHERE order_id = ?;
```

### Transaction-based Updates

All critical operations use MySQL transactions:
- Order creation
- Payment processing
- Refund processing
- Status transitions

---

## Testing

### Test Order Flow

```bash
# 1. Create order
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{...order data...}'

# 2. Check order status
curl http://localhost:8080/api/v1/orders/:id \
  -H "Authorization: Bearer <token>"

# 3. Admin: Update status
curl -X PATCH http://localhost:8080/api/v1/orders/admin/:id/status \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "processing"}'

# 4. Admin: Create shipment
curl -X POST http://localhost:8080/api/v1/orders/admin/:id/shipments \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"carrier": "Delhivery", "trackingNumber": "DLV123"}'
```

---

## Troubleshooting

### Common Issues

**Order stuck in pending_payment:**
- Check payment gateway webhook configuration
- Verify webhook endpoint is publicly accessible

**Inventory not restoring on cancellation:**
- Check `inventory_reservations` table
- Run manual restore query if needed

**Emails not sending:**
- Verify SMTP credentials in `.env`
- Check email service logs

---

## Support

For issues or questions, contact: support@shriramya.com

---

*Last Updated: March 6, 2026*

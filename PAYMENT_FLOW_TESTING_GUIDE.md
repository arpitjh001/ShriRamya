# Payment Flow Testing Guide - Production

## Overview

This guide documents how to test the complete payment flow for Shri Ramya in production. The system uses **Razorpay** as the payment gateway.

## Test Environment

- **Production URL**: https://www.shriramya.com
- **API Base**: https://www.shriramya.com/api/v1
- **Payment Gateway**: Razorpay (Test Mode)
- **Test Credentials**: 
  - Key ID: `rzp_test_STu9TySeTRKeDz`
  - Key Secret: `TL5UAFBzjP2F01lN2mLoJPZI`

## Payment Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PAYMENT FLOW DIAGRAM                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. User adds items to cart                                  │
│  2. User proceeds to checkout                                │
│  3. User fills shipping & payment details                    │
│  4. Frontend creates order via POST /api/v1/orders           │
│  5. Backend creates order document, returns razorpayOrderId  │
│  6. Frontend loads Razorpay SDK                              │
│  7. User sees Razorpay payment modal                         │
│  8. User enters test card details                            │
│  9. Razorpay returns payment response                        │
│  10. Frontend sends payment details to POST /api/v1/          │
│       payments/verify                                         │
│  11. Backend verifies signature & updates order status       │
│  12. User sees success page with order details              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### 1. Create Order
**Endpoint**: `POST /api/v1/orders`
**Auth**: Required (Bearer token)
**Description**: Creates an order with cart items and shipping details

**Request**:
```json
{
  "items": [
    {
      "productId": "product-id",
      "variantId": "variant-id",
      "name": "Product Name",
      "price": 5000,
      "quantity": 1,
      "image": "/path/to/image.jpg",
      "attributes": { "color": "Red", "size": "Free Size" }
    }
  ],
  "shipping_address": {
    "name": "Test User",
    "phone": "9999999999",
    "address_line1": "123 Test Street",
    "address_line2": "Apt 4B",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  },
  "email": "test@example.com",
  "amount": 5099,
  "couponCode": null
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "orderId": "order_id_from_db",
    "razorpayOrderId": "order_1a2b3c4d5e6f",
    "amount": 5099,
    "razorpay_key_id": "rzp_test_STu9TySeTRKeDz"
  }
}
```

### 2. Initiate Payment
**Endpoint**: `POST /api/v1/payments/initiate`
**Auth**: Required (Bearer token)
**Description**: Initiates a payment transaction with Razorpay

**Request**:
```json
{
  "orderId": "order_id_from_db",
  "amount": 5099,
  "currency": "INR"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "orderId": "order_1a2b3c4d5e6f",
    "amount": 5099,
    "currency": "INR",
    "key": "rzp_test_STu9TySeTRKeDz",
    "status": "created"
  }
}
```

### 3. Verify Payment
**Endpoint**: `POST /api/v1/payments/verify`
**Auth**: Required (Bearer token)
**Description**: Verifies payment signature and updates order status

**Request**:
```json
{
  "razorpay_order_id": "order_1a2b3c4d5e6f",
  "razorpay_payment_id": "pay_1a2b3c4d5e6f",
  "razorpay_signature": "signature_hash",
  "orderId": "order_id_from_db"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "verified": true,
    "message": "Payment verified successfully"
  }
}
```

### 4. Get Payment Status
**Endpoint**: `GET /api/v1/payments/status/:orderId`
**Auth**: Required (Bearer token)
**Description**: Retrieves current payment status for an order

**Response**:
```json
{
  "success": true,
  "data": {
    "orderId": "order_id",
    "paymentStatus": "completed",
    "amount": 5099,
    "transactionId": "pay_1a2b3c4d5e6f"
  }
}
```

### 5. Get Payment History
**Endpoint**: `GET /api/v1/payments/history/:orderId`
**Auth**: Required (Bearer token)
**Description**: Retrieves payment history for an order

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "transactionId": "pay_1a2b3c4d5e6f",
      "amount": 5099,
      "status": "completed",
      "paid_at": "2026-04-10T06:51:46.677Z"
    }
  ]
}
```

## Test Card Details

For Razorpay test mode, use these card details:

| Field | Value |
|-------|-------|
| Card Number | 4111111111111111 |
| CVV | Any 3 digits (e.g., 123) |
| Expiry | Any future date (e.g., 12/25) |
| Name | Any name |
| OTP | 123456 |

## Testing Scenarios

### Scenario 1: Successful Payment

1. **Setup**: Have items in cart
2. **Execute**:
   - Proceed to checkout
   - Fill shipping details
   - Click "Pay Now"
   - Enter test card: `4111111111111111`
   - Enter OTP: `123456`
   - Click "Pay"
3. **Expected**:
   - Payment modal shows success
   - Order confirmation page loads
   - Order status: "processing"
   - Payment status: "paid"

### Scenario 2: Payment Failure

1. **Setup**: Have items in cart
2. **Execute**:
   - Proceed to checkout
   - Fill shipping details
   - Click "Pay Now"
   - Enter test card: `4000000000000002` (fail card)
   - Click "Pay"
3. **Expected**:
   - Payment modal shows error
   - Toast: "Payment failed. Please try again."
   - User stays on checkout page
   - Order status: "pending"
   - Payment status: "failed"

### Scenario 3: Coupon Application

1. **Setup**: Have items in cart with valid coupon
2. **Execute**:
   - On checkout page, apply coupon
   - Verify discount is applied
   - Make payment with test card
3. **Expected**:
   - Discount reflected in order total
   - Order saved with applied coupon
   - Payment processed for discounted amount

### Scenario 4: Payment Timeout

1. **Setup**: Have items in cart
2. **Execute**:
   - Open payment modal
   - Wait > 10 minutes without completing payment
   - Close modal
3. **Expected**:
   - Order status: "pending"
   - User can retry payment
   - Payment session expired gracefully

## Automated Testing

Run the provided test script:

```bash
# Option 1: Using Bearer Token (requires authentication)
JWT_TOKEN="your_jwt_token_here" node test_payment_flow.js

# Option 2: Without token (public order creation - may fail)
node test_payment_flow.js
```

### Test Script Output

The script will test:
1. **Order Creation** - Creates a test order with shipping details
2. **Payment Initiation** - Initiates Razorpay payment
3. **Payment Verification** - Verifies payment signature
4. **Payment Status** - Checks final payment status
5. **Payment History** - Retrieves transaction history
6. **Order Status** - Confirms order status after payment

### Success Indicators

- ✅ All API endpoints return 200 status
- ✅ Order ID is generated correctly
- ✅ Razorpay Order ID is returned
- ✅ Payment signature verification succeeds
- ✅ Order status updates to "processing"
- ✅ Payment status shows "completed"

## Troubleshooting

### Issue: "Razorpay SDK failed to load"
**Cause**: Razorpay CDN is unreachable
**Solution**: Check internet connection, verify CSP headers allow Razorpay

### Issue: "Invalid payment signature"
**Cause**: Signature verification failed
**Solution**: Check RAZORPAY_KEY_SECRET in environment variables

### Issue: "Order not found"
**Cause**: Order ID is invalid or expired
**Solution**: Verify order was created successfully before initiating payment

### Issue: "Unauthorized" (401)
**Cause**: Missing or invalid JWT token
**Solution**: Ensure user is logged in and token is passed in Authorization header

### Issue: Payment appears successful but order not updated
**Cause**: Webhook not processed yet
**Solution**: Wait 30 seconds and refresh order status, check server logs

## Database Verification

To manually verify payment records in MongoDB:

```javascript
// Check Orders collection
db.orders.findOne({ _id: ObjectId("order_id") })
// Look for: status: "processing", paymentStatus: "paid"

// Check Payments collection
db.payments.findOne({ orderId: ObjectId("order_id") })
// Look for: status: "completed", paid_at: timestamp
```

## Production Checklist

- [ ] Razorpay API keys are correctly configured
- [ ] RAZORPAY_KEY_ID is set in environment variables
- [ ] RAZORPAY_KEY_SECRET is set in environment variables
- [ ] JWT_SECRET is configured for token signing
- [ ] Payment webhook endpoint is accessible
- [ ] Webhook signature verification is working
- [ ] Order and Payment models are created
- [ ] Payment routes are registered
- [ ] HTTPS is enabled (required by Razorpay)
- [ ] CORS is configured to allow frontend domain

## Performance Metrics

Expected response times:

| Operation | Expected Time |
|-----------|----------------|
| Create Order | < 500ms |
| Initiate Payment | < 1s |
| Verify Payment | < 500ms |
| Get Payment Status | < 300ms |

## Security Notes

1. **Always** use HTTPS in production (Razorpay requirement)
2. **Never** expose RAZORPAY_KEY_SECRET in frontend
3. **Always** verify signatures server-side
4. **Use** environment variables for credentials
5. **Implement** rate limiting on payment endpoints
6. **Log** all payment transactions
7. **Monitor** failed payment attempts
8. **Handle** webhook failures gracefully

## Next Steps

After successful testing:

1. Monitor payment metrics in Razorpay dashboard
2. Set up payment notifications/alerts
3. Document refund process
4. Implement payment reconciliation
5. Set up automated payment reports
6. Configure webhook notifications

## Support

For issues:
- Check server logs: `tail -f backend_node/logs/*.log`
- Review Razorpay dashboard for transaction details
- Check browser console for frontend errors
- Verify network requests in DevTools

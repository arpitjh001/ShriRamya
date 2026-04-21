const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, index: true },
    orderNumber: String,
    userId: { type: String, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    payment_method: String,
    gateway: String,
    transactionId: String,
    status: { type: String, default: 'pending' },
    gateway_response: Object,
    paid_at: Date,
    refundId: String
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

const paymentLogSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, index: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    payment_method: String,
    amount: Number,
    status: String,
    error_message: String
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
const PaymentLog = mongoose.models.PaymentLog || mongoose.model('PaymentLog', paymentLogSchema);

module.exports = { Payment, PaymentLog };

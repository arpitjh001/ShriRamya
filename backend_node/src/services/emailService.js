const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.hostinger.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465');
const SMTP_USER = process.env.SMTP_USER || 'orders@shriramya.com';
const SMTP_PASS = process.env.SMTP_PASS;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'orders@shriramya.com';

let transporter = null;

function getTransporter() {
  if (!transporter && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

function formatPrice(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
}

function buildItemsHTML(items) {
  return items.map(item => `
    <tr>
      <td style="padding:12px 8px;border-bottom:1px solid #f0e6d6;">
        <div style="display:flex;align-items:center;gap:12px;">
          ${item.thumbnail ? `<img src="${item.thumbnail}" alt="${item.name}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;" />` : ''}
          <div>
            <div style="font-weight:600;color:#2d1810;">${item.name}</div>
            ${item.size ? `<div style="font-size:12px;color:#8b7355;">Size: ${item.size}</div>` : ''}
            ${item.color ? `<div style="font-size:12px;color:#8b7355;">Color: ${item.color}</div>` : ''}
          </div>
        </div>
      </td>
      <td style="padding:12px 8px;border-bottom:1px solid #f0e6d6;text-align:center;color:#2d1810;">${item.quantity}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #f0e6d6;text-align:right;color:#2d1810;font-weight:600;">${formatPrice((item.salePrice || item.price) * item.quantity)}</td>
    </tr>
  `).join('');
}

function orderConfirmationEmail(order) {
  const addr = order.shippingAddress || {};
  return {
    subject: `Order Confirmed - ${order.orderId} | Shri Ramya`,
    html: `
    <div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#fffdf9;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#2d1810 0%,#5c3a28 100%);padding:32px;text-align:center;">
        <h1 style="color:#f0e6d6;margin:0;font-size:28px;font-weight:300;letter-spacing:3px;">SHRI RAMYA</h1>
        <p style="color:#c4a882;margin:8px 0 0;font-size:12px;letter-spacing:2px;">HANDCRAFTED ETHNIC WEAR</p>
      </div>

      <!-- Order Confirmation -->
      <div style="padding:32px;text-align:center;">
        <div style="width:56px;height:56px;background:#e8f5e9;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
          <span style="color:#4caf50;font-size:28px;">&#10003;</span>
        </div>
        <h2 style="color:#2d1810;margin:0 0 8px;font-size:22px;">Thank you for your order!</h2>
        <p style="color:#8b7355;margin:0;font-size:14px;">Your order has been confirmed and is being prepared.</p>
      </div>

      <!-- Order Details -->
      <div style="padding:0 32px;">
        <div style="background:#faf6f0;border-radius:12px;padding:20px;margin-bottom:24px;">
          <table style="width:100%;font-size:13px;color:#5c3a28;">
            <tr><td style="padding:4px 0;"><strong>Order ID</strong></td><td style="text-align:right;font-weight:600;">${order.orderId}</td></tr>
            <tr><td style="padding:4px 0;"><strong>Date</strong></td><td style="text-align:right;">${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
            <tr><td style="padding:4px 0;"><strong>Payment</strong></td><td style="text-align:right;">${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</td></tr>
          </table>
        </div>

        <!-- Items -->
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="border-bottom:2px solid #2d1810;">
              <th style="padding:8px;text-align:left;color:#2d1810;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Item</th>
              <th style="padding:8px;text-align:center;color:#2d1810;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Qty</th>
              <th style="padding:8px;text-align:right;color:#2d1810;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Amount</th>
            </tr>
          </thead>
          <tbody>${buildItemsHTML(order.items || [])}</tbody>
        </table>

        <!-- Totals -->
        <div style="margin-top:16px;padding:16px;background:#faf6f0;border-radius:8px;">
          <table style="width:100%;font-size:14px;color:#5c3a28;">
            <tr><td style="padding:4px 0;">Subtotal</td><td style="text-align:right;">${formatPrice(order.subtotal)}</td></tr>
            ${order.discount ? `<tr><td style="padding:4px 0;color:#4caf50;">Discount</td><td style="text-align:right;color:#4caf50;">-${formatPrice(order.discount)}</td></tr>` : ''}
            <tr><td style="padding:4px 0;">Shipping</td><td style="text-align:right;">${order.shipping ? formatPrice(order.shipping) : 'Free'}</td></tr>
            ${order.tax ? `<tr><td style="padding:4px 0;">Tax</td><td style="text-align:right;">${formatPrice(order.tax)}</td></tr>` : ''}
            <tr style="border-top:2px solid #2d1810;"><td style="padding:12px 0;font-weight:700;font-size:16px;color:#2d1810;">Total</td><td style="text-align:right;font-weight:700;font-size:16px;color:#2d1810;">${formatPrice(order.total)}</td></tr>
          </table>
        </div>
      </div>

      <!-- Shipping Address -->
      ${addr.name ? `
      <div style="padding:24px 32px;">
        <h3 style="color:#2d1810;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Shipping Address</h3>
        <div style="background:#faf6f0;border-radius:8px;padding:16px;font-size:14px;color:#5c3a28;line-height:1.6;">
          <strong>${addr.name}</strong><br/>
          ${addr.address || ''}${addr.address2 ? ', ' + addr.address2 : ''}<br/>
          ${addr.city || ''}${addr.state ? ', ' + addr.state : ''} ${addr.pincode || ''}<br/>
          ${addr.phone ? 'Phone: ' + addr.phone : ''}
        </div>
      </div>` : ''}

      <!-- Footer -->
      <div style="background:#2d1810;padding:24px 32px;text-align:center;margin-top:16px;">
        <p style="color:#c4a882;margin:0 0 8px;font-size:13px;">Need help? Reply to this email or contact us.</p>
        <p style="color:#8b7355;margin:0;font-size:11px;">Shri Ramya | www.shriramya.com</p>
      </div>
    </div>`
  };
}

function adminOrderNotificationEmail(order) {
  const addr = order.shippingAddress || {};
  const itemsList = (order.items || []).map(i => `${i.name} x${i.quantity} — ${formatPrice((i.salePrice || i.price) * i.quantity)}`).join('<br/>');
  return {
    subject: `New Order Received - ${order.orderId} (${formatPrice(order.total)})`,
    html: `
    <div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#fffdf9;">
      <div style="background:#2d1810;padding:24px;text-align:center;">
        <h1 style="color:#f0e6d6;margin:0;font-size:22px;letter-spacing:2px;">NEW ORDER RECEIVED</h1>
      </div>
      <div style="padding:24px;">
        <table style="width:100%;font-size:14px;color:#2d1810;border-collapse:collapse;">
          <tr><td style="padding:8px;font-weight:700;width:130px;border-bottom:1px solid #f0e6d6;">Order ID</td><td style="padding:8px;border-bottom:1px solid #f0e6d6;">${order.orderId}</td></tr>
          <tr><td style="padding:8px;font-weight:700;border-bottom:1px solid #f0e6d6;">Customer</td><td style="padding:8px;border-bottom:1px solid #f0e6d6;">${order.userName || addr.name || 'Guest'} (${order.userEmail || addr.email || 'N/A'})</td></tr>
          <tr><td style="padding:8px;font-weight:700;border-bottom:1px solid #f0e6d6;">Phone</td><td style="padding:8px;border-bottom:1px solid #f0e6d6;">${addr.phone || 'N/A'}</td></tr>
          <tr><td style="padding:8px;font-weight:700;border-bottom:1px solid #f0e6d6;">Total</td><td style="padding:8px;border-bottom:1px solid #f0e6d6;font-weight:700;font-size:18px;color:#2d1810;">${formatPrice(order.total)}</td></tr>
          <tr><td style="padding:8px;font-weight:700;border-bottom:1px solid #f0e6d6;">Payment</td><td style="padding:8px;border-bottom:1px solid #f0e6d6;">${order.paymentMethod === 'cod' ? 'COD' : 'Online'} — ${order.paymentStatus}</td></tr>
          <tr><td style="padding:8px;font-weight:700;border-bottom:1px solid #f0e6d6;">Items</td><td style="padding:8px;border-bottom:1px solid #f0e6d6;">${itemsList}</td></tr>
          <tr><td style="padding:8px;font-weight:700;">Address</td><td style="padding:8px;">${addr.name || ''}, ${addr.address || ''}, ${addr.city || ''} ${addr.state || ''} ${addr.pincode || ''}</td></tr>
        </table>
      </div>
      <div style="background:#faf6f0;padding:16px 24px;text-align:center;font-size:12px;color:#8b7355;">
        Shri Ramya Admin | ${new Date().toLocaleString('en-IN')}
      </div>
    </div>`
  };
}

async function sendOrderConfirmation(order) {
  const t = getTransporter();
  if (!t) { console.log('Email: SMTP not configured, skipping'); return; }

  const customerEmail = order.userEmail || order.shippingAddress?.email;
  const promises = [];

  // Send to customer
  if (customerEmail) {
    const { subject, html } = orderConfirmationEmail(order);
    promises.push(
      t.sendMail({ from: `"Shri Ramya" <${SMTP_USER}>`, to: customerEmail, subject, html })
        .then(() => console.log(`Email: Order confirmation sent to ${customerEmail}`))
        .catch(err => console.error(`Email: Failed to send to customer:`, err.message))
    );
  }

  // Send to admin
  const { subject, html } = adminOrderNotificationEmail(order);
  promises.push(
    t.sendMail({ from: `"Shri Ramya Orders" <${SMTP_USER}>`, to: ADMIN_EMAIL, subject, html })
      .then(() => console.log(`Email: Admin notification sent to ${ADMIN_EMAIL}`))
      .catch(err => console.error(`Email: Failed to send to admin:`, err.message))
  );

  await Promise.allSettled(promises);
}

module.exports = { sendOrderConfirmation, getTransporter };

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);
}

export const SHIPPING_CHARGE = 100;
export const FREE_SHIPPING_THRESHOLD = 2500;

export function getShippingCharge(subtotal) {
  const numericSubtotal = Number(subtotal || 0);
  if (numericSubtotal <= 0 || numericSubtotal >= FREE_SHIPPING_THRESHOLD) {
    return 0;
  }

  return SHIPPING_CHARGE;
}

export function firstPositiveNumber(...values) {
  for (const value of values) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return numericValue;
    }
  }

  return 0;
}

export function getCartItemPrice(item = {}) {
  return firstPositiveNumber(
    item.salePrice,
    item.effectivePrice,
    item.priceSnapshot,
    item.price,
    item.variant?.effectivePrice,
    item.variant?.discountPrice,
    item.variant?.price,
    item.product?.salePrice,
    item.product?.sale_price,
    item.product?.price,
    item.product?.basePrice,
    item.product?.base_price,
    item.originalPrice,
    item.regularPrice,
    item.mrp,
    item.product?.regularPrice,
    item.product?.regular_price
  );
}

export function getCartItemOriginalPrice(item = {}) {
  return firstPositiveNumber(
    item.originalPrice,
    item.regularPrice,
    item.mrp,
    item.variant?.price,
    item.product?.basePrice,
    item.product?.base_price,
    item.product?.regularPrice,
    item.product?.regular_price,
    item.product?.price,
    getCartItemPrice(item)
  );
}

export function getSessionId() {
  let sessionId = localStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('session_id', sessionId);
  }
  return sessionId;
}

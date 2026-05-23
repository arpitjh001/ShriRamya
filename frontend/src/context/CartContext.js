import React, { createContext, useContext, useState, useEffect } from 'react';
import { cartAPI, couponsAPI } from '../services/api';
import { getCartItemPrice, getSessionId, getShippingCharge } from '../utils';
import { useAuth } from './AuthContext';
import { trackAnalyticsEvent } from '../services/analyticsTracker';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const { user } = useAuth();

  const fetchCart = async () => {
    try {
      const storedSessionId = getSessionId();
      const response = await cartAPI.get(storedSessionId);

      // Save session ID from response for guest carts
      if (response.data?.sessionId && !storedSessionId) {
        setSessionId(response.data.sessionId);
        localStorage.setItem('cart_session_id', response.data.sessionId);
      }

      setCart(response.data || { items: [] });

      // Fetch applied coupon if exists
      const couponResponse = await cartAPI.getAppliedCoupon(storedSessionId);
      if (couponResponse.data) {
        setAppliedCoupon(couponResponse.data);
        setDiscountAmount(couponResponse.data.discount_amount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
      setCart({ items: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  const addToCart = async (productIdOrVariantId, quantity = 1, variation = null) => {
    try {
      const storedSessionId = getSessionId() || sessionId;
      
      const payload = { quantity };
      const variantPayload = typeof variation === 'string' || typeof variation === 'number'
        ? { variantId: variation }
        : variation;
      
      const variantId = variantPayload?.variantId || variantPayload?.id || variantPayload?._id;

      if (variantId) {
        payload.productId = productIdOrVariantId;
        payload.variantId = variantId;
        if (variantPayload.color) payload.color = variantPayload.color;
        if (variantPayload.size) payload.size = variantPayload.size;
      } else {
        payload.productId = productIdOrVariantId;
      }

      const response = await cartAPI.add(payload, storedSessionId);

      // Save session ID if returned
      if (response.data?.sessionId && !storedSessionId) {
        setSessionId(response.data.sessionId);
        localStorage.setItem('cart_session_id', response.data.sessionId);
      }

      setCart(response.data);
      trackAnalyticsEvent('add_to_cart', {
        user_id: user?._id || user?.id || null,
        product_id: payload.productId,
        cart_id: response.data?.id || response.data?._id || response.data?.cartId || storedSessionId || sessionId,
        metadata: {
          quantity,
          variant_id: payload.variantId || null,
          color: payload.color || null,
          size: payload.size || null,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to add to cart:', error?.response?.data || error.message);
      throw error;
    }
  };

  const updateQuantity = async (cartItemId, quantity) => {
    try {
      const storedSessionId = getSessionId() || sessionId;
      const response = await cartAPI.updateQuantity(cartItemId, quantity, storedSessionId);
      setCart(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to update quantity:', error);
      throw error;
    }
  };

  const removeFromCart = async (cartItemId) => {
    try {
      const storedSessionId = getSessionId() || sessionId;
      const response = await cartAPI.remove(cartItemId, storedSessionId);
      setCart(response.data);
      trackAnalyticsEvent('remove_from_cart', {
        user_id: user?._id || user?.id || null,
        cart_id: response.data?.id || response.data?._id || response.data?.cartId || storedSessionId || sessionId,
        metadata: { cart_item_id: cartItemId },
      });
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      throw error;
    }
  };

  const clearCart = async () => {
    try {
      const storedSessionId = getSessionId() || sessionId;
      await cartAPI.clear(storedSessionId);
      setCart({ items: [] });
      setAppliedCoupon(null);
      setDiscountAmount(0);
    } catch (error) {
      console.error('Failed to clear cart:', error);
      throw error;
    }
  };

  // ==========================================
  // Coupon Methods
  // ==========================================

  const applyCoupon = async (code) => {
    const storedSessionId = getSessionId() || sessionId;
    let couponFailureTracked = false;

    try {
      setCouponLoading(true);
      
      // First validate the coupon
      const validation = await couponsAPI.validateCoupon(code);
      if (!validation.data?.valid) {
        trackAnalyticsEvent('coupon_failed', {
          user_id: user?._id || user?.id || null,
          cart_id: storedSessionId || sessionId,
          metadata: { coupon_code: code, reason: validation.data?.message || 'invalid' },
        });
        couponFailureTracked = true;
        throw new Error(validation.data?.message || 'Invalid coupon code');
      }

      // Apply coupon to cart
      const response = await cartAPI.applyCoupon(code, storedSessionId);
      
      if (response.data) {
        setAppliedCoupon(response.data.coupon || response.data);
        setDiscountAmount(response.data.discount_amount || response.data.discount || 0);
        trackAnalyticsEvent('coupon_applied', {
          user_id: user?._id || user?.id || null,
          cart_id: storedSessionId || sessionId,
          metadata: { coupon_code: code },
        });
        // Refresh cart to get updated totals
        await fetchCart();
      }

      return response.data;
    } catch (error) {
      if (!couponFailureTracked) {
        trackAnalyticsEvent('coupon_failed', {
          user_id: user?._id || user?.id || null,
          cart_id: storedSessionId || sessionId,
          metadata: { coupon_code: code, reason: error.message || 'apply_failed' },
        });
      }
      console.error('Failed to apply coupon:', error?.response?.data || error.message);
      throw error;
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = async () => {
    try {
      setCouponLoading(true);
      const storedSessionId = getSessionId() || sessionId;
      
      const response = await cartAPI.removeCoupon(storedSessionId);
      
      if (response.data) {
        setAppliedCoupon(null);
        setDiscountAmount(0);
        // Refresh cart to get updated totals
        await fetchCart();
      }

      return response.data;
    } catch (error) {
      console.error('Failed to remove coupon:', error);
      throw error;
    } finally {
      setCouponLoading(false);
    }
  };

  const validateCoupon = async (code) => {
    try {
      const response = await couponsAPI.validateCoupon(code);
      return response.data;
    } catch (error) {
      console.error('Failed to validate coupon:', error);
      return { valid: false, message: error.message || 'Invalid coupon code' };
    }
  };

  // Calculate totals with discount
  const calculateSubtotal = () => {
    return cart.items?.reduce((sum, item) => {
      const price = getCartItemPrice(item);
      return sum + (price * item.quantity);
    }, 0) || 0;
  };

  const calculateFinalTotal = () => {
    const subtotal = calculateSubtotal();
    const shipping = getShippingCharge(subtotal);
    return subtotal - discountAmount + shipping;
  };

  const cartCount = cart.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <CartContext.Provider value={{
      cart,
      loading,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      fetchCart,
      cartCount,
      sessionId,
      // Coupon state and methods
      appliedCoupon,
      discountAmount,
      couponLoading,
      applyCoupon,
      removeCoupon,
      validateCoupon,
      calculateSubtotal,
      calculateFinalTotal,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

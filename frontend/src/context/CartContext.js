import React, { createContext, useContext, useState, useEffect } from 'react';
import { cartAPI } from '../lib/api';
import { getSessionId } from '../lib/utils';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchCart = async () => {
    try {
      const sessionId = getSessionId();
      console.log("Fetching cart for session:", sessionId);

      const response = await cartAPI.get(sessionId);
      console.log("Fetch cart response:", response);

      setCart(response.data || { items: [] });
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

  const addToCart = async (productId, quantity = 1, variation = null) => {
    try {
      const sessionId = getSessionId();
      console.log("Adding to cart:", { productId, quantity, variation, sessionId });

      const response = await cartAPI.add({
        product_id: productId,
        quantity,
        variation,
      }, sessionId);

      console.log("Add to cart response:", response);
      setCart(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to add to cart:', error?.response?.data || error.message);
      throw error;
    }
  };

  const updateQuantity = async (productId, quantity, variation = null) => {
    try {
      const sessionId = getSessionId();
      const response = await cartAPI.updateQuantity(productId, quantity, sessionId, variation);
      setCart(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to update quantity:', error);
      throw error;
    }
  };

  const removeFromCart = async (productId, variation = null) => {
    try {
      const sessionId = getSessionId();
      const response = await cartAPI.remove(productId, sessionId, variation);
      setCart(response.data);
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      throw error;
    }
  };

  const clearCart = async () => {
    try {
      const sessionId = getSessionId();
      await cartAPI.clear(sessionId);
      setCart({ items: [] });
    } catch (error) {
      console.error('Failed to clear cart:', error);
      throw error;
    }
  };

  const cartCount = cart.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <CartContext.Provider value={{ cart, loading, addToCart, removeFromCart, updateQuantity, clearCart, fetchCart, cartCount }}>
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
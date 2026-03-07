import React, { createContext, useContext, useState, useEffect } from 'react';
import { cartAPI } from '../services/api';
import { getSessionId } from '../utils';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const { user } = useAuth();

  const fetchCart = async () => {
    try {
      const storedSessionId = getSessionId();
      console.log("Fetching cart for session:", storedSessionId);

      const response = await cartAPI.get(storedSessionId);
      console.log("Fetch cart response:", response);

      // Save session ID from response for guest carts
      if (response.data?.sessionId && !storedSessionId) {
        setSessionId(response.data.sessionId);
        localStorage.setItem('cart_session_id', response.data.sessionId);
      }
      
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

  const addToCart = async (variantId, quantity = 1) => {
    try {
      const storedSessionId = getSessionId() || sessionId;
      console.log("Adding to cart:", { variantId, quantity, sessionId: storedSessionId });

      const payload = {
        variantId: Number(variantId),
        quantity,
      };

      const response = await cartAPI.add(payload, storedSessionId);

      console.log("Add to cart response:", response);
      
      // Save session ID if returned
      if (response.data?.sessionId && !storedSessionId) {
        setSessionId(response.data.sessionId);
        localStorage.setItem('cart_session_id', response.data.sessionId);
      }
      
      setCart(response.data);
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
    } catch (error) {
      console.error('Failed to clear cart:', error);
      throw error;
    }
  };

  const cartCount = cart.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <CartContext.Provider value={{ cart, loading, addToCart, removeFromCart, updateQuantity, clearCart, fetchCart, cartCount, sessionId }}>
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

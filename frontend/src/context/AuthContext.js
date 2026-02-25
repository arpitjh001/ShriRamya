import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [capabilities, setCapabilities] = useState({
    edit_posts: false,
    publish_posts: false,
    edit_others_posts: false,
    delete_posts: false
  });

  const fetchCapabilities = async () => {
    try {
      const { blogAPI } = await import('../lib/api');
      const response = await blogAPI.getCapabilities();
      if (response.data && response.data.capabilities) {
        setCapabilities(response.data.capabilities);
      }
    } catch (error) {
      console.error('Failed to fetch capabilities:', error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authAPI.getMe()
        .then((res) => {
          setUser(res.data);
          fetchCapabilities();
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    localStorage.setItem('token', response.data.access_token);
    setUser(response.data.user);
    await fetchCapabilities();
    return response.data;
  };

  const register = async (data) => {
    const response = await authAPI.register(data);
    localStorage.setItem('token', response.data.access_token);
    setUser(response.data.user);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setCapabilities({
      edit_posts: false,
      publish_posts: false,
      edit_others_posts: false,
      delete_posts: false
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, capabilities, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
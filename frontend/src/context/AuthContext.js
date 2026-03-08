import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

// Role definitions
export const ROLES = {
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  CUSTOMER: 'Customer',
};

// Permission definitions
export const PERMISSIONS = {
  // Products
  MANAGE_PRODUCTS: 'manage_products',
  CREATE_PRODUCT: 'create_product',
  UPDATE_PRODUCT: 'update_product',
  DELETE_PRODUCT: 'delete_product',
  VIEW_PRODUCTS: 'view_products',

  // Orders
  MANAGE_ORDERS: 'manage_orders',
  VIEW_ORDERS: 'view_orders',
  VIEW_OWN_ORDERS: 'view_own_orders',

  // Users
  MANAGE_USERS: 'manage_users',

  // Inventory
  MANAGE_INVENTORY: 'manage_inventory',

  // Blog
  MANAGE_BLOG: 'manage_blog',
  CREATE_BLOG: 'create_blog',
  UPDATE_BLOG: 'update_blog',
  DELETE_BLOG: 'delete_blog',

  // Settings
  MANAGE_SETTINGS: 'manage_settings',

  // Dashboard
  VIEW_DASHBOARD: 'view_dashboard',

  // Cart
  ADD_TO_CART: 'add_to_cart',
  VIEW_CART: 'view_cart',

  // Checkout
  PLACE_ORDER: 'place_order',
};

// Role-based UI visibility mappings
export const ROLE_UI_VISIBILITY = {
  [ROLES.ADMIN]: {
    showProducts: true,
    showOrders: true,
    showUsers: true,
    showInventory: true,
    showBlogs: true,
    showSettings: true,
    showAnalytics: true,
    showCoupons: true,
    showWarehouses: true,
  },
  [ROLES.EDITOR]: {
    showProducts: true,
    showOrders: false,
    showUsers: false,
    showInventory: false,
    showBlogs: true,
    showSettings: false,
    showAnalytics: false,
    showCoupons: false,
    showWarehouses: false,
  },
  [ROLES.CUSTOMER]: {
    showProducts: false,
    showOrders: false,
    showUsers: false,
    showInventory: false,
    showBlogs: false,
    showSettings: false,
    showAnalytics: false,
    showCoupons: false,
    showWarehouses: false,
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [capabilities, setCapabilities] = useState({
    edit_posts: false,
    publish_posts: false,
    edit_others_posts: false,
    delete_posts: false
  });

  // Decode JWT token to get roles and permissions
  const decodeToken = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  const fetchCapabilities = async () => {
    try {
      const { blogAPI } = await import('../services/api');
      const response = await blogAPI.getCapabilities();
      if (response.data && response.data.capabilities) {
        setCapabilities(response.data.capabilities);
      }
    } catch (error) {
      console.error('Failed to fetch capabilities:', error);
    }
  };

  const loadUserFromToken = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Decode token to get user info including roles and tenant
      const decoded = decodeToken(token);

      if (decoded) {
        const userData = {
          id: decoded.user_id || decoded.sub,
          email: decoded.email,
          name: decoded.name,
          role: decoded.roles?.[0] || decoded.role,
          roles: decoded.roles || (decoded.role ? [decoded.role] : []),
          permissions: decoded.permissions || [],
          tenantId: decoded.tenant_id || 1,
        };

        setUser(userData);
        await fetchCapabilities();
      }
    } catch (error) {
      console.error('Error loading user from token:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserFromToken();
  }, []);

  const login = async (email, password, tenantId = 1) => {
    const response = await authAPI.login({ email, password, tenantId });
    localStorage.setItem('token', response.data.access_token);

    // Decode token to get full user info
    const decoded = decodeToken(response.data.access_token);
    const userData = {
      id: decoded.user_id || decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.roles?.[0] || decoded.role,
      roles: decoded.roles || (decoded.role ? [decoded.role] : []),
      permissions: decoded.permissions || [],
      tenantId: decoded.tenant_id || 1,
    };

    setUser(userData);
    await fetchCapabilities();
    return response.data;
  };

  const register = async (data) => {
    const response = await authAPI.register(data);
    localStorage.setItem('token', response.data.access_token);

    // Decode token to get full user info
    const decoded = decodeToken(response.data.access_token);
    const userData = {
      id: decoded.user_id || decoded.sub,
      email: decoded.email,
      name: decoded.name,
      role: decoded.roles?.[0] || decoded.role,
      roles: decoded.roles || (decoded.role ? [decoded.role] : []),
      permissions: decoded.permissions || [],
      tenantId: decoded.tenant_id || 1,
    };

    setUser(userData);
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

  // Role checking utilities
  const hasRole = (role) => {
    if (!user) return false;
    const targetRole = role.toLowerCase();
    const userRole = (user.role || '').toLowerCase();
    const userRoles = (user.roles || []).map(r => r.toLowerCase());
    return userRoles.includes(targetRole) || userRole === targetRole;
  };

  const hasAnyRole = (roles) => {
    if (!user) return false;
    const targetRoles = roles.map(r => r.toLowerCase());
    const userRole = (user.role || '').toLowerCase();
    const userRoles = (user.roles || []).map(r => r.toLowerCase());
    return targetRoles.some(role => userRoles.includes(role) || userRole === role);
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    return user.permissions?.includes(permission);
  };

  const hasAnyPermission = (permissions) => {
    if (!user) return false;
    return permissions.some(permission => user.permissions?.includes(permission));
  };

  const isAdmin = () => hasRole('Admin');
  const isEditor = () => hasRole('Editor');
  const isCustomer = () => hasRole('Customer');

  // UI Visibility helpers
  const canViewProducts = () => hasAnyRole([ROLES.ADMIN, ROLES.EDITOR]) || hasPermission(PERMISSIONS.VIEW_PRODUCTS);
  const canCreateProduct = () => hasAnyRole([ROLES.ADMIN, ROLES.EDITOR]) || hasPermission(PERMISSIONS.CREATE_PRODUCT);
  const canEditProduct = () => hasAnyRole([ROLES.ADMIN, ROLES.EDITOR]) || hasPermission(PERMISSIONS.UPDATE_PRODUCT);
  const canDeleteProduct = () => hasRole(ROLES.ADMIN) || hasPermission(PERMISSIONS.DELETE_PRODUCT);

  const canViewOrders = () => hasRole(ROLES.ADMIN) || hasPermission(PERMISSIONS.VIEW_ORDERS);
  const canManageOrders = () => hasRole(ROLES.ADMIN) || hasPermission(PERMISSIONS.MANAGE_ORDERS);

  const canViewUsers = () => hasRole(ROLES.ADMIN) || hasPermission(PERMISSIONS.VIEW_USERS);
  const canManageUsers = () => hasRole(ROLES.ADMIN) || hasPermission(PERMISSIONS.MANAGE_USERS);

  const canViewInventory = () => hasRole(ROLES.ADMIN) || hasPermission(PERMISSIONS.VIEW_INVENTORY);
  const canManageInventory = () => hasRole(ROLES.ADMIN) || hasPermission(PERMISSIONS.MANAGE_INVENTORY);

  const canViewBlogs = () => hasAnyRole([ROLES.ADMIN, ROLES.EDITOR]) || hasPermission(PERMISSIONS.VIEW_BLOG);
  const canCreateBlog = () => hasAnyRole([ROLES.ADMIN, ROLES.EDITOR]) || hasPermission(PERMISSIONS.CREATE_BLOG);
  const canEditBlog = () => hasAnyRole([ROLES.ADMIN, ROLES.EDITOR]) || hasPermission(PERMISSIONS.UPDATE_BLOG);
  const canDeleteBlog = () => hasRole(ROLES.ADMIN) || hasPermission(PERMISSIONS.DELETE_BLOG);

  const canViewSettings = () => hasRole(ROLES.ADMIN) || hasPermission(PERMISSIONS.VIEW_SETTINGS);
  const canManageSettings = () => hasRole(ROLES.ADMIN) || hasPermission(PERMISSIONS.MANAGE_SETTINGS);

  const canViewDashboard = () => hasAnyRole([ROLES.ADMIN, ROLES.EDITOR]) || hasPermission(PERMISSIONS.VIEW_DASHBOARD);
  const canViewAnalytics = () => hasRole(ROLES.ADMIN);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      capabilities,
      login,
      register,
      logout,
      // Role checks
      hasRole,
      hasAnyRole,
      hasPermission,
      hasAnyPermission,
      isAdmin,
      isEditor,
      isCustomer,
      // Permission checks
      canViewProducts,
      canCreateProduct,
      canEditProduct,
      canDeleteProduct,
      canViewOrders,
      canManageOrders,
      canViewUsers,
      canManageUsers,
      canViewInventory,
      canManageInventory,
      canViewBlogs,
      canCreateBlog,
      canEditBlog,
      canDeleteBlog,
      canViewSettings,
      canManageSettings,
      canViewDashboard,
      canViewAnalytics,
      // Direct access to roles and permissions
      roles: user?.roles || [],
      permissions: user?.permissions || [],
      tenantId: user?.tenantId || 1,
    }}>
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

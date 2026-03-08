/**
 * RBAC Components for React
 * Reusable components for role-based UI rendering
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * RoleGuard Component
 * Renders children only if user has at least one of the required roles
 * 
 * Usage:
 * <RoleGuard roles={['Admin', 'Editor']}>
 *   <AdminContent />
 * </RoleGuard>
 */
export const RoleGuard = ({ roles, children, fallback = null }) => {
  const { hasAnyRole } = useAuth();

  if (!hasAnyRole(roles)) {
    return fallback;
  }

  return children;
};

/**
 * PermissionGuard Component
 * Renders children only if user has at least one of the required permissions
 * 
 * Usage:
 * <PermissionGuard permissions={['delete_product']}>
 *   <DeleteButton />
 * </PermissionGuard>
 */
export const PermissionGuard = ({ permissions, children, fallback = null }) => {
  const { hasAnyPermission } = useAuth();

  if (!hasAnyPermission(permissions)) {
    return fallback;
  }

  return children;
};

/**
 * AdminGuard Component
 * Renders children only for Admin users
 */
export const AdminGuard = ({ children, fallback = null }) => {
  const { isAdmin } = useAuth();

  if (!isAdmin()) {
    return fallback;
  }

  return children;
};

/**
 * EditorGuard Component
 * Renders children for Admin and Editor users
 */
export const EditorGuard = ({ children, fallback = null }) => {
  const { hasAnyRole } = useAuth();

  if (!hasAnyRole(['Admin', 'Editor'])) {
    return fallback;
  }

  return children;
};

/**
 * CustomerGuard Component
 * Renders children only for Customer users (or public)
 */
export const CustomerGuard = ({ children, fallback = null }) => {
  const { isCustomer, user } = useAuth();

  if (user && !isCustomer()) {
    return fallback;
  }

  return children;
};

/**
 * DeleteButton Component
 * Renders a delete button only for users with delete permission
 * 
 * Usage:
 * <DeleteButton onClick={handleDelete} />
 */
export const DeleteButton = ({ onClick, className = '', ...props }) => {
  const { canDeleteProduct, canDeleteBlog } = useAuth();

  const canDelete = canDeleteProduct() || canDeleteBlog();

  if (!canDelete) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={`bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded ${className}`}
      {...props}
    />
  );
};

/**
 * AdminNavMenu Component
 * Navigation menu items based on user role
 */
export const AdminNavMenu = () => {
  const {
    canViewProducts,
    canViewOrders,
    canViewUsers,
    canViewInventory,
    canViewBlogs,
    canViewSettings,
    canViewAnalytics,
  } = useAuth();

  const menuItems = [];

  if (canViewProducts()) {
    menuItems.push({ path: '/admin/products', label: 'Products' });
  }

  if (canViewOrders()) {
    menuItems.push({ path: '/admin/orders', label: 'Orders' });
  }

  if (canViewUsers()) {
    menuItems.push({ path: '/admin/users', label: 'Users' });
  }

  if (canViewInventory()) {
    menuItems.push({ path: '/admin/inventory', label: 'Inventory' });
  }

  if (canViewBlogs()) {
    menuItems.push({ path: '/admin/blogs', label: 'Blogs' });
  }

  if (canViewAnalytics()) {
    menuItems.push({ path: '/admin/analytics', label: 'Analytics' });
  }

  if (canViewSettings()) {
    menuItems.push({ path: '/admin/settings', label: 'Settings' });
  }

  if (menuItems.length === 0) {
    return null;
  }

  return (
    <nav className="admin-nav">
      {menuItems.map((item) => (
        <a key={item.path} href={item.path} className="admin-nav-item">
          {item.label}
        </a>
      ))}
    </nav>
  );
};

/**
 * DashboardStats Component
 * Shows different stats based on user role
 */
export const DashboardStats = () => {
  const { isAdmin, isEditor, isCustomer } = useAuth();

  if (isAdmin()) {
    return (
      <div className="admin-dashboard">
        <h2>Admin Dashboard</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Revenue</h3>
            <p>₹XX,XXX</p>
          </div>
          <div className="stat-card">
            <h3>Total Orders</h3>
            <p>XXX</p>
          </div>
          <div className="stat-card">
            <h3>Total Products</h3>
            <p>XXX</p>
          </div>
          <div className="stat-card">
            <h3>Total Customers</h3>
            <p>XXX</p>
          </div>
        </div>
      </div>
    );
  }

  if (isEditor()) {
    return (
      <div className="editor-dashboard">
        <h2>Editor Dashboard</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Products Created</h3>
            <p>XX</p>
          </div>
          <div className="stat-card">
            <h3>Blog Posts</h3>
            <p>XX</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

/**
 * ProductActions Component
 * Shows appropriate action buttons based on permissions
 */
export const ProductActions = ({ product, onEdit, onDelete }) => {
  const { canEditProduct, canDeleteProduct } = useAuth();

  return (
    <div className="product-actions">
      {canEditProduct() && (
        <button onClick={onEdit} className="edit-btn">
          Edit
        </button>
      )}
      {canDeleteProduct() && (
        <button onClick={onDelete} className="delete-btn">
          Delete
        </button>
      )}
    </div>
  );
};

/**
 * BlogActions Component
 * Shows appropriate action buttons based on permissions
 */
export const BlogActions = ({ post, onEdit, onDelete }) => {
  const { canEditBlog, canDeleteBlog } = useAuth();

  return (
    <div className="blog-actions">
      {canEditBlog() && (
        <button onClick={onEdit} className="edit-btn">
          Edit
        </button>
      )}
      {canDeleteBlog() && (
        <button onClick={onDelete} className="delete-btn">
          Delete
        </button>
      )}
    </div>
  );
};

/**
 * TenantInfo Component
 * Displays current tenant information
 */
export const TenantInfo = () => {
  const { tenantId } = useAuth();

  return (
    <div className="tenant-info">
      <span className="tenant-badge">Store ID: {tenantId}</span>
    </div>
  );
};

export default {
  RoleGuard,
  PermissionGuard,
  AdminGuard,
  EditorGuard,
  CustomerGuard,
  DeleteButton,
  AdminNavMenu,
  DashboardStats,
  ProductActions,
  BlogActions,
  TenantInfo,
};

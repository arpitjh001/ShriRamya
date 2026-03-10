/**
 * User Management Service
 * Handles user role management and RBAC
 */

import api from './apiClient';

export const userManagementService = {
  /**
   * Get all users with roles
   */
  getAllUsers(params = {}) {
    return api.get('/users', { params });
  },

  /**
   * Get user by ID
   */
  getUserById(userId) {
    return api.get(`/users/${userId}`);
  },

  /**
   * Sync user mapping (MongoDB to MySQL)
   */
  syncUserMapping(userData) {
    return api.post('/users/sync', userData);
  },

  /**
   * Assign single role to user
   */
  assignRole(userId, roleId) {
    return api.post(`/users/${userId}/roles`, { roleId });
  },

  /**
   * Assign multiple roles to user
   */
  assignMultipleRoles(userId, roleIds) {
    return api.post(`/users/${userId}/roles/multiple`, { roleIds });
  },

  /**
   * Remove role from user
   */
  removeRole(userId, roleId) {
    return api.delete(`/users/${userId}/roles/${roleId}`);
  },

  /**
   * Get all available roles
   */
  getRoles() {
    return api.get('/users/roles');
  },

  /**
   * Get all available permissions
   */
  getPermissions() {
    return api.get('/users/permissions');
  },

  /**
   * Create custom role
   */
  createRole(roleData) {
    return api.post('/users/roles', roleData);
  },

  /**
   * Delete custom role
   */
  deleteRole(roleId) {
    return api.delete(`/users/roles/${roleId}`);
  },
};

export default userManagementService;

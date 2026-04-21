/**
 * Tenant Management Service
 * Handles multi-tenant configuration
 */

import api from './apiClient';

export const tenantService = {
  /**
   * Create new tenant
   */
  createTenant(tenantData) {
    return api.post('/tenants', tenantData);
  },

  /**
   * Get all tenants
   */
  getAllTenants() {
    return api.get('/tenants');
  },

  /**
   * Get current tenant
   */
  getCurrentTenant() {
    return api.get('/tenants/current');
  },

  /**
   * Get tenant by ID
   */
  getTenantById(tenantId) {
    return api.get(`/tenants/${tenantId}`);
  },

  /**
   * Update tenant
   */
  updateTenant(tenantId, tenantData) {
    return api.put(`/tenants/${tenantId}`, tenantData);
  },

  /**
   * Get tenant settings
   */
  getTenantSettings() {
    return api.get('/tenants/settings');
  },

  /**
   * Update tenant setting
   */
  updateTenantSetting(key, value) {
    return api.put(`/tenants/settings/${key}`, { value });
  },

  /**
   * Get tenant roles
   */
  getTenantRoles() {
    return api.get('/tenants/roles');
  },

  /**
   * Get current user's roles
   */
  getMyRoles() {
    return api.get('/tenants/my-roles');
  },
};

export default tenantService;

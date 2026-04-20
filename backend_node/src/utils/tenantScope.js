const normalizeTenantId = (tenantId) => {
  const parsedTenantId = Number(tenantId);
  return Number.isInteger(parsedTenantId) && parsedTenantId > 0 ? parsedTenantId : 1;
};

const buildTenantScope = (tenantId) => {
  const normalizedTenantId = normalizeTenantId(tenantId);
  const tenantValues = [normalizedTenantId, String(normalizedTenantId)];
  const scope = [
    { tenant_id: { $in: tenantValues } },
    { tenantId: { $in: tenantValues } },
  ];

  if (normalizedTenantId === 1) {
    scope.push(
      { tenant_id: { $exists: false }, tenantId: { $exists: false } },
      { tenant_id: null, tenantId: { $exists: false } },
      { tenantId: null, tenant_id: { $exists: false } },
      { tenant_id: null, tenantId: null }
    );
  }

  return { $or: scope };
};

const andQuery = (...conditions) => {
  const filters = conditions.filter((condition) => (
    condition &&
    typeof condition === 'object' &&
    Object.keys(condition).length > 0
  ));

  if (filters.length === 0) return {};
  if (filters.length === 1) return filters[0];
  return { $and: filters };
};

const buildTenantScopedQuery = (tenantId, ...conditions) => (
  andQuery(buildTenantScope(tenantId), ...conditions)
);

module.exports = {
  normalizeTenantId,
  buildTenantScope,
  buildTenantScopedQuery,
  andQuery,
};

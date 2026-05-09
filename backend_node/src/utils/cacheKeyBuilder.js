const crypto = require('crypto');

const normalizePart = (value) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9:_-]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

const stableStringify = (value) => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`;
};

const hashObject = (value) => crypto
  .createHash('sha1')
  .update(stableStringify(value))
  .digest('hex')
  .slice(0, 16);

const joinKey = (...parts) => parts
  .flat()
  .filter((part) => part !== undefined && part !== null && part !== '')
  .map(normalizePart)
  .filter(Boolean)
  .join(':');

const productListKey = ({ tenantId = 1, scope = 'public', query = {} } = {}) => (
  joinKey('products', 'list', `tenant-${tenantId}`, scope, hashObject(query))
);

const productDetailKey = ({ tenantId = 1, scope = 'public', identifier } = {}) => (
  joinKey('product', 'detail', `tenant-${tenantId}`, scope, identifier)
);

const categoryListKey = ({ tenantId = 1, scope = 'public' } = {}) => (
  joinKey('categories', 'tree', `tenant-${tenantId}`, scope)
);

const categoryDetailKey = ({ tenantId = 1, scope = 'public', identifier } = {}) => (
  joinKey('category', 'detail', `tenant-${tenantId}`, scope, identifier)
);

const subcategoryGroupsKey = (categoryId) => joinKey('subcategory', 'groups', categoryId);

const couponValidationKey = ({ code, cartHash = 'preview' } = {}) => (
  joinKey('coupon', 'validate', code, cartHash)
);

module.exports = {
  hashObject,
  joinKey,
  stableStringify,
  productListKey,
  productDetailKey,
  categoryListKey,
  categoryDetailKey,
  subcategoryGroupsKey,
  couponValidationKey,
};

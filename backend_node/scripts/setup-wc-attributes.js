const wcClient = require('../src/config/integrations/woocommerce');

const REQUIRED_ATTRIBUTES = [
  { name: 'Size', slug: 'pa_size', type: 'select', order_by: 'menu_order', has_archives: true },
  { name: 'Color', slug: 'pa_color', type: 'select', order_by: 'menu_order', has_archives: true },
];

const REQUIRED_TERMS = {
  pa_size: ['S', 'M', 'L'],
  pa_color: ['Red', 'Blue', 'Green'],
};

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function attributeMatches(attribute, required) {
  const requiredSlug = normalize(required.slug);
  const attrSlug = normalize(attribute.slug);
  const attrName = normalize(attribute.name);

  return (
    attrSlug === requiredSlug ||
    `pa_${attrSlug}` === requiredSlug ||
    attrName === normalize(required.name)
  );
}

async function fetchAllAttributes() {
  const response = await wcClient.get('/products/attributes', {
    params: { per_page: 100 },
  });
  return Array.isArray(response.data) ? response.data : [];
}

async function ensureAttribute(requiredAttribute, existingAttributes) {
  const found = existingAttributes.find((attr) => attributeMatches(attr, requiredAttribute));
  if (found) {
    return {
      id: found.id,
      name: found.name,
      slug: requiredAttribute.slug,
      taxonomy: requiredAttribute.slug,
      created: false,
    };
  }

  const createdResponse = await wcClient.post('/products/attributes', requiredAttribute);
  const created = createdResponse.data;
  return {
    id: created.id,
    name: created.name,
    slug: requiredAttribute.slug,
    taxonomy: requiredAttribute.slug,
    created: true,
  };
}

async function ensureTerms(attributeId, requiredTerms) {
  const termsResponse = await wcClient.get(`/products/attributes/${attributeId}/terms`, {
    params: { per_page: 100, hide_empty: false },
  });
  const existingTerms = Array.isArray(termsResponse.data) ? termsResponse.data : [];

  const termMap = {};

  for (const termName of requiredTerms) {
    const existing = existingTerms.find((term) => normalize(term.name) === normalize(termName));
    if (existing) {
      termMap[termName] = { id: existing.id, name: existing.name, slug: existing.slug, created: false };
      continue;
    }

    const createdResponse = await wcClient.post(`/products/attributes/${attributeId}/terms`, { name: termName });
    const created = createdResponse.data;
    termMap[termName] = { id: created.id, name: created.name, slug: created.slug, created: true };
  }

  return termMap;
}

async function setupGlobalAttributes() {
  try {
    const existingAttributes = await fetchAllAttributes();

    const attributeResult = {};
    for (const requiredAttribute of REQUIRED_ATTRIBUTES) {
      const ensured = await ensureAttribute(requiredAttribute, existingAttributes);
      attributeResult[requiredAttribute.slug] = ensured;
    }

    const termResult = {};
    for (const [attributeSlug, terms] of Object.entries(REQUIRED_TERMS)) {
      const attributeId = attributeResult[attributeSlug]?.id;
      if (!attributeId) {
        throw new Error(`Attribute ${attributeSlug} not found after ensure step.`);
      }
      termResult[attributeSlug] = await ensureTerms(attributeId, terms);
    }

    const result = {
      attributes: attributeResult,
      terms: termResult,
    };

    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    const apiError = error.response?.data;
    console.error('setup-wc-attributes failed:', apiError || error.message);
    throw error;
  }
}

if (require.main === module) {
  setupGlobalAttributes()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = setupGlobalAttributes;

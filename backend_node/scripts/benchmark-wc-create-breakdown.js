const wcClient = require('../integrations/woocommerce');

const REQUIRED_SIZES = ['S', 'M'];
const REQUIRED_COLORS = ['Red', 'Blue'];
const MATRIX = [
  { size: 'S', color: 'Red', stock: 10 },
  { size: 'S', color: 'Blue', stock: 10 },
  { size: 'M', color: 'Red', stock: 10 },
  { size: 'M', color: 'Blue', stock: 10 },
];

function hrNow() {
  return process.hrtime.bigint();
}

function msDiff(start, end) {
  return Number(end - start) / 1e6;
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function findAttribute(attributes, taxonomy, fallbackName) {
  const wantedTaxonomy = normalize(taxonomy);
  const wantedName = normalize(fallbackName);

  return attributes.find((attr) => {
    const attrSlug = normalize(attr.slug);
    const attrName = normalize(attr.name);
    return attrSlug === wantedTaxonomy || `pa_${attrSlug}` === wantedTaxonomy || attrName === wantedName;
  });
}

function findTermByName(terms, name) {
  const wanted = normalize(name);
  return terms.find((term) => normalize(term.name) === wanted);
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function getAttributeContext() {
  const attrResponse = await wcClient.get('/products/attributes', { params: { per_page: 100 } });
  const attributes = Array.isArray(attrResponse.data) ? attrResponse.data : [];

  const sizeAttribute = findAttribute(attributes, 'pa_size', 'Size');
  const colorAttribute = findAttribute(attributes, 'pa_color', 'Color');
  if (!sizeAttribute || !colorAttribute) {
    throw new Error('Missing pa_size or pa_color. Run setup-wc-attributes first.');
  }

  const [sizeTermsRes, colorTermsRes] = await Promise.all([
    wcClient.get(`/products/attributes/${sizeAttribute.id}/terms`, { params: { per_page: 100, hide_empty: false } }),
    wcClient.get(`/products/attributes/${colorAttribute.id}/terms`, { params: { per_page: 100, hide_empty: false } }),
  ]);

  const sizeTerms = Array.isArray(sizeTermsRes.data) ? sizeTermsRes.data : [];
  const colorTerms = Array.isArray(colorTermsRes.data) ? colorTermsRes.data : [];

  const requiredSizeTerms = REQUIRED_SIZES.map((name) => {
    const term = findTermByName(sizeTerms, name);
    if (!term) throw new Error(`Missing term ${name} in pa_size`);
    return term;
  });

  const requiredColorTerms = REQUIRED_COLORS.map((name) => {
    const term = findTermByName(colorTerms, name);
    if (!term) throw new Error(`Missing term ${name} in pa_color`);
    return term;
  });

  return {
    size: { id: sizeAttribute.id, terms: requiredSizeTerms },
    color: { id: colorAttribute.id, terms: requiredColorTerms },
  };
}

async function benchmarkCreateBreakdown() {
  const categoryId = process.env.BENCH_CATEGORY_ID ? Number(process.env.BENCH_CATEGORY_ID) : null;
  const regularPrice = process.env.BENCH_REGULAR_PRICE || '5000';
  const status = process.env.BENCH_STATUS || 'draft';
  const deleteAfter = process.env.BENCH_DELETE_AFTER !== 'false';

  const context = await getAttributeContext();
  const sizeMap = new Map(context.size.terms.map((term) => [normalize(term.name), term]));
  const colorMap = new Map(context.color.terms.map((term) => [normalize(term.name), term]));

  const name = `PerfDiag-${Date.now()}`;
  const parentPayload = {
    name,
    type: 'variable',
    status,
    regular_price: String(regularPrice),
    ...(categoryId ? { categories: [{ id: categoryId }] } : {}),
    attributes: [
      {
        id: context.size.id,
        variation: true,
        visible: true,
        options: [...REQUIRED_SIZES],
      },
      {
        id: context.color.id,
        variation: true,
        visible: true,
        options: [...REQUIRED_COLORS],
      },
    ],
  };

  let createdProductId = null;
  try {
    const fullStart = hrNow();

    const parentStart = hrNow();
    const parentResponse = await wcClient.post('/products', parentPayload);
    const parentEnd = hrNow();

    const parent = parentResponse.data;
    createdProductId = parent.id;

    const batchPayload = {
      create: MATRIX.map((entry) => {
        const sizeTerm = sizeMap.get(normalize(entry.size));
        const colorTerm = colorMap.get(normalize(entry.color));

        if (!sizeTerm || !colorTerm) {
          throw new Error(`Missing required term for ${entry.size}/${entry.color}`);
        }

        return {
          regular_price: String(regularPrice),
          manage_stock: true,
          stock_quantity: entry.stock,
          sku: `${parent.slug}-${slugify(entry.size)}-${slugify(entry.color)}`,
          attributes: [
            { id: context.size.id, option: sizeTerm.name },
            { id: context.color.id, option: colorTerm.name },
          ],
        };
      }),
    };

    const batchStart = hrNow();
    await wcClient.post(`/products/${parent.id}/variations/batch`, batchPayload);
    const batchEnd = hrNow();

    const fullEnd = hrNow();

    const parentMs = msDiff(parentStart, parentEnd);
    const batchMs = msDiff(batchStart, batchEnd);
    const fullMs = msDiff(fullStart, fullEnd);

    console.log('=== WooCommerce Create Benchmark ===');
    console.log(`Parent create: ${parentMs.toFixed(2)} ms`);
    console.log(`Variations batch create: ${batchMs.toFixed(2)} ms`);
    console.log(`Full create flow: ${fullMs.toFixed(2)} ms`);
    console.log(`Product ID: ${parent.id}`);
    console.log(`Product Slug: ${parent.slug}`);
  } catch (error) {
    console.error('Benchmark failed:', error.response?.data || error.message);
    process.exitCode = 1;
  } finally {
    if (deleteAfter && createdProductId) {
      try {
        await wcClient.delete(`/products/${createdProductId}`, { params: { force: true } });
        console.log(`Cleanup: deleted benchmark product ${createdProductId}`);
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError.response?.data || cleanupError.message);
      }
    }
  }
}

if (require.main === module) {
  benchmarkCreateBreakdown();
}

module.exports = benchmarkCreateBreakdown;

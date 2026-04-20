const crypto = require('crypto');
const { connectDB, mongoose } = require('../db/mongodb');
const { Product, Blog, Category } = require('../models');
const { productCatalog } = require('../mock/productCatalog');

const DEFAULT_PRODUCT_STATUS = 'published';
const DEFAULT_TENANT_ID = 1;

const CATEGORY_BLUEPRINTS = [
  {
    name: 'Women Wear',
    slug: 'women-wear',
    description: 'Curated ethnic wear, sarees, lehengas, suits, and kurtas for every occasion.',
  },
  {
    name: 'Luxury Collection',
    slug: 'luxury-collection',
    description: 'Premium festive and bridal edits with heirloom craftsmanship.',
  },
  {
    name: 'Regional Collections',
    slug: 'regional-collections',
    description: 'Handloom and artisan-led collections inspired by regional crafts.',
  },
  {
    name: 'Home & Lifestyle',
    slug: 'home-lifestyle',
    description: 'Soft furnishings and handcrafted home accents with artisanal character.',
  },
  {
    name: 'Jewellery',
    slug: 'jewellery',
    description: 'Statement jewellery and handcrafted adornments for festive styling.',
  },
  {
    name: 'Festive Wear',
    slug: 'festive-wear',
    description: 'Celebration-ready silhouettes, rich fabrics, and occasion pieces.',
  },
  {
    name: 'Sarees',
    slug: 'sarees',
    parentSlug: 'women-wear',
    description: 'Timeless sarees ranging from handloom classics to modern festive edits.',
  },
  {
    name: 'Silk Sarees',
    slug: 'silk-sarees',
    parentSlug: 'sarees',
    description: 'Rich silk sarees crafted for wedding and festive wardrobes.',
  },
  {
    name: 'Cotton Sarees',
    slug: 'cotton-sarees',
    parentSlug: 'sarees',
    description: 'Breathable cotton sarees for elegant everyday dressing.',
  },
  {
    name: 'Designer Sarees',
    slug: 'designer-sarees',
    parentSlug: 'sarees',
    description: 'Contemporary designer sarees with statement details.',
  },
  {
    name: 'Handloom Sarees',
    slug: 'handloom-sarees',
    parentSlug: 'sarees',
    description: 'Artisan-woven handloom sarees with regional character.',
  },
  {
    name: 'Lehengas',
    slug: 'lehengas',
    parentSlug: 'women-wear',
    description: 'Bridal and festive lehengas with embroidered and occasion-ready silhouettes.',
  },
  {
    name: 'Kurta Sets',
    slug: 'kurta-sets',
    parentSlug: 'women-wear',
    description: 'Complete kurta set looks for everyday elegance and celebrations.',
  },
  {
    name: 'Kurtas',
    slug: 'kurtas',
    parentSlug: 'women-wear',
    description: 'Versatile kurtas crafted for comfort and festive layering.',
  },
  {
    name: 'Suits',
    slug: 'suits',
    parentSlug: 'women-wear',
    description: 'Coordinated ethnic suits and dressy ensembles.',
  },
  {
    name: 'Ethnic Dresses',
    slug: 'ethnic-dresses',
    parentSlug: 'women-wear',
    description: 'Dress silhouettes with ethnic detailing and modern ease.',
  },
  {
    name: 'Kurti Material',
    slug: 'kurti-material',
    parentSlug: 'women-wear',
    description: 'Unstitched kurti fabrics ready for custom tailoring.',
  },
  {
    name: 'Bedsheets',
    slug: 'bedsheets',
    parentSlug: 'home-lifestyle',
    description: 'Comfort-focused bedsheets with handcrafted-inspired prints.',
  },
  {
    name: 'Pillow Covers',
    slug: 'pillow-covers',
    parentSlug: 'home-lifestyle',
    description: 'Decorative pillow covers designed to soften and elevate interiors.',
  },
  {
    name: 'Cushion Covers',
    slug: 'cushion-covers',
    parentSlug: 'home-lifestyle',
    description: 'Textured cushion covers with artisanal embroidery and print details.',
  },
  {
    name: 'Earrings',
    slug: 'earrings',
    parentSlug: 'jewellery',
    description: 'Festive earrings and jhumkas for elevated ethnic styling.',
  },
  {
    name: 'Bangles',
    slug: 'bangles',
    parentSlug: 'jewellery',
    description: 'Stackable bangles and bridal-inspired wristwear.',
  },
  {
    name: 'Uncategorized',
    slug: 'uncategorized',
    description: 'Products awaiting a more specific category assignment.',
  },
];

const PRODUCT_CATEGORY_SLUG_MAP = {
  'silk-sarees': ['sarees', 'silk-sarees', 'women-wear', 'luxury-collection', 'festive-wear'],
  'cotton-sarees': ['sarees', 'cotton-sarees', 'women-wear'],
  'designer-sarees': ['sarees', 'designer-sarees', 'women-wear', 'luxury-collection', 'festive-wear'],
  'handloom-sarees': ['sarees', 'handloom-sarees', 'women-wear', 'regional-collections'],
  lehengas: ['lehengas', 'women-wear', 'luxury-collection', 'festive-wear'],
  'kurta-sets': ['kurta-sets', 'women-wear', 'festive-wear'],
  kurtas: ['kurtas', 'women-wear'],
  suits: ['suits', 'women-wear', 'festive-wear'],
  'ethnic-dresses': ['ethnic-dresses', 'women-wear', 'festive-wear'],
  'kurti-material': ['kurti-material', 'women-wear'],
  sarees: ['sarees', 'women-wear', 'festive-wear'],
  bedsheets: ['bedsheets', 'home-lifestyle'],
  'pillow-covers': ['pillow-covers', 'home-lifestyle'],
  'cushion-covers': ['cushion-covers', 'home-lifestyle'],
  earrings: ['earrings', 'jewellery'],
  bangles: ['bangles', 'jewellery'],
};

const EXTRA_SAMPLE_PRODUCTS = [
  {
    name: 'SAMPLE Jaipuri Bedsheet Set',
    slug: 'sample-jaipuri-bedsheet-set',
    description: 'A breathable cotton bedsheet set with artisanal floral print and a soft hand-feel.',
    fabric: 'Cotton',
    color: 'Indigo',
    occasion: 'Everyday',
    work: 'Block Print',
    images: [
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
    ],
    thumbnail: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
    basePrice: 1699,
    categories: ['bedsheets', 'home-lifestyle'],
    variants: [
      {
        sku: 'SAMPLE-BED-QUEEN',
        price: 1699,
        stock: 18,
        size: 'Queen',
        color: 'Indigo',
      },
    ],
  },
  {
    name: 'SAMPLE Block Print Pillow Cover Pair',
    slug: 'sample-block-print-pillow-cover-pair',
    description: 'A pair of soft cotton pillow covers finished with heritage-inspired block prints.',
    fabric: 'Cotton',
    color: 'Sand',
    occasion: 'Everyday',
    work: 'Block Print',
    images: [
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
    ],
    thumbnail: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80',
    basePrice: 799,
    categories: ['pillow-covers', 'home-lifestyle'],
    variants: [
      {
        sku: 'SAMPLE-PILLOW-STD',
        price: 799,
        stock: 28,
        size: 'Standard',
        color: 'Sand',
      },
    ],
  },
  {
    name: 'SAMPLE Embroidered Cushion Cover',
    slug: 'sample-embroidered-cushion-cover',
    description: 'A richly textured cushion cover with artisanal embroidery and a festive color story.',
    fabric: 'Cotton Blend',
    color: 'Rust',
    occasion: 'Festive',
    work: 'Embroidery',
    images: [
      'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1200&q=80',
    ],
    thumbnail: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80',
    basePrice: 649,
    categories: ['cushion-covers', 'home-lifestyle'],
    variants: [
      {
        sku: 'SAMPLE-CUSHION-18',
        price: 649,
        stock: 24,
        size: '18x18',
        color: 'Rust',
      },
    ],
  },
  {
    name: 'SAMPLE Temple Jhumka Set',
    slug: 'sample-temple-jhumka-set',
    description: 'Statement jhumkas with temple-inspired detailing for festive and wedding styling.',
    fabric: 'Alloy',
    color: 'Gold',
    occasion: 'Festive',
    work: 'Temple Work',
    images: [
      'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=1200&q=80',
    ],
    thumbnail: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=800&q=80',
    basePrice: 1199,
    categories: ['earrings', 'jewellery'],
    variants: [
      {
        sku: 'SAMPLE-EARRING-GOLD',
        price: 1199,
        stock: 14,
        size: 'One Size',
        color: 'Gold',
      },
    ],
  },
  {
    name: 'SAMPLE Heritage Bangle Stack',
    slug: 'sample-heritage-bangle-stack',
    description: 'A festive stack of heritage-inspired bangles with rich enamel and metallic detailing.',
    fabric: 'Metal',
    color: 'Gold',
    occasion: 'Wedding',
    work: 'Enamel',
    images: [
      'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1200&q=80',
    ],
    thumbnail: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=800&q=80',
    basePrice: 1499,
    categories: ['bangles', 'jewellery'],
    variants: [
      {
        sku: 'SAMPLE-BANGLE-26',
        price: 1499,
        stock: 12,
        size: '2.6',
        color: 'Gold',
      },
    ],
  },
];

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleizeSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function hashAttributes(attributes = {}) {
  const normalized = Object.keys(attributes)
    .sort()
    .reduce((accumulator, key) => {
      accumulator[key.toLowerCase()] = String(attributes[key] || '').toLowerCase();
      return accumulator;
    }, {});

  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

function normalizeProductStatus(status) {
  const normalizedStatus = String(status || DEFAULT_PRODUCT_STATUS).toLowerCase();
  return normalizedStatus === 'publish' ? 'published' : normalizedStatus;
}

function getMetadataValue(metadata, key) {
  if (!metadata) return null;
  if (metadata instanceof Map) {
    return metadata.get(key) || null;
  }
  return metadata[key] || null;
}

function getProductLegacyCategorySlug(product = {}) {
  return slugify(
    product.categorySlug ||
    product.category ||
    getMetadataValue(product.metadata, 'legacyCategorySlug') ||
    product.categoryName ||
    'uncategorized'
  );
}

function getMappedCategorySlugs(product = {}) {
  const legacyCategorySlug = getProductLegacyCategorySlug(product);
  const mappedSlugs = PRODUCT_CATEGORY_SLUG_MAP[legacyCategorySlug] || [legacyCategorySlug];

  if (mappedSlugs.length === 0) {
    return ['uncategorized'];
  }

  return [...new Set(mappedSlugs.map((slug) => slugify(slug)).filter(Boolean))];
}

function buildDynamicCategoryBlueprints() {
  const blueprintMap = new Map(CATEGORY_BLUEPRINTS.map((blueprint) => [blueprint.slug, blueprint]));

  for (const product of productCatalog) {
    const legacyCategorySlug = getProductLegacyCategorySlug(product);
    if (!blueprintMap.has(legacyCategorySlug)) {
      blueprintMap.set(legacyCategorySlug, {
        name: product.categoryName || titleizeSlug(legacyCategorySlug),
        slug: legacyCategorySlug,
        parentSlug: legacyCategorySlug.endsWith('-sarees') ? 'sarees' : 'women-wear',
        description: `Curated ${product.categoryName || titleizeSlug(legacyCategorySlug)} selections from Shri Ramya.`,
      });
    }
  }

  return Array.from(blueprintMap.values());
}

function normalizeVariant(variant = {}, fallback = {}) {
  const color = variant.color || variant.attributes?.color || variant.attributes?.Color || fallback.color || 'Multi';
  const size = variant.size || variant.attributes?.size || variant.attributes?.Size || fallback.size || 'Free Size';
  const attributes = {
    ...(variant.attributes || {}),
    color,
    size,
    Color: variant.attributes?.Color || color,
    Size: variant.attributes?.Size || size,
  };
  const price = Number(variant.price || fallback.price || 0) || 0;
  const discountPrice = variant.discountPrice == null || variant.discountPrice === ''
    ? null
    : (Number(variant.discountPrice) || null);
  const stock = Number(variant.stock ?? fallback.stock ?? 0) || 0;

  return {
    sku: variant.sku || fallback.sku || `SKU-${Date.now()}`,
    price,
    discountPrice,
    image: variant.image || fallback.image || null,
    color,
    size,
    stock,
    lowStockThreshold: Number(variant.lowStockThreshold || 5) || 5,
    attributes,
    attributes_hash: hashAttributes(attributes),
  };
}

function buildProductDocument(product, categoryMap, index = 0) {
  const legacyCategorySlug = getProductLegacyCategorySlug(product);
  const categoryIds = getMappedCategorySlugs(product)
    .map((slug) => categoryMap.get(slug)?._id)
    .filter(Boolean);
  const firstColor = Array.isArray(product.colors) && product.colors.length > 0 ? product.colors[0] : (product.color || 'Multi');
  const firstSize = Array.isArray(product.sizes) && product.sizes.length > 0 ? product.sizes[0] : 'Free Size';
  const image = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null;
  const basePrice = Number(product.basePrice || product.price || product.salePrice || 0) || 0;
  const variants = Array.isArray(product.variants) && product.variants.length > 0
    ? product.variants.map((variant) => normalizeVariant(variant, { image, color: firstColor, size: firstSize, stock: product.stock || 10, price: basePrice }))
    : [normalizeVariant({}, { sku: product.sku || `${slugify(product.name)}-default`, image, color: firstColor, size: firstSize, stock: product.stock || 10, price: basePrice })];

  return {
    productId: Number(product.id || index + 1),
    name: product.name,
    slug: slugify(product.slug || product.name),
    sku: product.sku || variants[0].sku,
    description: product.description || product.shortDescription || '',
    fabric: product.fabric || '',
    color: firstColor,
    occasion: product.occasion || '',
    work: product.pattern || product.work || '',
    brand: product.brand || 'Shri Ramya',
    images: Array.isArray(product.images) ? product.images : [],
    thumbnail: product.thumbnail || image || null,
    basePrice,
    rating: Number(product.rating || 0) || 0,
    reviewCount: Number(product.reviewCount || 0) || 0,
    isFeatured: Boolean(product.featured || product.isFeatured),
    isTrending: Boolean(product.isTrending) || Number(product.popularity || 0) >= 80,
    isNew: Boolean(product.isNew),
    categoryId: categoryIds[0] || categoryMap.get('uncategorized')?._id || null,
    categories: categoryIds.length > 0 ? categoryIds : [categoryMap.get('uncategorized')?._id].filter(Boolean),
    status: normalizeProductStatus(product.status),
    tenant_id: DEFAULT_TENANT_ID,
    variants,
    metadata: {
      legacyCategorySlug,
      legacyCategoryName: product.categoryName || titleizeSlug(legacyCategorySlug),
      shortDescription: product.shortDescription || '',
      tags: product.tags || [],
    },
    metaTitle: product.name,
    metaDescription: product.shortDescription || product.description || '',
  };
}

function buildExtraSampleProductDocument(product, categoryMap, index = 0) {
  const categoryIds = product.categories
    .map((slug) => categoryMap.get(slug)?._id)
    .filter(Boolean);
  const image = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null;
  const variants = (product.variants || []).map((variant) => normalizeVariant(variant, { image, price: product.basePrice, stock: 10 }));

  return {
    productId: 10000 + index,
    name: product.name,
    slug: product.slug,
    sku: variants[0]?.sku || `${product.slug}-default`,
    description: product.description,
    fabric: product.fabric,
    color: product.color,
    occasion: product.occasion,
    work: product.work,
    brand: 'Shri Ramya',
    images: product.images,
    thumbnail: product.thumbnail || image || null,
    basePrice: Number(product.basePrice || 0) || 0,
    rating: 0,
    reviewCount: 0,
    isFeatured: true,
    isTrending: true,
    isNew: true,
    categoryId: categoryIds[0] || categoryMap.get('uncategorized')?._id || null,
    categories: categoryIds.length > 0 ? categoryIds : [categoryMap.get('uncategorized')?._id].filter(Boolean),
    status: DEFAULT_PRODUCT_STATUS,
    tenant_id: DEFAULT_TENANT_ID,
    variants,
    metadata: {
      legacyCategorySlug: product.categories[0] || 'uncategorized',
      legacyCategoryName: titleizeSlug(product.categories[0] || 'uncategorized'),
      sampleSeed: true,
    },
    metaTitle: product.name,
    metaDescription: product.description,
  };
}

async function ensureCategories() {
  const blueprints = buildDynamicCategoryBlueprints();
  const categoryMap = new Map();

  for (const blueprint of blueprints) {
    const category = await Category.findOneAndUpdate(
      { slug: blueprint.slug },
      {
        $setOnInsert: {
          name: blueprint.name,
          slug: blueprint.slug,
          description: blueprint.description || '',
          image: blueprint.image || null,
          menu_order: 0,
          tenant_id: DEFAULT_TENANT_ID,
          is_deleted: false,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    categoryMap.set(blueprint.slug, category);
  }

  for (const blueprint of blueprints) {
    if (!blueprint.parentSlug) continue;
    const category = categoryMap.get(blueprint.slug);
    const parentCategory = categoryMap.get(blueprint.parentSlug);

    if (!category || !parentCategory) continue;
    if (category.parent_id) continue;

    category.parent_id = parentCategory._id;
    await category.save();
    categoryMap.set(blueprint.slug, category);
  }

  return categoryMap;
}

async function seedCatalogProducts(categoryMap) {
  const existingProducts = await Product.find({}, { slug: 1 }).lean();
  const existingSlugs = new Set(existingProducts.map((product) => product.slug).filter(Boolean));

  const catalogProductsToInsert = productCatalog
    .map((product, index) => buildProductDocument(product, categoryMap, index))
    .filter((product) => !existingSlugs.has(product.slug));

  const extraProductsToInsert = EXTRA_SAMPLE_PRODUCTS
    .map((product, index) => buildExtraSampleProductDocument(product, categoryMap, index + 1))
    .filter((product) => !existingSlugs.has(product.slug));

  if (catalogProductsToInsert.length > 0) {
    await Product.insertMany(catalogProductsToInsert, { ordered: false });
  }

  if (extraProductsToInsert.length > 0) {
    await Product.insertMany(extraProductsToInsert, { ordered: false });
  }

  const totalProductCount = await Product.countDocuments();
  console.log(`Products ready: ${totalProductCount} total (${catalogProductsToInsert.length + extraProductsToInsert.length} inserted this run)`);
}

async function seedUsers(db) {
  const usersCollection = db.collection('users');
  const userCount = await usersCollection.countDocuments();

  {
    const bcrypt = require('bcryptjs');
    const adminHash = await bcrypt.hash('Admin@123', 8);
    const customerHash = await bcrypt.hash('Test@123', 8);

    const users = [
      {
        email: 'admin@shriramya.com',
        password: adminHash,
        name: 'Admin User',
        phone: '+91-9876543210',
        role: 'admin',
        is_active: true,
        tenant_id: DEFAULT_TENANT_ID,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        email: 'customer@test.com',
        password: customerHash,
        name: 'Test Customer',
        phone: '+91-9876543211',
        role: 'user',
        is_active: true,
        shipping: {
          first_name: 'Test',
          last_name: 'Customer',
          address_1: '123 MG Road',
          city: 'Jaipur',
          state: 'Rajasthan',
          postcode: '302001',
          country: 'India',
        },
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    for (const user of users) {
      const existingUser = await usersCollection.findOne({ email: user.email });
      if (!existingUser) {
        await usersCollection.insertOne(user);
      }
    }

    console.log('Seeded/Verified users in MongoDB');
  }
}

async function seedBlogs() {
  const blogCount = await Blog.countDocuments();

  if (blogCount === 0) {
    const seededBlogs = [
      {
        title: 'The Art of Sanganeri Printing',
        slug: 'art-of-sanganeri-printing',
        content: '<p>Sanganeri printing is a traditional form of hand block printing that originated in the town of Sanganer, near Jaipur, Rajasthan.</p>',
        excerpt: 'Discover the centuries-old craft of Sanganeri block printing.',
        author: { id: 'admin', name: 'Shri Ramya Team' },
        categories: ['Traditional Crafts', 'Silk Sarees'],
        tags: ['sanganeri', 'block-printing', 'rajasthan'],
        status: 'published',
        views: 245,
        commentsCount: 12,
        publishedAt: new Date('2026-03-01'),
      },
      {
        title: 'Styling Your Silk Saree for Every Occasion',
        slug: 'styling-silk-saree-occasions',
        content: '<p>A silk saree is a versatile garment that can be styled for various occasions.</p>',
        excerpt: 'Learn how to style your silk saree for weddings, festivals, and everyday elegance.',
        author: { id: 'admin', name: 'Shri Ramya Team' },
        categories: ['Style Guide', 'Silk Sarees'],
        tags: ['styling', 'silk-saree', 'fashion-tips'],
        status: 'published',
        views: 189,
        commentsCount: 8,
        publishedAt: new Date('2026-03-10'),
      },
      {
        title: 'Sustainable Fashion: The Handloom Story',
        slug: 'sustainable-fashion-handloom',
        content: '<p>Handloom weaving is one of the most sustainable forms of textile production.</p>',
        excerpt: 'How choosing handloom supports artisan communities and protects the environment.',
        author: { id: 'admin', name: 'Shri Ramya Team' },
        categories: ['Sustainability', 'Handloom'],
        tags: ['sustainability', 'handloom', 'eco-fashion'],
        status: 'published',
        views: 0,
        commentsCount: 0,
        publishedAt: new Date('2026-03-15'),
      },
    ];

    await Blog.insertMany(seededBlogs, { ordered: false });
    console.log(`Seeded ${seededBlogs.length} blogs into MongoDB`);
  } else {
    console.log(`Blogs already seeded: ${blogCount} found`);
  }
}

async function backfillProductCategories(categoryMap) {
  const products = await Product.find({ is_deleted: { $ne: true } });
  let updatedProducts = 0;

  for (const product of products) {
    const existingCategories = Array.isArray(product.categories) ? product.categories.filter(Boolean) : [];
    const mappedCategoryIds = getMappedCategorySlugs(product)
      .map((slug) => categoryMap.get(slug)?._id)
      .filter(Boolean);
    const fallbackCategoryId = categoryMap.get('uncategorized')?._id || null;

    let didChange = false;

    if (existingCategories.length === 0 && mappedCategoryIds.length > 0) {
      product.categories = mappedCategoryIds;
      didChange = true;
    } else if (existingCategories.length === 0 && fallbackCategoryId) {
      product.categories = [fallbackCategoryId];
      didChange = true;
    }

    if (!product.categoryId) {
      product.categoryId = product.categories?.[0] || mappedCategoryIds[0] || fallbackCategoryId;
      didChange = true;
    }

    if (didChange) {
      await product.save();
      updatedProducts += 1;
    }
  }

  console.log(`Backfilled product-category links for ${updatedProducts} products`);
}

const seedDatabase = async () => {
  try {
    await connectDB();
    const db = mongoose.connection.db;

    const categoryMap = await ensureCategories();
    console.log(`Categories ready: ${categoryMap.size}`);

    await seedCatalogProducts(categoryMap);
    await seedUsers(db);
    await seedBlogs();
    await backfillProductCategories(categoryMap);

    console.log('Database seeding complete!');
  } catch (error) {
    console.error('Seed error:', error.message);
  }
};

module.exports = { seedDatabase };

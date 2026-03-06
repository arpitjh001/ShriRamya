// Transform single native product for frontend consumption
export const transformWooProduct = (product) => {
  if (!product) return null;

  const parseAttributes = (value) => {
    if (value == null) return {};
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch (error) {
      return {};
    }
  };

  const normalizeVariant = (variant = {}) => {
    const price = Number(variant.price ?? variant.regular_price ?? 0) || 0;
    const discountPriceRaw = variant.discountPrice ?? variant.discount_price ?? null;
    const effectivePriceRaw = variant.effectivePrice ?? variant.effective_price ?? null;
    const discountPrice = discountPriceRaw === null || discountPriceRaw === '' ? null : Number(discountPriceRaw);
    const effectivePrice = effectivePriceRaw === null || effectivePriceRaw === ''
      ? null
      : Number(effectivePriceRaw);

    return {
      ...variant,
      price,
      discountPrice: Number.isFinite(discountPrice) ? discountPrice : null,
      discountStart: variant.discountStart ?? variant.discount_start ?? null,
      discountEnd: variant.discountEnd ?? variant.discount_end ?? null,
      effectivePrice: Number.isFinite(effectivePrice)
        ? effectivePrice
        : (Number.isFinite(discountPrice) && discountPrice < price ? discountPrice : price),
      stock: Number(variant.stock ?? variant.stock_quantity ?? 0) || 0,
      attributes: parseAttributes(variant.attributes),
      image: variant.image || null,
    };
  };

  const normalizedVariants = Array.isArray(product.variants)
    ? product.variants.map(normalizeVariant)
    : [];

  // Handle images: backend now provides string array natively
  let images = [];
  if (Array.isArray(product.images)) {
    images = product.images.map((img) => {
      if (typeof img === 'string') return img;
      if (typeof img === 'object' && img?.src) return img.src;
      return null;
    }).filter(Boolean);
  }
  if (images.length === 0) {
    if (product.image) {
      images = [product.image];
    } else {
      const firstVariantImage = normalizedVariants.find((variant) => variant.image)?.image;
      if (firstVariantImage) {
        images = [firstVariantImage];
      }
    }
  }

  const basePrice = Number(product.basePrice ?? product.base_price ?? product.price ?? product.regular_price ?? 0) || 0;
  const minVariantPrice = normalizedVariants.length > 0
    ? Math.min(...normalizedVariants.map((variant) => Number(variant.price || 0)).filter((value) => value > 0))
    : null;
  const variantDiscounts = normalizedVariants
    .filter((variant) => Number(variant.effectivePrice || 0) > 0 && Number(variant.effectivePrice || 0) < Number(variant.price || 0))
    .map((variant) => Number(variant.effectivePrice));
  const minVariantDiscount = variantDiscounts.length > 0 ? Math.min(...variantDiscounts) : null;

  const regularPrice = minVariantPrice && Number.isFinite(minVariantPrice) ? minVariantPrice : basePrice;
  const explicitSalePrice = product.salePrice ?? product.sale_price ?? null;
  const normalizedSalePrice = explicitSalePrice === null || explicitSalePrice === '' ? null : Number(explicitSalePrice);
  const salePriceCandidate = minVariantDiscount && Number.isFinite(minVariantDiscount) ? minVariantDiscount : normalizedSalePrice;
  const salePrice = Number.isFinite(salePriceCandidate) && salePriceCandidate < regularPrice ? salePriceCandidate : null;

  // Aggregate variant stock if not provided natively
  const totalStock = normalizedVariants.length > 0
    ? normalizedVariants.reduce((sum, variant) => sum + (variant.stock || 0), 0)
    : (product.stock || 0);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug || product.name?.toLowerCase().replace(/\s+/g, '-'),
    description: product.description,
    short_description: product.short_description || product.description?.substring(0, 50),

    price: regularPrice,
    sale_price: salePrice,

    category: product.categories?.[0]?.name || product.category || null,
    subcategory: product.subcategory || null,
    categories: product.categories || [],

    images: images,

    in_stock: totalStock > 0 || product.status === "publish" || product.status === "published",
    stock_quantity: totalStock,

    status: product.status,

    luxury_collection: product.luxury_collection === true,
    handmade: product.handmade === true,

    fabric: product.fabric || null,
    craft_style: product.craft_style || null,
    state_of_origin: product.state_of_origin || null,
    occasion: product.occasion || null,
    care_instructions: product.care_instructions || null,

    // Explicit variants support
    variants: normalizedVariants,
    variations: normalizedVariants, // Legacy alias for compatibility
    attributes: product.attributes || [],

    // For backwards compatibility in UI that expects size_stock / color_stock formatting
    size_stock: normalizedVariants.filter(v => v.attributes?.Size).map(v => ({ size: v.attributes.Size, qty: v.stock })),
    color_stock: normalizedVariants.filter(v => v.attributes?.Color).map(v => ({ color: v.attributes.Color, qty: v.stock }))
  };
};

// ⭐ Transform list of Woo products
export const transformWooProducts = (wooProducts = []) => {
  if (!Array.isArray(wooProducts)) return [];

  return wooProducts
    .map(transformWooProduct)
    .filter(Boolean);
};


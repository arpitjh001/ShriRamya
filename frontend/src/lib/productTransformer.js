// Transform single WooCommerce product (also handles MongoDB format)
export const transformWooProduct = (product) => {
  if (!product) return null;

  // Handle images - can be array of strings OR array of {src} objects
  let images = [];
  if (Array.isArray(product.images)) {
    images = product.images.map((img) => {
      if (typeof img === 'string') return img;  // MongoDB format: already a URL
      if (typeof img === 'object' && img?.src) return img.src;  // WooCommerce format
      return null;
    }).filter(Boolean);
  }

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    short_description: product.short_description,

    price: Number(product.regular_price || product.price) || 0,
    sale_price: product.sale_price
      ? Number(product.sale_price)
      : null,

    category: product.categories?.[0]?.name || product.category || null,
    subcategory: product.subcategory || null,
    categories: product.categories || [],

    images: images,

    stock_status: product.stock_status,
    in_stock: product.stock_status === "instock" || product.in_stock === true,
    stock_quantity: product.stock_quantity || 0,

    luxury_collection:
      product.tags?.some((t) => t.name === "Luxury") ||
      product.luxury_collection === true,

    handmade:
      product.tags?.some((t) => t.name === "Handmade") ||
      product.handmade === true,

    // Additional MongoDB fields
    fabric: product.fabric || product.meta_data?.find(m => m.key === '_sr_fabric')?.value || null,
    craft_style: product.craft_style || product.meta_data?.find(m => m.key === '_sr_craft_style')?.value || null,
    state_of_origin: product.state_of_origin || product.meta_data?.find(m => m.key === '_sr_state_of_origin')?.value || null,
    occasion: product.occasion || product.meta_data?.find(m => m.key === '_sr_occasion')?.value || null,
    care_instructions: product.care_instructions || product.meta_data?.find(m => m.key === '_sr_care_instructions')?.value || null,
    variations: product.variations || [],
    featured: product.featured || false,
    trending: product.trending || false,

    // Custom Variations from multiple sources
    size_stock: (() => {
      // 1. WooCommerce Meta Data
      const meta = product.meta_data?.find(m => m.key === '_sr_sizes');
      if (meta && meta.value) {
        try {
          const val = typeof meta.value === 'string' ? JSON.parse(meta.value) : meta.value;
          if (Array.isArray(val)) return val.filter(i => i.size);
        } catch (e) { }
      }
      // 2. MongoDB Direct Field
      if (Array.isArray(product.size_stock)) return product.size_stock.filter(i => i.size);
      // 3. Fallback: Derive from variations array (MongoDB Seed Style)
      if (Array.isArray(product.variations) && product.variations.length > 0 && typeof product.variations[0] === 'object') {
        const sizes = [...new Set(product.variations.map(v => v.size))].filter(Boolean);
        if (sizes.length > 0) return sizes.map(s => ({ size: s, qty: product.variations.filter(v => v.size === s).reduce((sum, v) => sum + (v.stock || v.qty || 0), 0) }));
      }
      return [];
    })(),
    color_stock: (() => {
      // 1. WooCommerce Meta Data
      const meta = product.meta_data?.find(m => m.key === '_sr_colors');
      if (meta && meta.value) {
        try {
          const val = typeof meta.value === 'string' ? JSON.parse(meta.value) : meta.value;
          if (Array.isArray(val)) return val.filter(i => i.color);
        } catch (e) { }
      }
      // 2. MongoDB Direct Field
      if (Array.isArray(product.color_stock)) return product.color_stock.filter(i => i.color);
      // 3. Fallback: Derive from variations array (MongoDB Seed Style)
      if (Array.isArray(product.variations) && product.variations.length > 0 && typeof product.variations[0] === 'object') {
        const colors = [...new Set(product.variations.map(v => v.color))].filter(Boolean);
        if (colors.length > 0) return colors.map(c => ({ color: c, qty: product.variations.filter(v => v.color === c).reduce((sum, v) => sum + (v.stock || v.qty || 0), 0) }));
      }
      return [];
    })(),
  };
};



// ⭐ Transform list of Woo products
export const transformWooProducts = (wooProducts = []) => {
  if (!Array.isArray(wooProducts)) return [];

  return wooProducts
    .map(transformWooProduct)
    .filter(Boolean);
};

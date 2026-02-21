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
    fabric: product.fabric || null,
    craft_style: product.craft_style || null,
    state_of_origin: product.state_of_origin || null,
    occasion: product.occasion || null,
    care_instructions: product.care_instructions || null,
    variations: product.variations || [],
    featured: product.featured || false,
    trending: product.trending || false,
  };
};



// ⭐ Transform list of Woo products
export const transformWooProducts = (wooProducts = []) => {
  if (!Array.isArray(wooProducts)) return [];

  return wooProducts
    .map(transformWooProduct)
    .filter(Boolean);
};

// Transform single WooCommerce product
export const transformWooProduct = (wooProduct) => {
  if (!wooProduct) return null;

  return {
    id: wooProduct.id,
    name: wooProduct.name,
    slug: wooProduct.slug,
    description: wooProduct.description,
    short_description: wooProduct.short_description,

    price: Number(wooProduct.regular_price) || 0,
    sale_price: wooProduct.sale_price
      ? Number(wooProduct.sale_price)
      : null,

    category: wooProduct.categories?.[0]?.name || null,
    categories: wooProduct.categories || [],

    images: wooProduct.images?.map((img) => img.src) || [],

    stock_status: wooProduct.stock_status,
    in_stock: wooProduct.stock_status === "instock",

    luxury_collection:
      wooProduct.tags?.some((t) => t.name === "Luxury") || false,

    handmade:
      wooProduct.tags?.some((t) => t.name === "Handmade") || false,
  };
};



// ⭐ Transform list of Woo products
export const transformWooProducts = (wooProducts = []) => {
  if (!Array.isArray(wooProducts)) return [];

  return wooProducts
    .map(transformWooProduct)
    .filter(Boolean);
};

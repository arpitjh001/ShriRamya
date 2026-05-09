export const getCartErrorMessage = (error, fallback = 'Failed to add to cart') => {
  const data = error?.response?.data || {};
  const message = data.message || error?.message || '';
  const code = data.code || error?.code || '';

  if (code === 'INSUFFICIENT_STOCK') {
    const availableStock = data.availableStock;
    return availableStock != null
      ? `Only ${availableStock} pieces available`
      : 'Selected quantity is not available';
  }

  if (
    code === 'PRODUCT_UNAVAILABLE' ||
    code === 'PRODUCT_NOT_FOUND' ||
    /not available for purchase|product not found/i.test(message)
  ) {
    return 'This product is no longer available for purchase.';
  }

  if (/variant not found/i.test(message)) {
    return 'Please choose an available size or color.';
  }

  return message || fallback;
};

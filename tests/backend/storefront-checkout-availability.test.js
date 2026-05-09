describe('StorefrontCheckoutService cart availability errors', () => {
  const loadService = (product) => {
    jest.resetModules();

    jest.doMock('../../backend_node/src/models', () => ({
      Cart: {},
      Order: {},
      Product: {
        findOne: jest.fn().mockResolvedValue(product),
      },
    }));

    jest.doMock('../../backend_node/src/config/config', () => ({
      env: 'test',
      razorpay: {
        keyId: 'rzp_test_service_key',
        keySecret: 'test_service_secret',
      },
    }));

    jest.doMock('../../backend_node/src/services/emailService', () => ({
      sendOrderConfirmation: jest.fn(),
    }));

    jest.doMock('../../backend_node/src/services/inventory-audit.service', () => ({
      inventoryAuditService: {
        logSale: jest.fn(),
      },
    }));

    jest.doMock('../../backend_node/src/services/inventory.service', () => ({
      inventoryService: {
        clearProductListCache: jest.fn(),
      },
    }));

    jest.doMock('../../backend_node/src/services/product.service', () => ({}));
    jest.doMock('../../backend_node/src/services/payments/RazorpayGateway', () => ({}));
    jest.doMock('../../backend_node/src/services/coupon.service', () => ({}));

    return require('../../backend_node/src/services/storefront-checkout.service');
  };

  it('marks unpublished products with a cart-specific error code', async () => {
    const product = {
      _id: '507f1f77bcf86cd799439011',
      status: 'draft',
      variants: [],
    };
    const service = loadService(product);

    await expect(service.resolveProductAndVariant({
      productId: product._id,
    })).rejects.toMatchObject({
      message: 'Product is not available for purchase',
      statusCode: 400,
      code: 'PRODUCT_UNAVAILABLE',
      productId: product._id,
      productStatus: 'draft',
    });
  });
});

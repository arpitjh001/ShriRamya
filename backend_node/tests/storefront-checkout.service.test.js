describe('StorefrontCheckoutService', () => {
  const loadService = () => {
    jest.resetModules();

    const orderCreate = jest.fn();
    const orderFindOne = jest.fn();
    const productFindOne = jest.fn();
    const sendOrderConfirmation = jest.fn().mockResolvedValue(undefined);
    const logSale = jest.fn().mockResolvedValue(undefined);
    const clearProductListCache = jest.fn().mockResolvedValue(undefined);
    const validateAndApplyCoupon = jest.fn().mockResolvedValue({ discount: 0 });
    const razorpayGateway = {
      isConfigured: jest.fn().mockReturnValue(false),
      createPayment: jest.fn(),
      verifyPayment: jest.fn().mockReturnValue({ success: true }),
      verifyPaymentStatus: jest.fn().mockResolvedValue({ success: true }),
    };

    jest.doMock('../src/models', () => ({
      Cart: {},
      Order: {
        create: orderCreate,
        findOne: orderFindOne,
      },
      Product: {
        findOne: productFindOne,
      },
    }));

    jest.doMock('../src/config/config', () => ({
      env: 'test',
      razorpay: {
        keyId: 'rzp_test_service_key',
        keySecret: 'test_service_secret',
      },
    }));

    jest.doMock('../src/services/emailService', () => ({
      sendOrderConfirmation,
    }));

    jest.doMock('../src/services/inventory-audit.service', () => ({
      inventoryAuditService: {
        logSale,
      },
    }));

    jest.doMock('../src/services/inventory.service', () => ({
      inventoryService: {
        clearProductListCache,
      },
    }));

    jest.doMock('../src/services/payments/RazorpayGateway', () => razorpayGateway);
    jest.doMock('../src/services/coupon.service', () => ({
      validateAndApplyCoupon,
    }));

    const service = require('../src/services/storefront-checkout.service');

    return {
      service,
      mocks: {
        orderCreate,
        orderFindOne,
        productFindOne,
        sendOrderConfirmation,
        logSale,
        clearProductListCache,
        validateAndApplyCoupon,
        razorpayGateway,
      },
    };
  };

  const createProductDoc = ({
    productId = 'product-1',
    variantId = 'variant-1',
    stock = 5,
    price = 1200,
    discountPrice = null,
    name = 'Bagru Saree',
    sku = 'BAGRU-1',
  } = {}) => {
    const variants = [
      {
        _id: variantId,
        stock,
        price,
        discountPrice,
        sku,
        attributes: {
          Color: 'Indigo',
          Size: 'Free Size',
        },
      },
    ];
    variants.id = (id) => variants.find((variant) => String(variant._id) === String(id)) || null;

    return {
      _id: productId,
      name,
      slug: `${name.toLowerCase().replace(/\s+/g, '-')}-${productId}`,
      status: 'published',
      sku,
      basePrice: price,
      variants,
      save: jest.fn().mockResolvedValue(undefined),
    };
  };

  const createOrderDoc = ({
    orderId = 'ORD-1001',
    items = [],
    paymentDetails = { isMock: true },
    saveImpl = null,
    total = 1800,
  } = {}) => {
    const order = {
      _id: 'mongo-order-1',
      orderId,
      items,
      payment_details: paymentDetails,
      razorpayOrderId: paymentDetails.razorpayOrderId || 'order_mock_1001',
      paymentStatus: 'pending',
      payment_status: 'pending',
      paymentMethod: 'razorpay',
      payment_method: 'razorpay',
      status: 'pending',
      subtotal: total,
      discount: 0,
      shipping: 0,
      tax: 0,
      total,
      total_amount: total,
      userId: 'user-1',
      userEmail: 'buyer@example.com',
      userName: 'Buyer',
      stockReduced: false,
      statusHistory: [],
      save: saveImpl || jest.fn().mockResolvedValue(undefined),
    };

    return order;
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('computes and stores order totals from server-side pricing', async () => {
    const { service, mocks } = loadService();
    const product = createProductDoc({ stock: 8, price: 1200, discountPrice: 900 });

    mocks.productFindOne.mockResolvedValue(product);
    mocks.validateAndApplyCoupon.mockResolvedValue({ discount: 100 });
    mocks.orderCreate.mockImplementation(async (payload) => ({
      _id: 'mongo-order-1',
      ...payload,
      save: jest.fn().mockResolvedValue(undefined),
    }));

    const response = await service.createOrder({
      items: [{ productId: 'product-1', quantity: 2 }],
      shipping_address: {
        name: 'Buyer',
        email: 'buyer@example.com',
        phone: '9999999999',
        address_line1: '123 Test Street',
        city: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302001',
      },
      couponCode: 'WELCOME100',
      tax: 50,
    });

    expect(mocks.orderCreate).toHaveBeenCalledTimes(1);
    const createdOrder = mocks.orderCreate.mock.calls[0][0];

    expect(createdOrder.subtotal).toBe(1800);
    expect(createdOrder.discount).toBe(100);
    expect(createdOrder.shipping).toBe(0);
    expect(createdOrder.tax).toBe(50);
    expect(createdOrder.total).toBe(1750);
    expect(createdOrder.total_amount).toBe(1750);
    expect(response.amount).toBe(175000);
    expect(response.display_amount).toBe(1750);
    expect(response.is_mock).toBe(true);
  });

  it('reduces inventory and marks the order paid after payment confirmation', async () => {
    const { service, mocks } = loadService();
    const product = createProductDoc({ stock: 5, price: 1500, discountPrice: 1200 });
    const order = createOrderDoc({
      items: [
        {
          productId: product._id,
          variantId: 'variant-1',
          quantity: 2,
          name: product.name,
        },
      ],
      total: 2400,
    });

    mocks.orderFindOne.mockResolvedValue(order);
    mocks.productFindOne.mockResolvedValue(product);

    const result = await service.confirmPayment(order.orderId, {
      razorpay_payment_id: 'pay_mock_success',
    });

    expect(product.variants[0].stock).toBe(3);
    expect(product.save).toHaveBeenCalledTimes(1);
    expect(order.save).toHaveBeenCalledTimes(1);
    expect(order.stockReduced).toBe(true);
    expect(order.paymentStatus).toBe('paid');
    expect(order.payment_status).toBe('paid');
    expect(order.razorpayPaymentId).toBe('pay_mock_success');
    expect(mocks.clearProductListCache).toHaveBeenCalledTimes(1);
    expect(mocks.logSale).toHaveBeenCalledWith(
      'variant-1',
      product._id,
      5,
      3,
      2,
      order.orderId,
      order.userId
    );
    expect(result.paymentStatus).toBe('paid');
    expect(result.total).toBe(2400);
  });

  it('does not partially reduce inventory when another order item is out of stock', async () => {
    const { service, mocks } = loadService();
    const productOne = createProductDoc({ productId: 'product-1', variantId: 'variant-1', stock: 5 });
    const productTwo = createProductDoc({ productId: 'product-2', variantId: 'variant-2', stock: 1, name: 'Limited Edition Saree' });
    const order = createOrderDoc({
      items: [
        { productId: productOne._id, variantId: 'variant-1', quantity: 1, name: productOne.name },
        { productId: productTwo._id, variantId: 'variant-2', quantity: 2, name: productTwo.name },
      ],
    });

    mocks.orderFindOne.mockResolvedValue(order);
    mocks.productFindOne
      .mockResolvedValueOnce(productOne)
      .mockResolvedValueOnce(productTwo);

    await expect(service.confirmPayment(order.orderId, {
      razorpay_payment_id: 'pay_mock_fail',
    })).rejects.toThrow('Insufficient stock for Limited Edition Saree');

    expect(productOne.variants[0].stock).toBe(5);
    expect(productTwo.variants[0].stock).toBe(1);
    expect(productOne.save).not.toHaveBeenCalled();
    expect(productTwo.save).not.toHaveBeenCalled();
    expect(order.save).not.toHaveBeenCalled();
    expect(mocks.logSale).not.toHaveBeenCalled();
    expect(mocks.clearProductListCache).not.toHaveBeenCalled();
  });

  it('rolls inventory back if saving the paid order fails', async () => {
    const { service, mocks } = loadService();
    const product = createProductDoc({ stock: 6, price: 1400 });
    const order = createOrderDoc({
      items: [
        {
          productId: product._id,
          variantId: 'variant-1',
          quantity: 2,
          name: product.name,
        },
      ],
      saveImpl: jest.fn().mockRejectedValue(new Error('order save failed')),
      total: 2800,
    });

    mocks.orderFindOne.mockResolvedValue(order);
    mocks.productFindOne.mockResolvedValue(product);

    await expect(service.confirmPayment(order.orderId, {
      razorpay_payment_id: 'pay_mock_rollback',
    })).rejects.toThrow('order save failed');

    expect(product.variants[0].stock).toBe(6);
    expect(product.save).toHaveBeenCalledTimes(2);
    expect(order.stockReduced).toBe(false);
    expect(mocks.logSale).not.toHaveBeenCalled();
    expect(mocks.clearProductListCache).toHaveBeenCalledTimes(2);
  });
});

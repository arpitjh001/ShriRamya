const Joi = require('joi');

const createResponse = () => {
  const res = {
    headers: {},
    statusCode: null,
    body: null,
    setHeader: jest.fn((key, value) => {
      res.headers[key] = value;
    }),
    status: jest.fn((statusCode) => {
      res.statusCode = statusCode;
      return res;
    }),
    json: jest.fn((body) => {
      res.body = body;
      return res;
    }),
    send: jest.fn((body) => {
      res.body = body;
      return res;
    }),
  };

  return res;
};

const loadController = () => {
  jest.resetModules();

  const storefrontCheckoutService = {
    generateSessionId: jest.fn(() => 'guest_generated'),
    getCart: jest.fn(),
    addToCart: jest.fn(),
    updateCartItem: jest.fn(),
    removeCartItem: jest.fn(),
    clearCart: jest.fn(),
  };

  jest.doMock('../../src/services/storefront-checkout.service', () => storefrontCheckoutService);
  jest.doMock('../../src/services/cart.service', () => ({
    getCart: jest.fn(),
    getOrCreateCart: jest.fn(),
  }));
  jest.doMock('../../src/services/coupon.service', () => ({}));

  return {
    controller: require('../../src/controllers/cart.controller'),
    storefrontCheckoutService,
  };
};

describe('cart validation', () => {
  it('accepts frontend add-to-cart payloads with Mongo identifiers', () => {
    const cartValidation = require('../../src/validations/cart.validation');
    const { error } = Joi.object(cartValidation.addToCart).validate({
      body: {
        productId: '507f1f77bcf86cd799439011',
        variantId: '507f1f77bcf86cd799439012',
        quantity: 2,
        color: 'Indigo',
        size: 'Free Size',
      },
    });

    expect(error).toBeUndefined();
  });

  it('allows product-only cart adds for products without variants', () => {
    const cartValidation = require('../../src/validations/cart.validation');
    const { error } = Joi.object(cartValidation.addToCart).validate({
      body: {
        productId: '507f1f77bcf86cd799439011',
        quantity: 1,
      },
    });

    expect(error).toBeUndefined();
  });
});

describe('cart controller', () => {
  afterEach(() => {
    jest.dontMock('../../src/services/storefront-checkout.service');
    jest.dontMock('../../src/services/cart.service');
    jest.dontMock('../../src/services/coupon.service');
  });

  it('adds items through the storefront cart service using the frontend payload shape', async () => {
    const { controller, storefrontCheckoutService } = loadController();
    const res = createResponse();
    const next = jest.fn();
    const cart = {
      id: 'cart-1',
      sessionId: 'guest_1',
      items: [{ cartItemId: 'item-1', quantity: 2 }],
    };

    storefrontCheckoutService.addToCart.mockResolvedValue(cart);

    await controller.addToCart({
      headers: { 'x-session-id': 'guest_1' },
      body: {
        productId: '507f1f77bcf86cd799439011',
        variantId: '507f1f77bcf86cd799439012',
        quantity: 2,
        color: 'Indigo',
        size: 'Free Size',
      },
      query: {},
      params: {},
    }, res, next);

    expect(storefrontCheckoutService.addToCart).toHaveBeenCalledWith({
      sessionId: 'guest_1',
      productId: '507f1f77bcf86cd799439011',
      variantId: '507f1f77bcf86cd799439012',
      quantity: 2,
      color: 'Indigo',
      size: 'Free Size',
    });
    expect(res.setHeader).toHaveBeenCalledWith('x-session-id', 'guest_1');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body).toMatchObject({
      success: true,
      data: cart,
      message: 'Item added to cart successfully',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns cart service stock errors with conflict details', async () => {
    const { controller, storefrontCheckoutService } = loadController();
    const res = createResponse();
    const next = jest.fn();
    const error = new Error('Only 1 items available');
    error.statusCode = 409;
    error.code = 'INSUFFICIENT_STOCK';
    error.availableStock = 1;

    storefrontCheckoutService.addToCart.mockRejectedValue(error);

    await controller.addToCart({
      headers: { 'x-session-id': 'guest_1' },
      body: {
        productId: '507f1f77bcf86cd799439011',
        quantity: 2,
      },
      query: {},
      params: {},
    }, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.body).toEqual({
      success: false,
      message: 'Only 1 items available',
      code: 'INSUFFICIENT_STOCK',
      availableStock: 1,
    });
    expect(next).not.toHaveBeenCalled();
  });
});

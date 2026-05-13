describe('orderController.cancelOrder', () => {
  const customerId = '507f1f77bcf86cd799439011';
  const orderMongoId = '507f1f77bcf86cd799439012';
  let warnSpy;

  const loadController = ({ order = null } = {}) => {
    jest.resetModules();

    const findById = jest.fn().mockResolvedValue(order);
    const findOne = jest.fn().mockResolvedValue(order);
    const cancelOrder = jest.fn().mockResolvedValue(order);

    jest.doMock('../../src/models', () => ({
      Order: {
        findById,
        findOne,
      },
      User: {},
      Product: {},
      OrderEvent: {},
    }));

    jest.doMock('../../src/services/events/orderEvent.service', () => ({
      logEvent: jest.fn().mockResolvedValue(null),
    }));
    jest.doMock('../../src/services/coupon.service', () => ({}));
    jest.doMock('../../src/services/analytics/analytics.service', () => ({}));
    jest.doMock('../../src/services/product.service', () => ({}));
    jest.doMock('../../src/services/orderStateMachine.service', () => ({
      cancelOrder,
      ORDER_STATUS: {
        PAID: 'paid',
      },
    }));

    return {
      controller: require('../../src/controllers/order.controller'),
      mocks: {
        findById,
        findOne,
        cancelOrder,
      },
    };
  };

  const createResponse = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  });

  const createOrder = (overrides = {}) => ({
    _id: orderMongoId,
    orderId: 'ORD-2026-001',
    userId: customerId,
    status: 'pending',
    ...overrides,
  });

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('cancels by public order number for the owning customer', async () => {
    const order = createOrder();
    const { controller, mocks } = loadController({ order });
    const req = {
      params: { id: order.orderId },
      user: { id: customerId },
      body: { reason: 'Changed my mind' },
    };
    const res = createResponse();
    const next = jest.fn();

    await controller.cancelOrder(req, res, next);

    expect(mocks.findById).not.toHaveBeenCalled();
    expect(mocks.findOne).toHaveBeenCalledWith({ orderId: order.orderId });
    expect(mocks.cancelOrder).toHaveBeenCalledWith(orderMongoId, {
      userId: customerId,
      userType: 'customer',
      reason: 'Changed my mind',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0]).toMatchObject({
      success: true,
      message: 'Order cancelled',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts Mongo order ids and payment_failed orders without requiring a body', async () => {
    const order = createOrder({ status: 'payment_failed' });
    const { controller, mocks } = loadController({ order });
    const req = {
      params: { id: orderMongoId },
      user: { id: customerId },
    };
    const res = createResponse();
    const next = jest.fn();

    await controller.cancelOrder(req, res, next);

    expect(mocks.findById).toHaveBeenCalledWith(orderMongoId);
    expect(mocks.cancelOrder).toHaveBeenCalledWith(orderMongoId, {
      userId: customerId,
      userType: 'customer',
      reason: 'Cancelled by customer',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects shipped orders with a client error instead of a server error', async () => {
    const order = createOrder({ status: 'shipped' });
    const { controller, mocks } = loadController({ order });
    const req = {
      params: { id: orderMongoId },
      user: { id: customerId },
      body: {},
    };
    const res = createResponse();
    const next = jest.fn();

    await controller.cancelOrder(req, res, next);

    expect(mocks.cancelOrder).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toMatchObject({
      statusCode: 400,
      message: "Order in status 'shipped' cannot be cancelled",
    });
    expect(res.status).not.toHaveBeenCalled();
  });
});

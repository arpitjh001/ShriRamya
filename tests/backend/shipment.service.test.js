describe('ShipmentService', () => {
  const loadService = () => {
    jest.resetModules();

    const orderFindById = jest.fn();
    const orderFindOne = jest.fn();
    const create = jest.fn();
    const getById = jest.fn();
    const getByOrderId = jest.fn();
    const update = jest.fn();
    const deleteShipment = jest.fn();
    const logEvent = jest.fn().mockResolvedValue(null);
    const createShipment = jest.fn();
    const trackShipment = jest.fn();
    const cancelShipment = jest.fn();
    const listCouriers = jest.fn();
    const checkServiceability = jest.fn();
    const buildTrackingUrl = jest.fn((awb) => `https://shipment.xpressbees.com/shipping/tracking/${awb}`);

    jest.doMock('../src/config/config', () => ({
      xpressbees: {
        enabled: true,
        requestAutoPickup: 'yes',
        defaultPackage: { weight: 500, length: 10, breadth: 10, height: 10 },
        pickup: {
          warehouse_name: 'Main WH',
          name: 'Shri Ramya',
          address: '12 MG Road',
          city: 'Jaipur',
          state: 'Rajasthan',
          pincode: '302001',
          phone: '9999999999',
        },
        rto: {},
      },
    }));

    jest.doMock('../src/models', () => ({
      Order: {
        findById: orderFindById,
        findOne: orderFindOne,
        find: jest.fn(),
      },
    }));

    jest.doMock('../src/repositories/shipment.repository', () => ({
      create,
      getById,
      getByOrderId,
      update,
      delete: deleteShipment,
      list: jest.fn(),
    }));

    jest.doMock('../src/services/events/orderEvent.service', () => ({
      logEvent,
    }));

    jest.doMock('../src/services/shipping/xpressbees.service', () => ({
      createShipment,
      trackShipment,
      cancelShipment,
      listCouriers,
      checkServiceability,
      buildTrackingUrl,
    }));

    const service = require('../src/services/shipment.service');

    return {
      service,
      mocks: {
        orderFindById,
        orderFindOne,
        create,
        getById,
        getByOrderId,
        update,
        deleteShipment,
        logEvent,
        createShipment,
        trackShipment,
        cancelShipment,
        listCouriers,
        checkServiceability,
        buildTrackingUrl,
      },
    };
  };

  const createOrder = (overrides = {}) => ({
    _id: '507f1f77bcf86cd799439011',
    orderId: 'ORD-2026-1001',
    userName: 'Asha',
    userEmail: 'asha@example.com',
    status: 'confirmed',
    paymentMethod: 'prepaid',
    shipping: 99,
    discount: 0,
    total: 2499,
    fulfillment_status: 'unfulfilled',
    trackingNumber: '',
    trackingUrl: '',
    statusHistory: [],
    shippingAddress: {
      name: 'Asha',
      email: 'asha@example.com',
      phone: '9876543210',
      address: '45 Palace Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      country: 'India',
    },
    items: [
      {
        name: 'Banarasi Saree',
        sku: 'BAN-001',
        quantity: 1,
        salePrice: 2499,
      },
    ],
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates an Xpressbees shipment from the business orderId and persists the AWB', async () => {
    const { service, mocks } = loadService();
    const order = createOrder();

    mocks.orderFindOne.mockResolvedValue(order);
    mocks.getByOrderId.mockResolvedValue([]);
    mocks.createShipment.mockResolvedValue({
      orderId: 3351555,
      shipmentId: 1929242,
      awbNumber: '59632220664',
      courierId: '5',
      courierName: 'Xpressbees',
      status: 'booked',
      paymentType: 'prepaid',
      labelUrl: 'https://xb-files.s3.amazonaws.com/labels/label.pdf',
      trackingUrl: 'https://shipment.xpressbees.com/shipping/tracking/59632220664',
      raw: { status: 'booked' },
    });

    mocks.create.mockResolvedValue({ _id: 'shipment-1' });
    mocks.getById.mockResolvedValue({
      _id: 'shipment-1',
      orderId: order,
      provider: 'xpressbees',
      carrier: 'Xpressbees',
      trackingNumber: '59632220664',
      trackingUrl: 'https://shipment.xpressbees.com/shipping/tracking/59632220664',
      shippingMethod: 'surface',
      shippingWeight: 800,
      shippingDimensions: { length: 12, breadth: 10, height: 8 },
      status: 'booked',
      history: [],
      created_at: new Date('2026-04-17T10:00:00.000Z'),
      updated_at: new Date('2026-04-17T10:00:00.000Z'),
    });

    const result = await service.createShipment({
      orderId: 'ORD-2026-1001',
      carrier: 'xpressbees',
      shippingWeight: 800,
      shippingDimensions: { length: 12, breadth: 10, height: 8 },
      shippingMethod: 'surface',
    }, { userId: 'admin-1', userType: 'admin' });

    expect(mocks.orderFindOne).toHaveBeenCalledWith({ orderId: 'ORD-2026-1001' });
    expect(mocks.createShipment).toHaveBeenCalledWith(expect.objectContaining({
      order_number: 'ORD-2026-1001',
      payment_type: 'prepaid',
      package_weight: 800,
      pickup: expect.objectContaining({
        warehouse_name: 'Main WH',
      }),
    }));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'xpressbees',
      trackingNumber: '59632220664',
      externalShipmentId: '1929242',
      labelUrl: 'https://xb-files.s3.amazonaws.com/labels/label.pdf',
    }));
    expect(order.trackingNumber).toBe('59632220664');
    expect(order.trackingUrl).toBe('https://shipment.xpressbees.com/shipping/tracking/59632220664');
    expect(order.save).toHaveBeenCalledTimes(1);
    expect(result.shipment.provider).toBe('xpressbees');
    expect(result.shipment.trackingNumber).toBe('59632220664');
  });

  it('syncs a delivered Xpressbees shipment back into the order', async () => {
    const { service, mocks } = loadService();
    const order = createOrder({
      status: 'confirmed',
      trackingNumber: '59632220664',
      trackingUrl: 'https://shipment.xpressbees.com/shipping/tracking/59632220664',
    });

    const existingShipment = {
      _id: 'shipment-2',
      orderId: order,
      provider: 'xpressbees',
      carrier: 'Xpressbees',
      trackingNumber: '59632220664',
      trackingUrl: 'https://shipment.xpressbees.com/shipping/tracking/59632220664',
      status: 'booked',
      shippedAt: null,
      providerMetadata: {},
      history: [],
    };

    const updatedShipment = {
      ...existingShipment,
      status: 'delivered',
      actualDelivery: new Date('2026-04-18T08:00:00.000Z'),
      shippedAt: new Date('2026-04-17T15:00:00.000Z'),
      latestSyncAt: new Date('2026-04-18T08:00:00.000Z'),
      history: [
        {
          status: 'delivered',
          statusCode: 'DL',
          rawStatus: 'Shipment Delivered',
        },
      ],
    };

    mocks.getById.mockResolvedValue(existingShipment);
    mocks.trackShipment.mockResolvedValue({
      awb_number: '59632220664',
      status: 'delivered',
      history: [
        {
          status_code: 'DL',
          location: 'Bengaluru',
          event_time: '2026-04-18 08:00',
          message: 'SHIPMENT DELIVERED',
        },
      ],
    });
    mocks.update.mockResolvedValue(updatedShipment);

    const result = await service.syncShipment('shipment-2', { userId: 'admin-1', userType: 'admin' });

    expect(mocks.trackShipment).toHaveBeenCalledWith('59632220664');
    expect(mocks.update).toHaveBeenCalledWith('shipment-2', expect.objectContaining({
      status: 'delivered',
      trackingNumber: '59632220664',
    }));
    expect(order.status).toBe('delivered');
    expect(order.fulfillment_status).toBe('delivered');
    expect(order.save).toHaveBeenCalledTimes(1);
    expect(result.shipment.status).toBe('delivered');
  });
});

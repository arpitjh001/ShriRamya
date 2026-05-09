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
    const cancelOrder = jest.fn();
    const checkServiceability = jest.fn();
    const buildTrackingUrl = jest.fn((awb) => `https://shiprocket.co/tracking/${awb}`);

    jest.doMock('../../backend_node/src/config/config', () => ({
      shiprocket: {
        enabled: true,
        requestPickup: true,
        generateManifest: true,
        generateLabel: true,
        generateInvoice: true,
        pickupLocation: 'Primary',
        pickupPincode: '302001',
        companyName: 'Shri Ramya',
        resellerName: 'Shri Ramya',
        email: 'ops@example.com',
        defaultPackage: { weight: 0.5, length: 10, breadth: 10, height: 10 },
      },
    }));

    jest.doMock('../../backend_node/src/models', () => ({
      Order: {
        findById: orderFindById,
        findOne: orderFindOne,
        find: jest.fn(),
      },
    }));

    jest.doMock('../../backend_node/src/repositories/shipment.repository', () => ({
      create,
      getById,
      getByOrderId,
      update,
      delete: deleteShipment,
      list: jest.fn(),
    }));

    jest.doMock('../../backend_node/src/services/events/orderEvent.service', () => ({
      logEvent,
    }));

    jest.doMock('../../backend_node/src/services/shipping/shiprocket.service', () => ({
      assertConfigured: jest.fn(),
      createShipment,
      trackShipment,
      cancelOrder,
      checkServiceability,
      buildTrackingUrl,
    }));

    const service = require('../../backend_node/src/services/shipment.service');

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
        cancelOrder,
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
    created_at: new Date('2026-04-17T10:00:00.000Z'),
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

  it('creates a Shiprocket shipment from the business orderId and persists the AWB', async () => {
    const { service, mocks } = loadService();
    const order = createOrder();

    mocks.orderFindOne.mockResolvedValue(order);
    mocks.getByOrderId.mockResolvedValue([]);
    mocks.createShipment.mockResolvedValue({
      orderId: 3351555,
      shipmentId: 1929242,
      awbNumber: '59632220664',
      courierId: '5',
      courierName: 'Delhivery Surface',
      status: 'booked',
      paymentType: 'Prepaid',
      labelUrl: 'https://shiprocket-files.example/labels/label.pdf',
      manifestUrl: 'https://shiprocket-files.example/manifests/manifest.pdf',
      invoiceUrl: 'https://shiprocket-files.example/invoices/invoice.pdf',
      trackingUrl: 'https://shiprocket.co/tracking/59632220664',
      raw: { status: 'booked' },
    });

    mocks.create.mockResolvedValue({ _id: 'shipment-1' });
    mocks.getById.mockResolvedValue({
      _id: 'shipment-1',
      orderId: order,
      provider: 'shiprocket',
      carrier: 'Delhivery Surface',
      trackingNumber: '59632220664',
      trackingUrl: 'https://shiprocket.co/tracking/59632220664',
      shippingMethod: 'surface',
      shippingWeight: 0.8,
      shippingDimensions: { length: 12, breadth: 10, height: 8 },
      status: 'booked',
      history: [],
      created_at: new Date('2026-04-17T10:00:00.000Z'),
      updated_at: new Date('2026-04-17T10:00:00.000Z'),
    });

    const result = await service.createShipment({
      orderId: 'ORD-2026-1001',
      provider: 'shiprocket',
      shippingWeight: 0.8,
      shippingDimensions: { length: 12, breadth: 10, height: 8 },
      shippingMethod: 'surface',
      courier_id: '5',
    }, { userId: 'admin-1', userType: 'admin' });

    expect(mocks.orderFindOne).toHaveBeenCalledWith({ orderId: 'ORD-2026-1001' });
    expect(mocks.createShipment).toHaveBeenCalledWith(expect.objectContaining({
      order_id: 'ORD-2026-1001',
      pickup_location: 'Primary',
      payment_method: 'Prepaid',
      weight: 0.8,
      billing_pincode: '560001',
    }), expect.objectContaining({
      courierId: '5',
      requestPickup: true,
    }));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'shiprocket',
      trackingNumber: '59632220664',
      externalShipmentId: '1929242',
      labelUrl: 'https://shiprocket-files.example/labels/label.pdf',
      manifestUrl: 'https://shiprocket-files.example/manifests/manifest.pdf',
    }));
    expect(order.trackingNumber).toBe('59632220664');
    expect(order.trackingUrl).toBe('https://shiprocket.co/tracking/59632220664');
    expect(order.save).toHaveBeenCalledTimes(1);
    expect(result.shipment.provider).toBe('shiprocket');
    expect(result.shipment.trackingNumber).toBe('59632220664');
  });

  it('syncs a delivered Shiprocket shipment back into the order', async () => {
    const { service, mocks } = loadService();
    const order = createOrder({
      status: 'confirmed',
      trackingNumber: '59632220664',
      trackingUrl: 'https://shiprocket.co/tracking/59632220664',
    });

    const existingShipment = {
      _id: 'shipment-2',
      orderId: order,
      provider: 'shiprocket',
      carrier: 'Delhivery Surface',
      trackingNumber: '59632220664',
      trackingUrl: 'https://shiprocket.co/tracking/59632220664',
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
          statusCode: 'DELIVERED',
          rawStatus: 'Shipment Delivered',
        },
      ],
    };

    mocks.getById.mockResolvedValue(existingShipment);
    mocks.trackShipment.mockResolvedValue({
      track_url: 'https://shiprocket.co/tracking/59632220664',
      shipment_track: [
        {
          awb_code: '59632220664',
          current_status: 'Delivered',
        },
      ],
      shipment_track_activities: [
        {
          status: 'DELIVERED',
          location: 'Bengaluru',
          date: '2026-04-18 08:00',
          activity: 'Shipment Delivered',
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

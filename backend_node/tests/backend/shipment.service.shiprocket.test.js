describe('ShipmentService Shiprocket payloads', () => {
  const loadService = () => {
    jest.resetModules();

    jest.doMock('../../src/config/config', () => ({
      shiprocket: {
        pickupLocation: 'Primary',
        pickupPincode: '302001',
        companyName: 'Shri Ramya',
        resellerName: 'Shri Ramya',
        email: 'ops@example.com',
        defaultPackage: { weight: 0.5, length: 10, breadth: 10, height: 10 },
      },
    }));

    jest.doMock('../../src/models', () => ({
      Order: {
        findById: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
      },
    }));

    jest.doMock('../../src/repositories/shipment.repository', () => ({
      create: jest.fn(),
      getById: jest.fn(),
      getByOrderId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      list: jest.fn(),
    }));

    jest.doMock('../../src/services/events/orderEvent.service', () => ({
      logEvent: jest.fn(),
    }));

    jest.doMock('../../src/services/shipping/shiprocket.service', () => ({
      buildTrackingUrl: jest.fn((awb) => `https://shiprocket.co/tracking/${awb}`),
    }));

    return require('../../src/services/shipment.service');
  };

  const createOrder = (overrides = {}) => ({
    _id: '507f1f77bcf86cd799439011',
    orderId: 'ORD-2026-1001',
    userName: 'Asha Rao',
    userEmail: 'asha@example.com',
    status: 'confirmed',
    paymentMethod: 'cod',
    shipping: 99,
    discount: 0,
    total: 2499,
    created_at: new Date('2026-04-17T10:00:00.000Z'),
    items: [
      {
        name: 'Banarasi Saree',
        sku: 'BAN-001',
        quantity: 1,
        salePrice: 2499,
      },
    ],
    ...overrides,
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('books Shiprocket payloads from admin order addresses using street and zipCode fields', () => {
    const service = loadService();
    const order = createOrder({
      shippingAddress: {
        name: 'Meera Shah',
        email: 'meera@example.com',
        mobileNumber: '9876543210',
        street: '23 Silk Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
      },
    });

    const payload = service.buildShiprocketPayload(order, {
      provider: 'shiprocket',
      pickup_location: 'Primary',
      courier_id: '5',
    });

    expect(payload).toEqual(expect.objectContaining({
      billing_customer_name: 'Meera',
      billing_last_name: 'Shah',
      billing_address: '23 Silk Street',
      billing_city: 'Mumbai',
      billing_state: 'Maharashtra',
      billing_pincode: '400001',
      billing_phone: '9876543210',
      payment_method: 'COD',
    }));
  });

  it('books Shiprocket payloads from checkout-style address_line1 and pincode fields', () => {
    const service = loadService();
    const order = createOrder({
      shippingAddress: null,
      shipping_address: {
        first_name: 'Asha',
        last_name: 'Rao',
        email: 'asha@example.com',
        phone: '9876543211',
        address_line1: '45 Palace Road',
        address_line2: 'Floor 2',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      },
    });

    const payload = service.buildShiprocketPayload(order, {
      provider: 'shiprocket',
      pickup_location: 'Primary',
    });

    expect(payload).toEqual(expect.objectContaining({
      billing_customer_name: 'Asha',
      billing_last_name: 'Rao',
      billing_address: '45 Palace Road',
      billing_address_2: 'Floor 2',
      billing_city: 'Bengaluru',
      billing_state: 'Karnataka',
      billing_pincode: '560001',
      billing_phone: '9876543211',
    }));
  });
});

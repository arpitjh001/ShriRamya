describe('XpressbeesService', () => {
  const loadService = () => {
    jest.resetModules();

    const client = {
      post: jest.fn(),
      request: jest.fn(),
    };

    const create = jest.fn(() => client);

    jest.doMock('axios', () => ({
      create,
    }));

    jest.doMock('../src/config/config', () => ({
      xpressbees: {
        enabled: true,
        baseUrl: 'https://shipment.xpressbees.com/api',
        email: 'ops@example.com',
        password: 'secret',
        timeoutMs: 30000,
      },
    }));

    const service = require('../src/services/shipping/xpressbees.service');

    return {
      service,
      mocks: {
        client,
        create,
      },
    };
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('authenticates once and reuses the cached token across requests', async () => {
    const { service, mocks } = loadService();

    mocks.client.post.mockResolvedValue({
      data: {
        data: {
          token: 'token-123',
        },
      },
    });

    mocks.client.request
      .mockResolvedValueOnce({
        data: {
          data: {
            awb_number: '59632220664',
            courier_name: 'Xpressbees',
            status: 'booked',
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [{ id: '14', name: 'Xpressbees Surface' }],
        },
      });

    const booking = await service.createShipment({ order_number: 'ORD-1' });
    const couriers = await service.listCouriers();

    expect(mocks.client.post).toHaveBeenCalledTimes(1);
    expect(mocks.client.request).toHaveBeenNthCalledWith(1, expect.objectContaining({
      url: '/shipments2',
      headers: expect.objectContaining({
        Authorization: 'Bearer token-123',
      }),
    }));
    expect(mocks.client.request).toHaveBeenNthCalledWith(2, expect.objectContaining({
      url: '/courier',
      headers: expect.objectContaining({
        Authorization: 'Bearer token-123',
      }),
    }));
    expect(booking.awbNumber).toBe('59632220664');
    expect(couriers).toEqual([{ id: '14', name: 'Xpressbees Surface' }]);
  });
});

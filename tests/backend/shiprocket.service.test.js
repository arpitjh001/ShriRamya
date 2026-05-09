describe('ShiprocketService', () => {
  const loadService = () => {
    jest.resetModules();

    const client = {
      post: jest.fn(),
      request: jest.fn(),
    };

    const create = jest.fn(() => client);

    jest.doMock(require.resolve('../../backend_node/node_modules/axios'), () => ({
      create,
    }));

    jest.doMock(require.resolve('../../backend_node/src/config/config'), () => ({
      shiprocket: {
        enabled: true,
        baseUrl: 'https://apiv2.shiprocket.in/v1/external',
        email: 'ops@example.com',
        password: 'secret',
        timeoutMs: 30000,
      },
    }));

    const service = require('../../backend_node/src/services/shipping/shiprocket.service');

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

  it('authenticates once and reuses the cached token across Shiprocket requests', async () => {
    const { service, mocks } = loadService();

    mocks.client.post.mockResolvedValue({
      data: {
        token: 'token-123',
      },
    });

    mocks.client.request
      .mockResolvedValueOnce({
        data: {
          order_id: 3351555,
          shipment_id: 1929242,
          status: 'NEW',
        },
      })
      .mockResolvedValueOnce({
        data: {
          awb_assign_status: 1,
          response: {
            data: {
              awb_code: '59632220664',
              courier_company_id: 5,
              courier_name: 'Delhivery Surface',
            },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            available_courier_companies: [{ courier_company_id: 5, courier_name: 'Delhivery Surface' }],
          },
        },
      });

    const booking = await service.createShipment(
      { order_id: 'ORD-1' },
      {
        courierId: '5',
        requestPickup: false,
        generateManifest: false,
        generateLabel: false,
        generateInvoice: false,
      }
    );
    const serviceability = await service.checkServiceability({
      pickup_postcode: '302001',
      delivery_postcode: '560001',
      weight: 0.5,
      cod: 0,
    });

    expect(mocks.client.post).toHaveBeenCalledTimes(1);
    expect(mocks.client.request).toHaveBeenNthCalledWith(1, expect.objectContaining({
      url: '/orders/create/adhoc',
      headers: expect.objectContaining({
        Authorization: 'Bearer token-123',
      }),
    }));
    expect(mocks.client.request).toHaveBeenNthCalledWith(2, expect.objectContaining({
      url: '/courier/assign/awb',
      data: expect.objectContaining({
        shipment_id: 1929242,
        courier_id: '5',
      }),
      headers: expect.objectContaining({
        Authorization: 'Bearer token-123',
      }),
    }));
    expect(mocks.client.request).toHaveBeenNthCalledWith(3, expect.objectContaining({
      url: '/courier/serviceability/',
      params: expect.objectContaining({
        pickup_postcode: '302001',
      }),
      headers: expect.objectContaining({
        Authorization: 'Bearer token-123',
      }),
    }));
    expect(booking.awbNumber).toBe('59632220664');
    expect(booking.courierName).toBe('Delhivery Surface');
    expect(serviceability.data.available_courier_companies).toEqual([
      { courier_company_id: 5, courier_name: 'Delhivery Surface' },
    ]);
  });
});

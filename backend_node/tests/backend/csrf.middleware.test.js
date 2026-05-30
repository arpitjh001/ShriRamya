const { csrfProtection } = require('../../src/middlewares/csrf.middleware');

const createResponse = () => ({
  cookie: jest.fn(),
});

const createRequest = ({
  method = 'POST',
  originalUrl = '/api/v1/products',
  headers = {},
  cookies = {},
} = {}) => ({
  method,
  originalUrl,
  path: originalUrl,
  headers,
  cookies,
});

describe('csrf middleware', () => {
  it('allows Bearer-authorized writes even when unrelated cookies are present', () => {
    const req = createRequest({
      headers: {
        authorization: 'Bearer access-token',
        cookie: 'refresh_token=refresh-token',
      },
      cookies: {
        refresh_token: 'refresh-token',
      },
    });
    const res = createResponse();
    const next = jest.fn();

    csrfProtection(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('allows cart writes that use the explicit session header', () => {
    const req = createRequest({
      originalUrl: '/api/v1/cart/add',
      headers: {
        'x-session-id': 'session_123',
      },
    });
    const res = createResponse();
    const next = jest.fn();

    csrfProtection(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('allows auth refresh when the refresh token is sent explicitly in the body', () => {
    const req = createRequest({
      originalUrl: '/api/v1/auth/refresh',
      headers: {
        cookie: 'refresh_token=refresh-token',
        'x-csrf-token': 'cached-token',
      },
      cookies: {
        refresh_token: 'refresh-token',
      },
    });
    req.body = { refresh_token: 'refresh-token' };
    const res = createResponse();
    const next = jest.fn();

    csrfProtection(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('still rejects cookie-authenticated writes without the csrf cookie', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const req = createRequest({
        headers: {
          cookie: 'refresh_token=refresh-token',
          'x-csrf-token': 'cached-token',
        },
        cookies: {
          refresh_token: 'refresh-token',
        },
      });
      const res = createResponse();
      const next = jest.fn();

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toMatchObject({
        statusCode: 403,
        message: 'CSRF token missing in cookie',
      });
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('allows cookie-authenticated writes with matching csrf tokens', () => {
    const req = createRequest({
      headers: {
        cookie: 'csrf-token=token',
        'x-csrf-token': 'token',
      },
      cookies: {
        'csrf-token': 'token',
      },
    });
    const res = createResponse();
    const next = jest.fn();

    csrfProtection(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});

jest.mock('../../src/models', () => ({
  PromoBar: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock('../../src/config/config', () => ({
  cache: {
    couponTtlSeconds: 60,
  },
  env: 'test',
}));

jest.mock('../../src/services/cache.service', () => ({
  get: jest.fn(),
  set: jest.fn(),
  delPattern: jest.fn(),
}));

jest.mock('../../src/services/cacheInvalidation.service', () => ({
  invalidatePromoBars: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const { PromoBar } = require('../../src/models');
const cacheService = require('../../src/services/cache.service');
const cacheInvalidationService = require('../../src/services/cacheInvalidation.service');
const promoBarService = require('../../src/services/promoBar.service');

const promoBarDoc = (overrides = {}) => ({
  _id: overrides._id || '665000000000000000000501',
  title: overrides.title || 'Festive edit',
  promoText: overrides.promoText || 'Use code FESTIVE10',
  couponCode: overrides.couponCode === undefined ? 'FESTIVE10' : overrides.couponCode,
  isActive: overrides.isActive === undefined ? true : overrides.isActive,
  displayLocation: overrides.displayLocation || 'home',
  startDate: overrides.startDate || null,
  endDate: overrides.endDate || null,
  priority: overrides.priority === undefined ? 10 : overrides.priority,
  backgroundColor: overrides.backgroundColor || '',
  textColor: overrides.textColor || '',
  createdAt: overrides.createdAt || new Date('2026-05-01T00:00:00.000Z'),
  updatedAt: overrides.updatedAt || new Date('2026-05-01T00:00:00.000Z'),
});

const mockLeanSortQuery = (result) => ({
  sort: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(result),
  }),
});

describe('PromoBarService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cacheService.set.mockResolvedValue(true);
  });

  it('creates a promo bar and invalidates promo bar cache', async () => {
    const created = promoBarDoc({ couponCode: 'festive10' });
    PromoBar.create.mockResolvedValue(created);

    const result = await promoBarService.createPromoBar({
      title: 'Festive edit',
      promoText: 'Use code FESTIVE10',
      couponCode: 'festive10',
      displayLocation: 'home',
      priority: 4,
    });

    expect(PromoBar.create).toHaveBeenCalledWith(expect.objectContaining({
      promoText: 'Use code FESTIVE10',
      couponCode: 'FESTIVE10',
      displayLocation: 'home',
      priority: 4,
    }));
    expect(cacheInvalidationService.invalidatePromoBars).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      id: '665000000000000000000501',
      promoText: 'Use code FESTIVE10',
      couponCode: 'FESTIVE10',
    });
  });

  it('allows informational promo bars without a coupon code', async () => {
    PromoBar.create.mockResolvedValue(promoBarDoc({ couponCode: null, promoText: 'New arrivals now live' }));

    const result = await promoBarService.createPromoBar({
      promoText: 'New arrivals now live',
      displayLocation: 'all',
      priority: 1,
    });

    expect(PromoBar.create).toHaveBeenCalledWith(expect.not.objectContaining({ couponCode: expect.anything() }));
    expect(result.couponCode).toBeNull();
  });

  it('updates a promo bar and validates partial input', async () => {
    PromoBar.findByIdAndUpdate.mockResolvedValue(promoBarDoc({ promoText: 'Free shipping above Rs 999' }));

    const result = await promoBarService.updatePromoBar('665000000000000000000501', {
      promoText: 'Free shipping above Rs 999',
      priority: 8,
    });

    expect(PromoBar.findByIdAndUpdate).toHaveBeenCalledWith(
      '665000000000000000000501',
      { $set: expect.objectContaining({ promoText: 'Free shipping above Rs 999', priority: 8 }) },
      { new: true, runValidators: true }
    );
    expect(cacheInvalidationService.invalidatePromoBars).toHaveBeenCalledTimes(1);
    expect(result.promoText).toBe('Free shipping above Rs 999');
  });

  it('disables a promo bar through toggle and invalidates cache', async () => {
    const existing = {
      ...promoBarDoc({ isActive: true }),
      save: jest.fn().mockResolvedValue(true),
    };
    PromoBar.findById.mockResolvedValue(existing);

    const result = await promoBarService.togglePromoBar('665000000000000000000501', false);

    expect(existing.isActive).toBe(false);
    expect(existing.save).toHaveBeenCalledTimes(1);
    expect(cacheInvalidationService.invalidatePromoBars).toHaveBeenCalledTimes(1);
    expect(result.isActive).toBe(false);
  });

  it('deletes a promo bar and invalidates cache', async () => {
    PromoBar.findByIdAndDelete.mockResolvedValue(promoBarDoc());

    const result = await promoBarService.deletePromoBar('665000000000000000000501');

    expect(PromoBar.findByIdAndDelete).toHaveBeenCalledWith('665000000000000000000501');
    expect(cacheInvalidationService.invalidatePromoBars).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: '665000000000000000000501', deleted: true });
  });

  it('fetches the active promo bar for a requested storefront location', async () => {
    cacheService.get.mockResolvedValue(null);
    const query = mockLeanSortQuery(promoBarDoc({ displayLocation: 'category', priority: 20 }));
    PromoBar.findOne.mockReturnValue(query);

    const result = await promoBarService.getActivePromoBarForLocation('category');

    expect(cacheService.get).toHaveBeenCalledWith('promo_bar:category');
    expect(PromoBar.findOne).toHaveBeenCalledWith(expect.objectContaining({
      isActive: true,
      displayLocation: { $in: ['all', 'category'] },
    }));
    expect(query.sort).toHaveBeenCalledWith({ priority: -1, updatedAt: -1 });
    expect(cacheService.set).toHaveBeenCalledWith('promo_bar:category', expect.objectContaining({
      displayLocation: 'category',
      priority: 20,
    }), 60);
    expect(result.promoText).toBe('Use code FESTIVE10');
  });

  it('returns cached storefront promo bar without querying the database', async () => {
    cacheService.get.mockResolvedValue({ id: 'cached', promoText: 'Cached text' });

    const result = await promoBarService.getActivePromoBarForLocation('home');

    expect(PromoBar.findOne).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 'cached', promoText: 'Cached text' });
  });

  it('falls back to database when Redis returns no cached value', async () => {
    cacheService.get.mockResolvedValue(null);
    PromoBar.findOne.mockReturnValue(mockLeanSortQuery(null));

    const result = await promoBarService.getActivePromoBarForLocation('cart');

    expect(PromoBar.findOne).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });

  it('rejects empty promo text, invalid dates, invalid location, and invalid priority', async () => {
    await expect(promoBarService.createPromoBar({ promoText: '   ' }))
      .rejects.toThrow('Promo text is required');

    await expect(promoBarService.createPromoBar({
      promoText: 'Offer',
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2026-05-01T00:00:00.000Z',
    })).rejects.toThrow('Start date must be before end date');

    await expect(promoBarService.createPromoBar({
      promoText: 'Offer',
      displayLocation: 'wishlist',
    })).rejects.toThrow('Invalid promo bar display location');

    await expect(promoBarService.createPromoBar({
      promoText: 'Offer',
      priority: -1,
    })).rejects.toThrow('Priority must be a number greater than or equal to 0');
  });
});

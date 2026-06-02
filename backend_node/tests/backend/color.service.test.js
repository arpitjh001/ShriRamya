const axios = require('axios');
const ColorReference = require('../../src/models/colorReference.model');
const colorResolverService = require('../../src/services/colorResolver.service');

// Mock external dependencies
jest.mock('axios');
jest.mock('../../src/models/colorReference.model');
jest.mock('../../src/services/cache.service', () => ({
  isHealthy: () => false, // Disable Redis cache during unit testing
  get: jest.fn(),
  set: jest.fn()
}));

describe('ColorResolverService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves exact colors from the local curated fashion map', async () => {
    const result = await colorResolverService.resolveColorName('Mustard Yellow');
    expect(result.success).toBe(true);
    expect(result.hexCode).toBe('#FFDB58');
    expect(result.source).toBe('local_map');
    expect(result.confidence).toBe('high');
  });

  it('resolves fuzzy matches from the local curated fashion map', async () => {
    const result = await colorResolverService.resolveColorName('MustardYellow');
    expect(result.success).toBe(true);
    // Normalized and fuzzy-matched to 'mustard yellow'
    expect(result.hexCode).toBe('#FFDB58');
    expect(result.source).toBe('local_map');
    expect(result.confidence).toBe('high');
  });

  it('resolves color from the database cache if found', async () => {
    // Mock database hit
    ColorReference.findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        name: 'Saffron',
        normalizedName: 'saffron',
        hexCode: '#F4C430',
        source: 'database_cache',
        confidence: 'high',
        isManualOverride: false
      })
    });

    const result = await colorResolverService.resolveColorName('Saffron');
    expect(result.success).toBe(true);
    expect(result.hexCode).toBe('#F4C430');
    expect(result.source).toBe('database_cache');
    expect(result.confidence).toBe('high');
  });

  it('resolves color via public Color Pizza API if not in local map or DB', async () => {
    // DB miss
    ColorReference.findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null)
    });
    // DB upsert stub
    ColorReference.findOneAndUpdate = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ name: 'Emerald', hexCode: '#50C878' })
    });

    // Mock Axios response for Color Pizza API
    axios.get.mockImplementation((url) => {
      if (url.includes('api.color.pizza')) {
        return Promise.resolve({
          data: {
            colors: [{ name: 'Emerald', hex: '#50C878' }]
          }
        });
      }
      return Promise.reject(new Error('URL not found'));
    });

    const result = await colorResolverService.resolveColorName('Emerald');
    expect(result.success).toBe(true);
    expect(result.hexCode).toBe('#50C878');
    expect(result.source).toBe('color_pizza');
    expect(result.confidence).toBe('medium');
    expect(ColorReference.findOneAndUpdate).toHaveBeenCalled();
  });

  it('resolves color via external Yahoo Search web scraping if other options fail', async () => {
    // DB miss
    ColorReference.findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null)
    });
    // DB upsert stub
    ColorReference.findOneAndUpdate = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ name: 'Kesar Yellow', hexCode: '#FFD600' })
    });

    // Mock Axios response for Yahoo Search with encoded ColorHexa or Encycolorpedia link
    axios.get.mockImplementation((url) => {
      if (url.includes('search.yahoo.com')) {
        return Promise.resolve({
          data: '<html><body><a href="https://r.search.yahoo.com/_ylt=A0/RU=https%3a%2f%2fencycolorpedia.com%2fffd600/RK=2/RS=xyz">Encycolorpedia Kesar Yellow</a></body></html>'
        });
      }
      return Promise.reject(new Error('URL not found'));
    });

    const result = await colorResolverService.resolveColorName('Kesar Yellow');
    expect(result.success).toBe(true);
    expect(result.hexCode).toBe('#ffd600');
    expect(result.source).toBe('web_lookup');
    expect(result.confidence).toBe('medium');
  });

  it('falls back to a neutral hex code with low confidence warning if everything fails', async () => {
    // DB miss
    ColorReference.findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null)
    });

    // Mock Axios failures for both APIs
    axios.get.mockRejectedValue(new Error('Network failure'));

    const result = await colorResolverService.resolveColorName('UnresolvableCustomColor');
    expect(result.success).toBe(true);
    expect(result.hexCode).toBe('#CCCCCC');
    expect(result.source).toBe('fallback');
    expect(result.confidence).toBe('low');
  });
});

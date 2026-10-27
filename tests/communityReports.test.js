const request = require('supertest');
const app = require('../src/app');
const { setupTestDB, createTestUsers } = require('./setup');
const Disaster = require('../src/models/Disaster');
const { cache } = require('../src/services/cacheService');
const { setSimulateFailure } = require('../src/services/communityReportProvider');

setupTestDB();

describe('Community Reports Provider, Caching, and Resilient Degradation', () => {
  let users;
  let disaster;

  beforeEach(async () => {
    cache.clear();
    setSimulateFailure(false);
    users = await createTestUsers();

    disaster = await Disaster.create({
      title: 'Riverfront Flooding Disaster',
      description: 'Severe inundation reported along the waterfront.',
      location: { name: 'Downtown Sector 4', resolved: true, coordinates: { type: 'Point', coordinates: [-73.98, 40.74] } },
      tags: ['flood', 'medical'],
      creator: users.contributor1._id,
    });
  });

  afterEach(() => {
    setSimulateFailure(false);
    cache.clear();
  });

  it('should fetch live reports on first request and cache subsequent requests within TTL', async () => {
    // First request: Should be live
    const res1 = await request(app).get(`/disasters/${disaster._id}/community-reports`);

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.source).toBe('live');
    expect(Array.isArray(res1.body.data)).toBe(true);
    expect(res1.body.count).toBeGreaterThan(0);

    // Second request: Should be served from in-memory cache
    const res2 = await request(app).get(`/disasters/${disaster._id}/community-reports`);

    expect(res2.status).toBe(200);
    expect(res2.body.source).toBe('cache');
    expect(res2.body.count).toBe(res1.body.count);
    expect(res2.body.data).toEqual(res1.body.data);
  });

  it('should handle external provider failures safely with graceful degradation', async () => {
    // Turn on failure simulation
    setSimulateFailure(true);

    const res = await request(app).get(`/disasters/${disaster._id}/community-reports`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.source).toBe('fallback');
    expect(res.body.warning).toContain('External community report provider failed');
    expect(res.body.data).toEqual([]);
    expect(res.body.count).toBe(0);
  });

  it('should allow filtering community reports by tag directly', async () => {
    const res = await request(app).get('/community-reports?tag=fire');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.every((r) => r.tags.includes('fire'))).toBe(true);
  });
});

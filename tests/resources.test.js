const request = require('supertest');
const app = require('../src/app');
const { setupTestDB, createTestUsers } = require('./setup');
const Disaster = require('../src/models/Disaster');
const Resource = require('../src/models/Resource');

setupTestDB();

describe('Geospatial Resources & Proximity Search', () => {
  let users;
  let resolvedDisaster;
  let unresolvedDisaster;

  beforeEach(async () => {
    users = await createTestUsers();
    await Resource.init(); // Ensure 2dsphere index is ready

    // Create a resolved disaster at Downtown Sector 4 [-73.985131, 40.748817]
    resolvedDisaster = await Disaster.create({
      title: 'Downtown Water Main Break',
      description: 'Major flooding on 5th avenue',
      location: {
        name: 'Downtown Sector 4',
        resolved: true,
        coordinates: {
          type: 'Point',
          coordinates: [-73.985131, 40.748817], // [lng, lat]
        },
      },
      tags: ['flood'],
      creator: users.contributor1._id,
    });

    // Create an unresolved disaster without coordinates
    unresolvedDisaster = await Disaster.create({
      title: 'Unmapped Outpost Incident',
      description: 'Coordinates pending survey',
      location: {
        name: 'Sector Unknown',
        resolved: false,
        coordinates: null,
      },
      tags: ['survey'],
      creator: users.contributor1._id,
    });

    // Seed resources:
    // Resource 1: ~0.5 km away from disaster
    await Resource.create({
      name: 'Downtown Emergency Clinic',
      type: 'hospital',
      capacity: 50,
      location: {
        type: 'Point',
        coordinates: [-73.9845, 40.7492],
      },
    });

    // Resource 2: ~1.2 km away from disaster
    await Resource.create({
      name: 'Community Center Shelter',
      type: 'shelter',
      capacity: 300,
      location: {
        type: 'Point',
        coordinates: [-73.9870, 40.7400],
      },
    });

    // Resource 3: ~50 km away (out of range for radius=2 or radius=5)
    await Resource.create({
      name: 'Far Rural Clinic',
      type: 'hospital',
      capacity: 20,
      location: {
        type: 'Point',
        coordinates: [-73.5000, 41.2000],
      },
    });
  });

  describe('GET /disasters/:id/resources (Geospatial Proximity)', () => {
    it('should retrieve resources within 2 km radius and exclude out-of-range resources', async () => {
      const res = await request(app).get(`/disasters/${resolvedDisaster._id}/resources?radius=2`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.radiusKm).toBe(2);
      expect(res.body.count).toBe(2);

      const names = res.body.data.map((r) => r.name);
      expect(names).toContain('Downtown Emergency Clinic');
      expect(names).toContain('Community Center Shelter');
      expect(names).not.toContain('Far Rural Clinic');

      // Verify annotated distanceKm is present and accurate
      expect(res.body.data[0].distanceKm).toBeDefined();
      expect(res.body.data[0].distanceKm).toBeLessThanOrEqual(2);
    });

    it('should validate radius parameter and return 400 for negative or non-numeric radius', async () => {
      const resInvalid = await request(app).get(`/disasters/${resolvedDisaster._id}/resources?radius=-5`);
      expect(resInvalid.status).toBe(400);
      expect(resInvalid.body.success).toBe(false);

      const resString = await request(app).get(`/disasters/${resolvedDisaster._id}/resources?radius=invalid`);
      expect(resString.status).toBe(400);
      expect(resString.body.success).toBe(false);
    });

    it('should return 400 if disaster location is unresolved', async () => {
      const res = await request(app).get(`/disasters/${unresolvedDisaster._id}/resources?radius=5`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('unresolved');
    });
  });

  describe('POST /resources (Validation of Coordinates and Types)', () => {
    it('should reject invalid coordinates (latitude out of range)', async () => {
      const res = await request(app)
        .post('/resources')
        .set('Authorization', `Bearer ${users.contrib1Token}`)
        .send({
          name: 'Invalid Coord Station',
          type: 'rescue',
          location: {
            coordinates: [-73.98, 120], // latitude 120 is invalid (> 90)
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject unknown resource types', async () => {
      const res = await request(app)
        .post('/resources')
        .set('Authorization', `Bearer ${users.contrib1Token}`)
        .send({
          name: 'Invalid Type Station',
          type: 'amusement_park',
          location: {
            coordinates: [-73.98, 40.74],
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});

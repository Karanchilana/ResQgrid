const request = require('supertest');
const app = require('../src/app');
const { setupTestDB, createTestUsers } = require('./setup');
const Disaster = require('../src/models/Disaster');

setupTestDB();

describe('Disaster CRUD & Location Resolution', () => {
  let users;

  beforeEach(async () => {
    users = await createTestUsers();
  });

  describe('POST /disasters (Creation & Location Resolution)', () => {
    it('should create disaster and auto-resolve known location coordinates', async () => {
      const res = await request(app)
        .post('/disasters')
        .set('Authorization', `Bearer ${users.contrib1Token}`)
        .send({
          title: 'Downtown Flooding Crisis',
          description: 'Flash flood blocking main arterial road.',
          location: 'Downtown Sector 4',
          tags: ['flood', 'evacuation'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Downtown Flooding Crisis');
      expect(res.body.data.location.resolved).toBe(true);
      expect(res.body.data.location.coordinates.type).toBe('Point');
      expect(res.body.data.location.coordinates.coordinates).toEqual([-73.985131, 40.748817]);
      // Verify creator was derived from authenticated user token, not client
      expect(res.body.data.creator._id.toString()).toBe(users.contributor1._id.toString());
    });

    it('should clearly mark unknown locations as unresolved with null coordinates', async () => {
      const res = await request(app)
        .post('/disasters')
        .set('Authorization', `Bearer ${users.contrib1Token}`)
        .send({
          title: 'Remote Incident',
          description: 'Unconfirmed smoke column in unmapped canyon.',
          location: 'Deep Canyon Sector Z-99',
          tags: ['smoke'],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.location.resolved).toBe(false);
      expect(res.body.data.location.coordinates).toBeNull();
    });

    it('should reject creation without authentication (401)', async () => {
      const res = await request(app).post('/disasters').send({
        title: 'Unauthenticated report',
        description: 'Should fail',
        location: 'Downtown Sector 4',
      });

      expect(res.status).toBe(401);
    });

    it('should reject invalid input with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/disasters')
        .set('Authorization', `Bearer ${users.contrib1Token}`)
        .send({
          description: 'Missing title and location',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /disasters (Public Listing & Filtering)', () => {
    beforeEach(async () => {
      await Disaster.create([
        {
          title: 'Flood Incident',
          description: 'Water rising',
          location: { name: 'Downtown Sector 4', resolved: true, coordinates: { type: 'Point', coordinates: [-73.98, 40.74] } },
          tags: ['flood'],
          creator: users.contributor1._id,
        },
        {
          title: 'Fire Incident',
          description: 'Building on fire',
          location: { name: 'East Industrial Park', resolved: true, coordinates: { type: 'Point', coordinates: [-73.95, 40.72] } },
          tags: ['fire'],
          creator: users.contributor2._id,
        },
      ]);
    });

    it('should publicly list all disasters without authentication', async () => {
      const res = await request(app).get('/disasters');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
    });

    it('should filter disasters by tag', async () => {
      const res = await request(app).get('/disasters?tag=flood');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].tags).toContain('flood');
    });
  });

  describe('PUT & DELETE /disasters/:id (Ownership & Authorization Rules)', () => {
    let createdDisaster;

    beforeEach(async () => {
      createdDisaster = await Disaster.create({
        title: 'Alice Disaster Record',
        description: 'Initial report by Alice',
        location: { name: 'Downtown Sector 4', resolved: true, coordinates: { type: 'Point', coordinates: [-73.98, 40.74] } },
        tags: ['medical'],
        creator: users.contributor1._id,
      });
    });

    it('should forbid Contributor 2 from editing Contributor 1\'s disaster (403)', async () => {
      const res = await request(app)
        .put(`/disasters/${createdDisaster._id}`)
        .set('Authorization', `Bearer ${users.contrib2Token}`)
        .send({ title: 'Malicious Update by Bob' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Forbidden');
    });

    it('should allow Contributor 1 to update their own disaster (200)', async () => {
      const res = await request(app)
        .put(`/disasters/${createdDisaster._id}`)
        .set('Authorization', `Bearer ${users.contrib1Token}`)
        .send({ title: 'Updated Title by Alice' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Title by Alice');
    });

    it('should allow Admin to update and delete any contributor\'s disaster (200)', async () => {
      // Admin update
      const updateRes = await request(app)
        .put(`/disasters/${createdDisaster._id}`)
        .set('Authorization', `Bearer ${users.adminToken}`)
        .send({ status: 'contained' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.status).toBe('contained');

      // Admin delete
      const deleteRes = await request(app)
        .delete(`/disasters/${createdDisaster._id}`)
        .set('Authorization', `Bearer ${users.adminToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
    });
  });
});

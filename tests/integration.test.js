const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');
const ioClient = require('socket.io-client');

const app = require('../src/app');
const User = require('../src/models/User');
const Disaster = require('../src/models/Disaster');
const Resource = require('../src/models/Resource');
const { cache } = require('../src/services/cacheService');
const { setSimulateFailure } = require('../src/services/communityReportProvider');
const { initSocket } = require('../src/services/socketService');
const { JWT_SECRET } = require('../src/config/env');

const TEST_DB = 'mongodb://127.0.0.1:27017/resqgrid_test';

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_DB);
  }
  await User.deleteMany({});
  await Disaster.deleteMany({});
  await Resource.deleteMany({});
  await Resource.init();
  await Disaster.init();
});

test.after(async () => {
  if (mongoose.connection.readyState !== 0) {
    await User.deleteMany({});
    await Disaster.deleteMany({});
    await Resource.deleteMany({});
    await mongoose.disconnect();
  }
});

test('1. Authentication & Role-Based Authorization', async (t) => {
  // Register Contributor
  const regRes = await request(app).post('/auth/register').send({
    name: 'Alice Contributor',
    email: 'alice.test@resqgrid.org',
    password: 'Password123!',
  });
  assert.strictEqual(regRes.status, 201);
  assert.strictEqual(regRes.body.success, true);
  assert.strictEqual(regRes.body.data.user.role, 'contributor');
  const aliceToken = regRes.body.data.token;

  // Register Second Contributor
  const bobRes = await request(app).post('/auth/register').send({
    name: 'Bob Contributor',
    email: 'bob.test@resqgrid.org',
    password: 'Password123!',
  });
  assert.strictEqual(bobRes.status, 201);
  const bobToken = bobRes.body.data.token;

  // Create Admin
  const adminUser = await User.create({
    name: 'Admin Boss',
    email: 'admin.test@resqgrid.org',
    password: 'AdminPassword123!',
    role: 'admin',
  });
  const adminToken = jwt.sign({ id: adminUser._id }, JWT_SECRET, { expiresIn: '1h' });

  // Test admin-only route /users
  const deniedUsers = await request(app)
    .get('/users')
    .set('Authorization', `Bearer ${aliceToken}`);
  assert.strictEqual(deniedUsers.status, 403);

  const allowedUsers = await request(app)
    .get('/users')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.strictEqual(allowedUsers.status, 200);
  assert.strictEqual(Array.isArray(allowedUsers.body.data), true);
});

test('2. Disaster Management & Location Extraction from Description', async (t) => {
  const alice = await User.findOne({ email: 'alice.test@resqgrid.org' });
  const aliceToken = jwt.sign({ id: alice._id }, JWT_SECRET, { expiresIn: '1h' });

  // Location extracted from description automatically (Requirement 2)
  const createRes = await request(app)
    .post('/disasters')
    .set('Authorization', `Bearer ${aliceToken}`)
    .send({
      title: 'Manhattan Water Crisis',
      description: 'Heavy flooding has affected Manhattan, NYC following broken water main.',
      tags: ['flood', 'water'],
    });

  assert.strictEqual(createRes.status, 201);
  assert.strictEqual(createRes.body.data.location.resolved, true);
  assert.strictEqual(createRes.body.data.location.name, 'Manhattan, NYC');
  assert.deepStrictEqual(createRes.body.data.location.coordinates.coordinates, [-73.9712, 40.7831]);
  assert.strictEqual(createRes.body.data.created_by._id.toString(), alice._id.toString());

  const disasterId = createRes.body.data.id;

  // Unresolved location handling
  const unresolvedRes = await request(app)
    .post('/disasters')
    .set('Authorization', `Bearer ${aliceToken}`)
    .send({
      title: 'Remote Incident',
      description: 'Downed power line in deep uncharted canyon sector 99.',
      location: 'Uncharted Canyon 99',
      tags: ['power'],
    });
  assert.strictEqual(unresolvedRes.status, 201);
  assert.strictEqual(unresolvedRes.body.data.location.resolved, false);
  assert.strictEqual(unresolvedRes.body.data.location.coordinates, null);

  // Basic filtering by tag
  const filterRes = await request(app).get('/disasters?tag=flood');
  assert.strictEqual(filterRes.status, 200);
  assert.strictEqual(filterRes.body.count >= 1, true);

  // Business rule: Bob cannot PATCH Alice's disaster (403 Forbidden)
  const bob = await User.findOne({ email: 'bob.test@resqgrid.org' });
  const bobToken = jwt.sign({ id: bob._id }, JWT_SECRET, { expiresIn: '1h' });

  const forbiddenPatch = await request(app)
    .patch(`/disasters/${disasterId}`)
    .set('Authorization', `Bearer ${bobToken}`)
    .send({ title: 'Hacked by Bob' });
  assert.strictEqual(forbiddenPatch.status, 403);

  // Alice can PATCH her own disaster
  const alicePatch = await request(app)
    .patch(`/disasters/${disasterId}`)
    .set('Authorization', `Bearer ${aliceToken}`)
    .send({ title: 'Manhattan Water Crisis - Resolved' });
  assert.strictEqual(alicePatch.status, 200);
  assert.strictEqual(alicePatch.body.data.title, 'Manhattan Water Crisis - Resolved');

  // Admin can update or delete any disaster
  const admin = await User.findOne({ email: 'admin.test@resqgrid.org' });
  const adminToken = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '1h' });

  const adminPatch = await request(app)
    .patch(`/disasters/${disasterId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'contained' });
  assert.strictEqual(adminPatch.status, 200);
  assert.strictEqual(adminPatch.body.data.status, 'contained');
});

test('3. Nearby Resources & Geospatial Proximity Search', async (t) => {
  const alice = await User.findOne({ email: 'alice.test@resqgrid.org' });
  const aliceToken = jwt.sign({ id: alice._id }, JWT_SECRET, { expiresIn: '1h' });

  // Seed resources around Manhattan [-73.9712, 40.7831]
  // Resource 1: ~0.4 km away
  await Resource.create({
    name: 'Manhattan Emergency Clinic',
    type: 'hospital',
    capacity: 200,
    location: {
      type: 'Point',
      coordinates: [-73.9715, 40.7835],
    },
  });

  // Resource 2: ~0.8 km away
  await Resource.create({
    name: 'Central Water Depot',
    type: 'water',
    capacity: 5000,
    location: {
      type: 'Point',
      coordinates: [-73.9740, 40.7850],
    },
  });

  // Resource 3: ~50 km away
  await Resource.create({
    name: 'Upstate Supply Center',
    type: 'food',
    capacity: 1000,
    location: {
      type: 'Point',
      coordinates: [-73.5000, 41.2000],
    },
  });

  const disaster = await Disaster.findOne({ 'location.name': 'Manhattan, NYC' });

  // GET /disasters/:id/resources?radius=2
  const proximityRes = await request(app).get(`/disasters/${disaster._id}/resources?radius=2`);
  assert.strictEqual(proximityRes.status, 200);
  assert.strictEqual(proximityRes.body.count, 2);
  const names = proximityRes.body.data.map((r) => r.name);
  assert.strictEqual(names.includes('Manhattan Emergency Clinic'), true);
  assert.strictEqual(names.includes('Central Water Depot'), true);
  assert.strictEqual(names.includes('Upstate Supply Center'), false);

  // Validate radius parameter (negative radius returns 400)
  const invalidRadius = await request(app).get(`/disasters/${disaster._id}/resources?radius=-5`);
  assert.strictEqual(invalidRadius.status, 400);

  // Geospatial search using explicit ?lat=<lat>&lng=<lng>&radius=<km>
  const explicitCoords = await request(app).get(
    `/disasters/${disaster._id}/resources?lat=40.7831&lng=-73.9712&radius=2`
  );
  assert.strictEqual(explicitCoords.status, 200);
  assert.strictEqual(explicitCoords.body.count, 2);
});

test('4. Community Reports, TTL Caching, and Fault Resilience', async (t) => {
  cache.clear();
  setSimulateFailure(false);

  const disaster = await Disaster.findOne({ 'location.name': 'Manhattan, NYC' });

  // First request: Live fetch (cache miss)
  const res1 = await request(app).get(`/disasters/${disaster._id}/reports`);
  assert.strictEqual(res1.status, 200);
  assert.strictEqual(res1.body.source, 'live');
  assert.strictEqual(res1.body.count > 0, true);
  assert.strictEqual(typeof res1.body.data[0].content, 'string');
  assert.strictEqual(typeof res1.body.data[0].user, 'string');

  // Second request: In-memory cache hit
  const res2 = await request(app).get(`/disasters/${disaster._id}/reports`);
  assert.strictEqual(res2.status, 200);
  assert.strictEqual(res2.body.source, 'cache');
  assert.strictEqual(res2.body.count, res1.body.count);

  // Third request: External service failure handled safely with fallback
  cache.clear();
  setSimulateFailure(true);

  const res3 = await request(app).get(`/disasters/${disaster._id}/reports`);
  assert.strictEqual(res3.status, 200);
  assert.strictEqual(res3.body.source, 'fallback');
  assert.strictEqual(res3.body.data.length, 0);
  assert.strictEqual(res3.body.warning.includes('graceful fallback'), true);

  setSimulateFailure(false);
  cache.clear();
});

test('5. Real-Time Socket.IO Synchronization', async (t) => {
  const alice = await User.findOne({ email: 'alice.test@resqgrid.org' });
  const aliceToken = jwt.sign({ id: alice._id }, JWT_SECRET, { expiresIn: '1h' });

  const server = http.createServer(app);
  initSocket(server);

  await new Promise((resolve) => {
    server.listen(0, resolve);
  });
  const port = server.address().port;

  const client = ioClient(`http://localhost:${port}`);

  await new Promise((resolve, reject) => {
    client.on('connect', async () => {
      client.on('disaster_created', (payload) => {
        try {
          assert.strictEqual(payload.action, 'created');
          assert.strictEqual(payload.disaster.title, 'Realtime Broadcast Test');
          client.disconnect();
          server.close(resolve);
        } catch (err) {
          client.disconnect();
          server.close(() => reject(err));
        }
      });

      await request(app)
        .post('/disasters')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          title: 'Realtime Broadcast Test',
          description: 'Flash flooding reported in Manhattan, NYC.',
        });
    });
  });
});

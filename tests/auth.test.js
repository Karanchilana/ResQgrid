const request = require('supertest');
const app = require('../src/app');
const { setupTestDB, createTestUsers } = require('./setup');

setupTestDB();

describe('Authentication & Authorization Endpoints', () => {
  describe('POST /auth/register', () => {
    it('should register a new contributor successfully', async () => {
      const res = await request(app).post('/auth/register').send({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('jane@example.com');
      expect(res.body.data.user.role).toBe('contributor');
      expect(res.body.data.token).toBeDefined();
    });

    it('should return 400 when missing required fields', async () => {
      const res = await request(app).post('/auth/register').send({
        email: 'incomplete@example.com',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should prevent duplicate registration with 409', async () => {
      await request(app).post('/auth/register').send({
        name: 'First Register',
        email: 'duplicate@example.com',
        password: 'password123',
      });

      const res = await request(app).post('/auth/register').send({
        name: 'Second Register',
        email: 'duplicate@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/auth/register').send({
        name: 'Login User',
        email: 'login@example.com',
        password: 'secretpassword',
      });
    });

    it('should login successfully with valid credentials', async () => {
      const res = await request(app).post('/auth/login').send({
        email: 'login@example.com',
        password: 'secretpassword',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('login@example.com');
    });

    it('should return 401 with invalid password', async () => {
      const res = await request(app).post('/auth/login').send({
        email: 'login@example.com',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Role-Based Access Control on /users', () => {
    it('should allow admin to list users and deny contributor', async () => {
      const { adminToken, contrib1Token } = await createTestUsers();

      // Contributor attempt -> 403 Forbidden
      const deniedRes = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${contrib1Token}`);

      expect(deniedRes.status).toBe(403);
      expect(deniedRes.body.success).toBe(false);

      // Admin attempt -> 200 OK
      const allowedRes = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(allowedRes.status).toBe(200);
      expect(allowedRes.body.success).toBe(true);
      expect(Array.isArray(allowedRes.body.data)).toBe(true);
    });
  });
});

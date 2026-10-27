const http = require('http');
const ioClient = require('socket.io-client');
const request = require('supertest');
const app = require('../src/app');
const { initSocket } = require('../src/services/socketService');
const { setupTestDB, createTestUsers } = require('./setup');

setupTestDB();

describe('Socket.IO Real-Time Notifications', () => {
  let server;
  let clientSocket;
  let port;
  let users;

  beforeAll((done) => {
    server = http.createServer(app);
    initSocket(server);
    server.listen(() => {
      port = server.address().port;
      done();
    });
  });

  afterAll((done) => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    server.close(done);
  });

  beforeEach(async () => {
    users = await createTestUsers();
  });

  it('should emit disaster_created event only after DB insert succeeds', (done) => {
    clientSocket = ioClient(`http://localhost:${port}`);

    clientSocket.on('connect', async () => {
      clientSocket.on('disaster_created', (payload) => {
        try {
          expect(payload.action).toBe('created');
          expect(payload.disaster).toBeDefined();
          expect(payload.disaster.title).toBe('Real-Time Emergency Broadcast');
          expect(payload.disaster.location.resolved).toBe(true);
          clientSocket.disconnect();
          done();
        } catch (err) {
          done(err);
        }
      });

      // Post disaster after socket is listening
      await request(app)
        .post('/disasters')
        .set('Authorization', `Bearer ${users.contrib1Token}`)
        .send({
          title: 'Real-Time Emergency Broadcast',
          description: 'Flash flood alert triggered via automated sensor.',
          location: 'Downtown Sector 4',
          tags: ['flood', 'alert'],
        });
    });
  });
});

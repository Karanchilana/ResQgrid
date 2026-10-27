const { Server } = require('socket.io');

let ioInstance = null;

/**
 * Initialize Socket.IO instance attached to the HTTP server.
 *
 * @param {import('http').Server} httpServer
 */
const initSocket = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  ioInstance.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
};

/**
 * Returns the active Socket.IO instance or null if not yet initialized.
 */
const getIO = () => ioInstance;

/**
 * Emit event to all connected clients after a disaster has been successfully created.
 */
const emitDisasterCreated = (disaster) => {
  if (ioInstance) {
    ioInstance.emit('disaster_created', {
      action: 'created',
      timestamp: new Date().toISOString(),
      disaster,
    });
  }
};

/**
 * Emit event to all connected clients after a disaster has been successfully updated.
 */
const emitDisasterUpdated = (disaster) => {
  if (ioInstance) {
    ioInstance.emit('disaster_updated', {
      action: 'updated',
      timestamp: new Date().toISOString(),
      disaster,
    });
  }
};

/**
 * Emit event to all connected clients after a disaster has been deleted.
 */
const emitDisasterDeleted = (disasterId) => {
  if (ioInstance) {
    ioInstance.emit('disaster_deleted', {
      action: 'deleted',
      timestamp: new Date().toISOString(),
      disasterId,
    });
  }
};

module.exports = {
  initSocket,
  getIO,
  emitDisasterCreated,
  emitDisasterUpdated,
  emitDisasterDeleted,
};

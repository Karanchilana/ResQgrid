const http = require('http');
const app = require('./app');
const { PORT, NODE_ENV } = require('./config/env');
const { connectDB } = require('./config/db');
const { initSocket } = require('./services/socketService');

const server = http.createServer(app);

// Attach Socket.IO
const io = initSocket(server);

// Start server
const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` ResQGrid API Server is running`);
      console.log(` Environment : ${NODE_ENV}`);
      console.log(` Port        : ${PORT}`);
      console.log(` Healthcheck : http://localhost:${PORT}/health`);
      console.log(` Socket.IO   : Ready on ws://localhost:${PORT}`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = { server, io, startServer };

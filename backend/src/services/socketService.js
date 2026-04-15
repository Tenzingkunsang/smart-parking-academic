let io;

module.exports = {
  init: (server) => {
    const { Server } = require('socket.io');
    io = new Server(server, {
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004'],
        credentials: true,
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling']
    });
    
    io.on('connection', (socket) => {
      console.log('✅ Client connected:', socket.id);
      
      socket.on('disconnect', (reason) => {
        console.log('❌ Client disconnected:', socket.id, 'Reason:', reason);
      });
    });
    
    return io;
  },
  getIo: () => {
    if (!io) {
      console.log('⚠️ Socket.io not initialized yet');
      return null;
    }
    return io;
  }
};

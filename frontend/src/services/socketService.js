import { io } from 'socket.io-client';
import { API_BASE } from '../config/api';

// This connects to your backend (usually http://localhost:5000)
const SOCKET_URL = API_BASE.replace('/api', ''); 

class SocketService {
  constructor() {
    this.socket = null;
  }

  getIo() {
    if (!this.socket) {
      const token = localStorage.getItem('token');
      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket']
      });

      this.socket.on('connect', () => {
        console.log('Connected to Real-time Notification Server');
      });
    }
    return this.socket;
  }

  // Helper to disconnect when logging out
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

const instance = new SocketService();
export default instance;
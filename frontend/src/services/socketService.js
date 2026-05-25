import { io } from 'socket.io-client';
import { getSocketOrigin } from '../config/api';

// Derives origin from REACT_APP_API_URL — strips path, keeps protocol+host only.
// e.g. 'https://smartparknepal.azurewebsites.net/api/v1' → 'https://smartparknepal.azurewebsites.net'
const SOCKET_URL = getSocketOrigin();

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
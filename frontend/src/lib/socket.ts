import { io, Socket } from 'socket.io-client';
import { getToken } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', { auth: { token: getToken() }, transports: ['websocket', 'polling'] });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

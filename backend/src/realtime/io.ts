import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { env } from '../config/env';
import { verifyToken } from '../modules/auth/auth.service';

/**
 * WebSocket layer (socket.io) for realtime dashboard updates and notifications.
 * Clients authenticate with the same JWT and join a per-user room + optional
 * dashboard room.
 */
let io: SocketServer | null = null;

export function initRealtime(server: HttpServer): SocketServer {
  io = new SocketServer(server, {
    cors: { origin: env.corsOrigin, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('unauthorized'));
      const payload = verifyToken(String(token));
      (socket.data as { userId: string }).userId = payload.sub;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = (socket.data as { userId: string }).userId;
    socket.join(`user:${userId}`);
    socket.on('dashboard:subscribe', () => socket.join('dashboard'));
    socket.on('dashboard:unsubscribe', () => socket.leave('dashboard'));
  });

  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}

/** Broadcast a dashboard-relevant event so open dashboards refresh in realtime. */
export function emitDashboard(event: string, payload: unknown): void {
  io?.to('dashboard').emit(event, payload);
}

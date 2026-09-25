import { io } from 'socket.io-client';

let socket = null;

// One authenticated connection at a time. The JWT is sent in the handshake and checked by the server.
export function connectSocket(token) {
  if (socket) socket.disconnect();
  socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export const getSocket = () => socket;

export function disconnectSocket() {
  if (socket) socket.disconnect();
  socket = null;
}

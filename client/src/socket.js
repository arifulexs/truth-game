import { io } from 'socket.io-client';
import { getToken } from './api.js';

let socket = null;

/** Lazily creates (or returns) the single shared socket for this session. */
export function getSocket() {
  if (socket) return socket;
  socket = io({
    autoConnect: false,
    auth: (cb) => cb({ token: getToken() }),
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 4000
  });
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/** Promise-based emit with the server's ack — makes call sites read top to bottom. */
export function emitWithAck(event, payload = {}, timeoutMs = 6000) {
  const s = getSocket();
  return new Promise((resolve, reject) => {
    s.timeout(timeoutMs).emit(event, payload, (err, ack) => {
      if (err) return reject(new Error('The server took too long to respond. Check your connection.'));
      if (!ack?.ok) return reject(new Error(ack?.message || 'Something went wrong.'));
      resolve(ack);
    });
  });
}

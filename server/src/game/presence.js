// Tracks which socket(s) belong to which logged-in user, independent of any
// game room. This is what makes a friend request or game invite show up
// live for someone who's just sitting on the home screen, not inside a room.

let ioRef = null;
// userId -> Set<socketId>  (a person could have the app open in more than one tab)
const socketsByUser = new Map();

export function initPresence(io) {
  ioRef = io;
}

export function registerSocket(userId, socketId) {
  if (!socketsByUser.has(userId)) socketsByUser.set(userId, new Set());
  socketsByUser.get(userId).add(socketId);
}

export function unregisterSocket(userId, socketId) {
  const set = socketsByUser.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) socketsByUser.delete(userId);
}

export function isOnline(userId) {
  return socketsByUser.has(userId);
}

/** Emits an event to every active socket a given user currently has open. */
export function emitToUser(userId, event, payload) {
  if (!ioRef) return;
  const set = socketsByUser.get(userId);
  if (!set || set.size === 0) return;
  for (const socketId of set) {
    ioRef.to(socketId).emit(event, payload);
  }
}

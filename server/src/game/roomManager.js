import crypto from 'node:crypto';
import { selectQuestions, QUESTIONS_PER_GAME, QUESTION_COUNT_OPTIONS, getQuestionText } from './questionBank.js';

// Room codes avoid visually ambiguous characters (0/O, 1/I).
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 5;

const WAITING_TTL_MS = 15 * 60 * 1000; // room expires if player 2 never joins
const INACTIVE_TTL_MS = 30 * 60 * 1000; // room expires after this much silence
const COMPLETE_TTL_MS = 5 * 60 * 1000; // completed rooms are swept shortly after
const INVITE_TTL_MS = WAITING_TTL_MS; // a direct invite shouldn't outlive the room it points to

export class RoomError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// roomId -> room object (the full, authoritative game state)
const rooms = new Map();
// roomCode -> roomId
const codeToId = new Map();
// userId -> roomId (lets a refreshed/reconnecting client find its way back in)
const userActiveRoom = new Map();
// toUserId -> { roomCode, roomId, fromUserId, fromName, createdAt } — a direct
// game invite waiting to be seen, live (via socket) or on next session check.
const pendingInvites = new Map();

function generateRoomCode() {
  let code;
  do {
    code = Array.from(
      { length: ROOM_CODE_LENGTH },
      () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
    ).join('');
  } while (codeToId.has(code));
  return code;
}

function isRoomLive(room) {
  return room && room.status !== 'abandoned' && room.status !== 'game_complete';
}

export function getActiveRoomForUser(userId) {
  const roomId = userActiveRoom.get(userId);
  if (!roomId) return null;
  const room = rooms.get(roomId);
  return isRoomLive(room) ? room : null;
}

export function createRoom({ hostId, hostName, categories, questionCount }) {
  if (!Array.isArray(categories) || categories.length === 0) {
    throw new RoomError('NO_CATEGORIES', 'Select at least one category to continue.');
  }

  const count = QUESTION_COUNT_OPTIONS.includes(questionCount) ? questionCount : QUESTIONS_PER_GAME;

  const existing = getActiveRoomForUser(hostId);
  if (existing) {
    throw new RoomError('ALREADY_IN_ROOM', 'You already have an active game. Leave it before creating a new one.');
  }

  const questionSequence = selectQuestions(categories, count);
  if (!questionSequence) {
    throw new RoomError(
      'NOT_ENOUGH_QUESTIONS',
      `Please select more categories. At least ${count} unique questions are required.`
    );
  }

  const roomId = crypto.randomUUID();
  const roomCode = generateRoomCode();
  const now = Date.now();

  const room = {
    roomId,
    roomCode,
    hostId,
    player2Id: null,
    selectedCategories: categories,
    questionSequence,
    currentQuestionIndex: 0,
    status: 'waiting_for_player', // waiting_for_player | question_active | answers_revealed | game_complete | abandoned
    createdAt: now,
    lastActivityAt: now,
    expiresAt: now + WAITING_TTL_MS,
    completedAt: null,
    players: {
      player1: { id: hostId, name: hostName, connected: false, socketId: null },
      player2: { id: null, name: null, connected: false, socketId: null }
    },
    currentQuestion: null,
    chatMessages: []
  };

  rooms.set(roomId, room);
  codeToId.set(roomCode, roomId);
  userActiveRoom.set(hostId, roomId);
  return room;
}

export function joinRoom(rawCode, userId, userName) {
  const roomCode = (rawCode || '').trim().toUpperCase();
  const roomId = codeToId.get(roomCode);
  const room = roomId ? rooms.get(roomId) : null;

  if (!room) throw new RoomError('NOT_FOUND', "That room code doesn't match any active game.");
  if (room.status === 'abandoned') throw new RoomError('EXPIRED', 'This room has expired.');
  if (room.status === 'game_complete') throw new RoomError('FINISHED', 'This game has already finished.');
  if (room.hostId === userId) throw new RoomError('OWN_ROOM', "You can't join your own room.");
  if (room.player2Id && room.player2Id !== userId) {
    throw new RoomError('FULL', 'This room already has two players.');
  }

  room.player2Id = userId;
  room.players.player2.id = userId;
  room.players.player2.name = userName;
  room.lastActivityAt = Date.now();
  userActiveRoom.set(userId, room.roomId);
  clearInviteForUser(userId); // whatever brought them here, it's resolved now
  return room;
}

export function getRoomByCode(rawCode) {
  const roomId = codeToId.get((rawCode || '').trim().toUpperCase());
  return roomId ? rooms.get(roomId) : null;
}

export function getRoomById(roomId) {
  return rooms.get(roomId) || null;
}

/** Which slot ('player1' | 'player2') does this user occupy in this room? */
export function slotForUser(room, userId) {
  if (room.hostId === userId) return 'player1';
  if (room.player2Id === userId) return 'player2';
  return null;
}

export function attachSocket(room, userId, socketId) {
  const slot = slotForUser(room, userId);
  if (!slot) return null;
  room.players[slot].connected = true;
  room.players[slot].socketId = socketId;
  room.lastActivityAt = Date.now();
  return slot;
}

export function detachSocket(room, socketId) {
  for (const slot of ['player1', 'player2']) {
    if (room.players[slot].socketId === socketId) {
      room.players[slot].connected = false;
      room.players[slot].socketId = null;
      room.lastActivityAt = Date.now();
      return slot;
    }
  }
  return null;
}

export function bothPlayersConnected(room) {
  return room.players.player1.connected && room.players.player2.connected;
}

export function addChatMessage(room, { senderId, senderSlot, senderName, message }) {
  const entry = {
    id: crypto.randomUUID(),
    senderId,
    senderSlot,
    senderName,
    message,
    createdAt: Date.now()
  };
  room.chatMessages.push(entry);
  room.lastActivityAt = Date.now();
  return entry;
}

export function markAbandoned(room) {
  room.status = 'abandoned';
  room.lastActivityAt = Date.now();
}

export function destroyRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  codeToId.delete(room.roomCode);
  rooms.delete(roomId);
  if (userActiveRoom.get(room.hostId) === roomId) userActiveRoom.delete(room.hostId);
  if (room.player2Id && userActiveRoom.get(room.player2Id) === roomId) {
    userActiveRoom.delete(room.player2Id);
  }
}

/**
 * Builds the view of room state safe to send to a specific player. This is
 * the enforcement point for answer privacy: the other player's answer is
 * only ever included once currentQuestion.revealed is true.
 */
export function getStateForPlayer(room, userId) {
  const slot = slotForUser(room, userId);
  if (!slot) return null;
  const otherSlot = slot === 'player1' ? 'player2' : 'player1';
  const q = room.currentQuestion;

  return {
    roomCode: room.roomCode,
    status: room.status,
    you: slot,
    currentQuestionIndex: room.currentQuestionIndex,
    totalQuestions: room.questionSequence.length,
    players: {
      you: room.players[slot].name,
      friend: room.players[otherSlot].name,
      friendConnected: room.players[otherSlot].connected
    },
    question: q
      ? {
          id: q.questionId,
          text: getQuestionText(q.questionId),
          yourAnswer: q[`${slot}Answer`],
          yourSubmitted: q[`${slot}Submitted`],
          friendSubmitted: q[`${otherSlot}Submitted`],
          friendAnswer: q.revealed ? q[`${otherSlot}Answer`] : null,
          revealed: q.revealed
        }
      : null,
    chatMessages: room.chatMessages
  };
}

/**
 * Direct game invites — how a friend gets pulled straight into a specific
 * room without ever seeing a room code. One pending invite per recipient at
 * a time; sending a new one simply replaces whatever was there before.
 */
export function createInvite(room, fromUserId, fromName, toUserId) {
  if (room.status !== 'waiting_for_player') {
    throw new RoomError('INVALID_STATE', 'This room is no longer open for an invite.');
  }
  if (room.hostId !== fromUserId) {
    throw new RoomError('FORBIDDEN', 'Only the host can invite someone to this room.');
  }
  if (toUserId === fromUserId) {
    throw new RoomError('OWN_ROOM', "You can't invite yourself.");
  }
  const invite = { roomCode: room.roomCode, roomId: room.roomId, fromUserId, fromName, createdAt: Date.now() };
  pendingInvites.set(toUserId, invite);
  return invite;
}

export function getInviteForUser(userId) {
  const invite = pendingInvites.get(userId);
  if (!invite) return null;
  const room = rooms.get(invite.roomId);
  if (!room || room.status !== 'waiting_for_player' || Date.now() - invite.createdAt > INVITE_TTL_MS) {
    pendingInvites.delete(userId);
    return null;
  }
  return invite;
}

export function clearInviteForUser(userId) {
  pendingInvites.delete(userId);
}

export function sweepExpiredRooms() {
  const now = Date.now();
  const removed = [];
  for (const room of rooms.values()) {
    let expire = false;
    if (room.status === 'waiting_for_player' && now - room.createdAt > WAITING_TTL_MS) expire = true;
    if (room.status === 'game_complete' && room.completedAt && now - room.completedAt > COMPLETE_TTL_MS) expire = true;
    if (room.status !== 'game_complete' && now - room.lastActivityAt > INACTIVE_TTL_MS) expire = true;
    if (expire) {
      removed.push(room);
      destroyRoom(room.roomId);
    }
  }
  return removed;
}

import * as roomManager from './roomManager.js';
import * as stateMachine from './stateMachine.js';
import { RoomError } from './roomManager.js';

/** Sends each connected player their own privacy-safe view of the room. */
function pushStateToRoom(io, room) {
  for (const slot of ['player1', 'player2']) {
    const player = room.players[slot];
    if (player.connected && player.socketId) {
      io.to(player.socketId).emit('game-state', roomManager.getStateForPlayer(room, player.id));
    }
  }
}

function otherSlot(slot) {
  return slot === 'player1' ? 'player2' : 'player1';
}

export function registerSocketHandlers(io, socket) {
  const userId = socket.data.userId;
  const userName = socket.data.displayName;

  socket.on('join-room-socket', ({ roomCode } = {}, ack) => {
    const room = roomManager.getRoomByCode(roomCode);
    if (!room) return ack?.({ ok: false, error: 'NOT_FOUND', message: 'Room not found.' });

    const slot = roomManager.slotForUser(room, userId);
    if (!slot) return ack?.({ ok: false, error: 'FORBIDDEN', message: "You're not part of this room." });

    socket.data.roomId = room.roomId;
    socket.join(`room:${room.roomId}`);
    roomManager.attachSocket(room, userId, socket.id);

    if (room.status === 'waiting_for_player' && roomManager.bothPlayersConnected(room)) {
      stateMachine.startGame(room);
    }

    ack?.({ ok: true });
    pushStateToRoom(io, room);

    // Let the other player know someone (re)connected, for waiting-room UI / banners.
    socket.to(`room:${room.roomId}`).emit('opponent-connection-changed', { connected: true });
  });

  socket.on('submit-answer', ({ answer } = {}, ack) => {
    const room = socket.data.roomId && roomManager.getRoomById(socket.data.roomId);
    if (!room) return ack?.({ ok: false, error: 'NOT_FOUND', message: 'This game session no longer exists.' });
    const slot = roomManager.slotForUser(room, userId);
    if (!slot) return ack?.({ ok: false, error: 'FORBIDDEN', message: "You're not part of this room." });

    try {
      stateMachine.submitAnswer(room, slot, answer);
      ack?.({ ok: true });
      pushStateToRoom(io, room);
    } catch (err) {
      ack?.({ ok: false, error: err.code || 'ERROR', message: err.message });
    }
  });

  socket.on('next-question', (_payload, ack) => {
    const room = socket.data.roomId && roomManager.getRoomById(socket.data.roomId);
    if (!room) return ack?.({ ok: false, error: 'NOT_FOUND', message: 'This game session no longer exists.' });
    const slot = roomManager.slotForUser(room, userId);
    if (!slot) return ack?.({ ok: false, error: 'FORBIDDEN', message: "You're not part of this room." });

    try {
      const result = stateMachine.advanceQuestion(room);
      ack?.({ ok: true });
      if (result.complete) {
        io.to(`room:${room.roomId}`).emit('game-complete', { totalQuestions: room.questionSequence.length });
      }
      pushStateToRoom(io, room);
    } catch (err) {
      ack?.({ ok: false, error: err.code || 'ERROR', message: err.message });
    }
  });

  socket.on('send-chat-message', ({ message } = {}, ack) => {
    const room = socket.data.roomId && roomManager.getRoomById(socket.data.roomId);
    if (!room) return ack?.({ ok: false, error: 'NOT_FOUND', message: 'This game session no longer exists.' });
    const slot = roomManager.slotForUser(room, userId);
    if (!slot) return ack?.({ ok: false, error: 'FORBIDDEN', message: "You're not part of this room." });

    const trimmed = (message || '').trim();
    if (!trimmed) return ack?.({ ok: false, error: 'EMPTY_MESSAGE', message: 'Message is empty.' });
    if (trimmed.length > 1000) return ack?.({ ok: false, error: 'MESSAGE_TOO_LONG', message: 'Message is too long.' });

    const entry = roomManager.addChatMessage(room, { senderId: userId, senderSlot: slot, senderName: userName, message: trimmed });
    ack?.({ ok: true });
    io.to(`room:${room.roomId}`).emit('chat-message', entry);
  });

  socket.on('leave-game', (_payload, ack) => {
    const room = socket.data.roomId && roomManager.getRoomById(socket.data.roomId);
    if (!room) return ack?.({ ok: true });
    const slot = roomManager.slotForUser(room, userId);
    roomManager.markAbandoned(room);
    ack?.({ ok: true });
    socket.to(`room:${room.roomId}`).emit('opponent-left', { slot });
    io.socketsLeave(`room:${room.roomId}`);
  });

  socket.on('disconnect', () => {
    const room = socket.data.roomId && roomManager.getRoomById(socket.data.roomId);
    if (!room) return;
    const slot = roomManager.detachSocket(room, socket.id);
    if (slot && room.status !== 'game_complete' && room.status !== 'abandoned') {
      socket.to(`room:${room.roomId}`).emit('opponent-connection-changed', { connected: false });
    }
  });
}

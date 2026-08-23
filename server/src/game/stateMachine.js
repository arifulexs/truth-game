import { RoomError } from './roomManager.js';

/*
 * States: waiting_for_player -> question_active -> answers_revealed
 *         -> question_active (next question) -> ... -> game_complete
 *
 * Submission progress (player1Submitted/player2Submitted) is tracked inside
 * currentQuestion rather than as separate top-level statuses — this keeps
 * the state machine small while still fully preventing a client from ever
 * seeing the other player's answer, or the next question, ahead of schedule.
 */

function createQuestionState(room, index) {
  return {
    questionId: room.questionSequence[index],
    player1Submitted: false,
    player2Submitted: false,
    player1Answer: null,
    player2Answer: null,
    revealed: false
  };
}

export function startGame(room) {
  if (room.status !== 'waiting_for_player') return;
  room.status = 'question_active';
  room.currentQuestionIndex = 0;
  room.currentQuestion = createQuestionState(room, 0);
  room.lastActivityAt = Date.now();
}

export function submitAnswer(room, slot, answer) {
  if (room.status !== 'question_active') {
    throw new RoomError('INVALID_STATE', 'There is no active question to answer right now.');
  }
  const trimmed = (answer || '').trim();
  if (!trimmed) {
    throw new RoomError('EMPTY_ANSWER', 'Write an answer before submitting.');
  }
  if (trimmed.length > 2000) {
    throw new RoomError('ANSWER_TOO_LONG', 'That answer is too long.');
  }

  const q = room.currentQuestion;
  if (q[`${slot}Submitted`]) {
    throw new RoomError('DUPLICATE_SUBMISSION', 'You already submitted an answer for this question.');
  }

  q[`${slot}Answer`] = trimmed;
  q[`${slot}Submitted`] = true;
  room.lastActivityAt = Date.now();

  if (q.player1Submitted && q.player2Submitted) {
    q.revealed = true;
    room.status = 'answers_revealed';
  }
}

export function advanceQuestion(room) {
  if (room.status !== 'answers_revealed') {
    throw new RoomError('INVALID_STATE', 'Both answers need to be revealed before moving on.');
  }
  const nextIndex = room.currentQuestionIndex + 1;
  room.lastActivityAt = Date.now();

  if (nextIndex >= room.questionSequence.length) {
    room.status = 'game_complete';
    room.currentQuestion = null;
    room.completedAt = Date.now();
    return { complete: true };
  }

  room.currentQuestionIndex = nextIndex;
  room.currentQuestion = createQuestionState(room, nextIndex);
  room.status = 'question_active';
  return { complete: false };
}

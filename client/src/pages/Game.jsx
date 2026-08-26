import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { connectSocket, emitWithAck, getSocket } from '../socket.js';
import { useToast } from '../context/ToastContext.jsx';
import TopBar from '../components/TopBar.jsx';
import HamburgerMenu from '../components/HamburgerMenu.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import AnswerCard from '../components/AnswerCard.jsx';
import ChatPanel from '../components/ChatPanel.jsx';

export default function Game() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [gameState, setGameState] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [friendConnected, setFriendConnected] = useState(true);
  const [connectError, setConnectError] = useState('');
  const [advancing, setAdvancing] = useState(false);
  const leftIntentionallyRef = useRef(false);

  useEffect(() => {
    const socket = connectSocket();

    const onGameState = (payload) => {
      setGameState(payload);
      setChatMessages(payload.chatMessages || []);
      setFriendConnected(payload.players?.friendConnected ?? true);
    };
    const onChatMessage = (msg) => {
      setChatMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    };
    const onConnectionChanged = ({ connected }) => setFriendConnected(connected);
    const onOpponentLeft = () => {
      if (leftIntentionallyRef.current) return;
      toast.error('Your friend left the game.');
      navigate('/', { replace: true });
    };
    const onSessionEnded = () => {
      toast.error('This game session has ended.');
      navigate('/', { replace: true });
    };

    socket.on('game-state', onGameState);
    socket.on('chat-message', onChatMessage);
    socket.on('opponent-connection-changed', onConnectionChanged);
    socket.on('opponent-left', onOpponentLeft);
    socket.on('session-ended', onSessionEnded);

    emitWithAck('join-room-socket', { roomCode }).catch((err) => {
      setConnectError(err.message || "Couldn't connect to this game.");
    });

    return () => {
      socket.off('game-state', onGameState);
      socket.off('chat-message', onChatMessage);
      socket.off('opponent-connection-changed', onConnectionChanged);
      socket.off('opponent-left', onOpponentLeft);
      socket.off('session-ended', onSessionEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  useEffect(() => {
    if (gameState?.status === 'game_complete') {
      navigate(`/complete/${roomCode}`, { replace: true });
    }
  }, [gameState?.status, navigate, roomCode]);

  const submitAnswer = useCallback(async (answer) => {
    try {
      await emitWithAck('submit-answer', { answer });
    } catch (err) {
      toast.error(err.message || 'Could not submit your answer.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleNextQuestion() {
    setAdvancing(true);
    try {
      await emitWithAck('next-question', {});
    } catch (err) {
      toast.error(err.message || 'Could not move to the next question.');
    } finally {
      setAdvancing(false);
    }
  }

  async function sendChatMessage(message) {
    try {
      await emitWithAck('send-chat-message', { message });
    } catch (err) {
      toast.error(err.message || 'Message failed to send.');
    }
  }

  async function confirmLeaveGame() {
    leftIntentionallyRef.current = true;
    try {
      await emitWithAck('leave-game', {});
    } catch {
      // leaving anyway
    }
    navigate('/', { replace: true });
  }

  if (connectError) {
    return (
      <div className="app-shell">
        <TopBar onMenuClick={() => setMenuOpen(true)} />
        <div className="centered-screen">
          <div className="card state-card">
            <div className="emoji">😕</div>
            <h3>Couldn't rejoin this game</h3>
            <p>{connectError}</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState || !gameState.question) {
    return (
      <div className="app-shell">
        <TopBar onMenuClick={() => setMenuOpen(true)} />
        <div className="full-screen-loading">
          <span className="inline-spinner" />
        </div>
      </div>
    );
  }

  const { question, players, currentQuestionIndex, totalQuestions } = gameState;

  return (
    <div className="app-shell">
      <TopBar onMenuClick={() => setMenuOpen(true)} />
      {!friendConnected && <div className="connection-banner">Your friend's connection dropped — hang tight, they may reconnect.</div>}

      <div className="game-layout">
        <ProgressBar current={currentQuestionIndex + 1} total={totalQuestions} />

        <div className="game-scroll">
          <div className="game-inner">
            <div className="card question-card" key={`qcard-${question.id}`}>
              <div className="question-eyebrow">Question {currentQuestionIndex + 1} of {totalQuestions}</div>
              <div className="question-text">{question.text}</div>
            </div>

            <div className="answers-grid">
              <AnswerCard
                key={`mine-${question.id}`}
                mine
                name={players.you}
                submitted={question.yourSubmitted}
                answerText={question.yourAnswer}
                revealed={question.revealed}
                onSubmit={submitAnswer}
              />
              <AnswerCard
                key={`friend-${question.id}`}
                mine={false}
                name={players.friend}
                submitted={question.friendSubmitted}
                answerText={question.friendAnswer}
                revealed={question.revealed}
              />
            </div>

            {question.revealed && (
              <div className="next-question-row">
                <button className="btn btn-primary" onClick={handleNextQuestion} disabled={advancing}>
                  {advancing ? <span className="inline-spinner" /> : 'Next question →'}
                </button>
              </div>
            )}

            <ChatPanel messages={chatMessages} youSlot={gameState.you} onSend={sendChatMessage} />
          </div>
        </div>
      </div>

      <HamburgerMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        inGame
        onRequestLeaveGame={() => setConfirmLeave(true)}
      />

      {confirmLeave && (
        <ConfirmDialog
          title="Leave this game?"
          message="Your friend will be notified and this session will end for both of you."
          confirmLabel="Leave game"
          danger
          onCancel={() => setConfirmLeave(false)}
          onConfirm={confirmLeaveGame}
        />
      )}
    </div>
  );
}

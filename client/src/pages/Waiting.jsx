import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { connectSocket, emitWithAck, getSocket } from '../socket.js';
import { useToast } from '../context/ToastContext.jsx';
import TopBar from '../components/TopBar.jsx';
import HamburgerMenu from '../components/HamburgerMenu.jsx';

export default function Waiting() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [state, setState] = useState(null);
  const [connectError, setConnectError] = useState('');
  const [copied, setCopied] = useState(false);
  const navigatedRef = useRef(false);

  const inviteLink = `${window.location.origin}/join?code=${roomCode}`;

  const handleGameState = useCallback(
    (payload) => {
      setState(payload);
      if (payload.status !== 'waiting_for_player' && !navigatedRef.current) {
        navigatedRef.current = true;
        navigate(`/game/${roomCode}`, { replace: true });
      }
    },
    [navigate, roomCode]
  );

  useEffect(() => {
    const socket = connectSocket();
    socket.on('game-state', handleGameState);

    emitWithAck('join-room-socket', { roomCode }).catch((err) => {
      setConnectError(err.message || "Couldn't connect to this room.");
    });

    return () => {
      socket.off('game-state', handleGameState);
    };
  }, [roomCode, handleGameState]);

  function copyLink() {
    navigator.clipboard
      .writeText(inviteLink)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error('Could not copy the link.'));
  }

  if (connectError) {
    return (
      <div className="app-shell">
        <TopBar onMenuClick={() => setMenuOpen(true)} />
        <div className="centered-screen">
          <div className="card state-card">
            <div className="emoji">😕</div>
            <h3>Couldn't join this room</h3>
            <p>{connectError}</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Back to home
            </button>
          </div>
        </div>
        <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} inGame={false} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBar onMenuClick={() => setMenuOpen(true)} />
      <div className="centered-screen">
        <div className="card waiting-card">
          <div className="waiting-pulse" />
          <h2>Waiting for your friend...</h2>

          <div className="room-code-display">{roomCode}</div>

          <button className="btn btn-secondary btn-block" onClick={copyLink}>
            {copied ? 'Link copied ✓' : 'Copy invite link'}
          </button>

          <div style={{ marginTop: 20 }}>
            <div className="roster-row">
              <span>{state?.players?.you || 'You'}</span>
              <span className="status ready">Ready ✓</span>
            </div>
            <div className="roster-row">
              <span>{state?.players?.friend || 'Your friend'}</span>
              <span className="status pending">Waiting...</span>
            </div>
          </div>
        </div>
      </div>
      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} inGame={false} />
    </div>
  );
}

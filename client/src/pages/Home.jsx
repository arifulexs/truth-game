import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import TopBar from '../components/TopBar.jsx';
import HamburgerMenu from '../components/HamburgerMenu.jsx';

export default function Home() {
  const { user, activeRoom } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Section 4: on load, route straight back into an existing room/game
  // rather than showing Home first.
  if (activeRoom) {
    const dest = activeRoom.status === 'waiting_for_player' ? `/waiting/${activeRoom.roomCode}` : `/game/${activeRoom.roomCode}`;
    return <Navigate to={dest} replace />;
  }

  return (
    <div className="app-shell">
      <TopBar onMenuClick={() => setMenuOpen(true)} />
      <div className="page-scroll">
        <div className="page-inner">
          <div className="home-greeting">
            <h1>Hey, {user?.displayName?.split(' ')[0]} 👋</h1>
            <p>Start a new game, or jump into one your friend sent you.</p>
          </div>

          <div className="home-actions">
            <button className="home-action-card create" onClick={() => navigate('/create')}>
              <span className="icon-badge">✦</span>
              <h3>Create a room</h3>
              <p>Pick categories and get a code to share.</p>
            </button>
            <button className="home-action-card join" onClick={() => navigate('/join')}>
              <span className="icon-badge">→</span>
              <h3>Join a room</h3>
              <p>Enter a code your friend sent you.</p>
            </button>
          </div>
        </div>
      </div>

      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} inGame={false} />
    </div>
  );
}

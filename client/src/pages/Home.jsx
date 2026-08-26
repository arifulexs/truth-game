import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../api.js';
import TopBar from '../components/TopBar.jsx';
import HamburgerMenu from '../components/HamburgerMenu.jsx';

export default function Home() {
  const { user, activeRoom, pendingInvite, dismissInvite } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [joiningInvite, setJoiningInvite] = useState(false);

  // Section 4: on load, route straight back into an existing room/game
  // rather than showing Home first.
  if (activeRoom) {
    const dest = activeRoom.status === 'waiting_for_player' ? `/waiting/${activeRoom.roomCode}` : `/game/${activeRoom.roomCode}`;
    return <Navigate to={dest} replace />;
  }

  async function joinInvite() {
    if (!pendingInvite || joiningInvite) return;
    setJoiningInvite(true);
    try {
      const room = await api.joinRoom(pendingInvite.roomCode);
      dismissInvite();
      navigate(`/waiting/${room.roomCode}`);
    } catch (err) {
      toast.error(err.message || 'Could not join that game.');
      dismissInvite();
    } finally {
      setJoiningInvite(false);
    }
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

          {pendingInvite && (
            <div className="invite-banner">
              <div>
                <p className="invite-banner-title">{pendingInvite.fromName} invited you to a game</p>
                <p className="invite-banner-sub">Join directly — no code needed.</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={dismissInvite}>
                  Dismiss
                </button>
                <button className="btn btn-primary btn-sm" onClick={joinInvite} disabled={joiningInvite}>
                  {joiningInvite ? <span className="inline-spinner" /> : 'Join'}
                </button>
              </div>
            </div>
          )}

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

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import TopBar from '../components/TopBar.jsx';
import HamburgerMenu from '../components/HamburgerMenu.jsx';

export default function JoinRoom() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [code, setCode] = useState((params.get('code') || '').toUpperCase());
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  async function handleJoin(e) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setError('');
    setJoining(true);
    try {
      const room = await api.joinRoom(trimmed);
      navigate(`/waiting/${room.roomCode}`);
    } catch (err) {
      setError(err.message || 'Could not join that room.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="app-shell">
      <TopBar onMenuClick={() => setMenuOpen(true)} />
      <div className="centered-screen">
        <div className="card auth-card">
          <div className="auth-hero">
            <h1>Join a room</h1>
            <p>Enter the code your friend shared with you.</p>
          </div>

          {error && <div className="form-error-banner">{error}</div>}

          <form onSubmit={handleJoin}>
            <div className="field">
              <label htmlFor="roomCode">Room code</label>
              <input
                id="roomCode"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="AB7K2"
                maxLength={5}
                style={{ textAlign: 'center', fontSize: '1.3rem', letterSpacing: '0.15em', fontWeight: 700 }}
                autoFocus
                required
              />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={joining || !code.trim()}>
              {joining ? <span className="inline-spinner" /> : 'Join room'}
            </button>
          </form>
        </div>
      </div>

      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} inGame={false} />
    </div>
  );
}

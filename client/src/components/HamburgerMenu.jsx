import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { enablePushNotifications, disablePushNotifications, getCurrentSubscription, getNotificationPermission, isPushSupported } from '../push.js';
import FriendsPanel from './FriendsPanel.jsx';
import BadgeRow from './Badge.jsx';

const INFO_PANELS = {
  about: {
    title: 'About',
    body: (
      <p>
        Truth is a small, private game for exactly two friends. Pick some categories, share your room
        code (or invite a friend directly), and answer the same questions together — your answers stay
        hidden until you've both submitted.
        <br />
        <br />
        Made by Ariful Islam.
      </p>
    )
  },
  howto: {
    title: 'How to play',
    body: (
      <ol>
        <li>Create a room, choose categories and how many questions, or join one with a code from a friend.</li>
        <li>Once you're both in, you'll see the same question at the same time.</li>
        <li>Write your answer. It stays private until you've both submitted.</li>
        <li>Once you've both answered, both answers flip and reveal together.</li>
        <li>Either of you can move to the next question. Chat any time — it stays up the whole game.</li>
        <li>After the last question, the session ends and the room is cleared.</li>
      </ol>
    )
  },
  report: {
    title: 'Report a problem',
    body: (
      <p>
        Something broken or acting weird? Email <strong>arifulff14@gmail.com</strong> with what happened
        and, if you can, your room code — it isn't stored anywhere once the game ends, so grab it while
        the game is still open.
      </p>
    )
  }
};

export default function HamburgerMenu({ open, onClose, inGame, onRequestLeaveGame }) {
  const { user, logout, updateDisplayName, pendingRequestCount } = useAuth();
  const { preference, setThemePreference } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(user?.displayName || '');
  const [savingName, setSavingName] = useState(false);
  const [infoPanel, setInfoPanel] = useState(null);
  // Lives here, not gated behind `open`, so closing the hamburger drawer to
  // hand off to the Friends panel doesn't unmount the panel along with it —
  // this component stays mounted across pages, only its drawer is toggled.
  const [friendsOpen, setFriendsOpen] = useState(false);

  const [pushStatus, setPushStatus] = useState('checking'); // checking | unsupported | off | on | loading

  useEffect(() => {
    if (!open) return;
    if (!isPushSupported()) {
      setPushStatus('unsupported');
      return;
    }
    if (getNotificationPermission() === 'denied') {
      setPushStatus('denied');
      return;
    }
    getCurrentSubscription()
      .then((sub) => setPushStatus(sub ? 'on' : 'off'))
      .catch(() => setPushStatus('off'));
  }, [open]);

  async function togglePush() {
    if (pushStatus === 'on') {
      setPushStatus('loading');
      try {
        await disablePushNotifications();
        setPushStatus('off');
        toast.show('Notifications turned off');
      } catch (err) {
        toast.error(err.message || 'Could not turn off notifications.');
        setPushStatus('on');
      }
      return;
    }
    setPushStatus('loading');
    try {
      await enablePushNotifications();
      setPushStatus('on');
      toast.success('Notifications enabled');
    } catch (err) {
      toast.error(err.message || 'Could not enable notifications.');
      setPushStatus(getNotificationPermission() === 'denied' ? 'denied' : 'off');
    }
  }

  async function saveName() {
    if (!nameDraft.trim()) return;
    setSavingName(true);
    try {
      await updateDisplayName(nameDraft.trim());
      toast.success('Display name updated');
      setEditingName(false);
    } catch (err) {
      toast.error(err.message || 'Could not update your name.');
    } finally {
      setSavingName(false);
    }
  }

  function handleLogout() {
    logout();
    onClose();
    navigate('/login');
  }

  function openFriends() {
    onClose();
    setFriendsOpen(true);
  }

  function goToAdmin() {
    onClose();
    navigate('/admin');
  }

  return (
    <>
      {open && (
        <>
          <div className="drawer-backdrop" onClick={onClose} />
          <div className="drawer-panel" role="dialog" aria-label="Menu">
            <div className="drawer-header">
              <h3>Menu</h3>
              <button className="icon-button" onClick={onClose} aria-label="Close menu">
                ✕
              </button>
            </div>

            <div className="drawer-section">
              <div className="drawer-section-title">Account</div>
              {editingName ? (
                <div className="display-name-edit">
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    maxLength={30}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && saveName()}
                  />
                  <button className="btn btn-primary btn-sm" onClick={saveName} disabled={savingName}>
                    Save
                  </button>
                </div>
              ) : (
                <button
                  className="drawer-row"
                  onClick={() => {
                    setNameDraft(user?.displayName || '');
                    setEditingName(true);
                  }}
                >
                  <span>
                    {user?.displayName}
                    <BadgeRow badges={user?.badges} />
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Edit</span>
                </button>
              )}

              <button className="drawer-row" onClick={openFriends}>
                <span>Friends</span>
                <span className="drawer-row-right">
                  {pendingRequestCount > 0 && <span className="tab-badge">{pendingRequestCount}</span>}
                  <span className="drawer-chevron">→</span>
                </span>
              </button>
            </div>

            <div className="drawer-section">
              <div className="drawer-section-title">Appearance</div>
              <div className="theme-toggle-group">
                {['light', 'dark', 'system'].map((opt) => (
                  <button
                    key={opt}
                    className={`theme-toggle-btn ${preference === opt ? 'active' : ''}`}
                    onClick={() => setThemePreference(opt)}
                  >
                    {opt === 'light' ? 'Light' : opt === 'dark' ? 'Dark' : 'System'}
                  </button>
                ))}
              </div>
            </div>

            <div className="drawer-section">
              <div className="drawer-section-title">Notifications</div>
              {pushStatus === 'unsupported' ? (
                <p className="info-panel-text">Not supported in this browser.</p>
              ) : pushStatus === 'denied' ? (
                <p className="info-panel-text">Blocked — enable notifications for this site in your browser settings.</p>
              ) : (
                <button className="drawer-row" onClick={togglePush} disabled={pushStatus === 'loading' || pushStatus === 'checking'}>
                  <span>Game invites &amp; friend requests</span>
                  {pushStatus === 'loading' || pushStatus === 'checking' ? (
                    <span className="inline-spinner" style={{ width: 16, height: 16 }} />
                  ) : (
                    <span className={`toggle-switch ${pushStatus === 'on' ? 'active' : ''}`} />
                  )}
                </button>
              )}
            </div>

            {inGame && (
              <div className="drawer-section">
                <div className="drawer-section-title">Game</div>
                <button
                  className="drawer-row danger"
                  onClick={() => {
                    onClose();
                    onRequestLeaveGame();
                  }}
                >
                  <span>Leave game</span>
                  <span>→</span>
                </button>
              </div>
            )}

            {user?.isAdmin && (
              <div className="drawer-section">
                <div className="drawer-section-title">Admin</div>
                <button className="drawer-row" onClick={goToAdmin}>
                  <span>Manage questions &amp; badges</span>
                  <span className="drawer-chevron">→</span>
                </button>
              </div>
            )}

            <div className="drawer-section">
              <div className="drawer-section-title">Other</div>
              {Object.entries(INFO_PANELS).map(([key, panel]) => (
                <button key={key} className="drawer-row" onClick={() => setInfoPanel(infoPanel === key ? null : key)}>
                  <span>{panel.title}</span>
                  <span>{infoPanel === key ? '−' : '+'}</span>
                </button>
              ))}
              {infoPanel && (
                <div className="info-panel-text" style={{ marginTop: 8 }}>
                  {INFO_PANELS[infoPanel].body}
                </div>
              )}
            </div>

            <div className="drawer-section" style={{ marginTop: 'auto' }}>
              <button className="drawer-row danger" onClick={handleLogout}>
                <span>Log out</span>
              </button>
            </div>
          </div>
        </>
      )}

      <FriendsPanel open={friendsOpen} onClose={() => setFriendsOpen(false)} />
    </>
  );
}

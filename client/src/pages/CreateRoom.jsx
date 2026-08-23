import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import TopBar from '../components/TopBar.jsx';
import HamburgerMenu from '../components/HamburgerMenu.jsx';

const MIN_QUESTIONS = 20;

export default function CreateRoom() {
  const navigate = useNavigate();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);

  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api
      .categories()
      .then((data) => setCategories(data.categories))
      .catch(() => setLoadError("Couldn't load categories. Check your connection."))
      .finally(() => setLoadingCategories(false));
  }, []);

  function toggle(key) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  const availableCount = categories
    .filter((c) => selected.includes(c.key))
    .reduce((sum, c) => sum + c.count, 0);
  const enoughQuestions = availableCount >= MIN_QUESTIONS;

  async function handleCreate() {
    if (selected.length === 0 || !enoughQuestions || creating) return;
    setCreating(true);
    try {
      const room = await api.createRoom(selected);
      navigate(`/waiting/${room.roomCode}`);
    } catch (err) {
      toast.error(err.message || 'Could not create the room.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="app-shell">
      <TopBar onMenuClick={() => setMenuOpen(true)} />
      <div className="page-scroll">
        <div className="page-inner">
          <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Choose categories</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Pick one or more. You'll both get the same 20 questions, in the same order.
          </p>

          {loadingCategories ? (
            <div className="full-screen-loading" style={{ padding: '40px 0' }}>
              <span className="inline-spinner" />
            </div>
          ) : loadError ? (
            <div className="card state-card" style={{ marginTop: 20 }}>
              <div className="emoji">⚠️</div>
              <h3>Couldn't load categories</h3>
              <p>{loadError}</p>
              <button className="btn btn-secondary" onClick={() => window.location.reload()}>
                Try again
              </button>
            </div>
          ) : (
            <>
              <div className="category-grid">
                {categories.map((c) => (
                  <button
                    key={c.key}
                    className={`category-chip ${selected.includes(c.key) ? 'selected' : ''}`}
                    onClick={() => toggle(c.key)}
                    aria-pressed={selected.includes(c.key)}
                  >
                    <span className="label">{c.label}</span>
                    <span className="count">{c.count} questions</span>
                  </button>
                ))}
              </div>

              <div className="selection-summary">
                <span>
                  {selected.length === 0 ? (
                    'No categories selected yet'
                  ) : (
                    <>
                      <strong>{availableCount}</strong> questions available across {selected.length} categor
                      {selected.length === 1 ? 'y' : 'ies'}
                    </>
                  )}
                </span>
              </div>

              {selected.length > 0 && !enoughQuestions && (
                <div className="form-error-banner">
                  Please select more categories. At least {MIN_QUESTIONS} unique questions are required.
                </div>
              )}

              <button
                className="btn btn-primary btn-block"
                onClick={handleCreate}
                disabled={selected.length === 0 || !enoughQuestions || creating}
              >
                {creating ? <span className="inline-spinner" /> : 'Create room'}
              </button>
            </>
          )}
        </div>
      </div>

      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} inGame={false} />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../api.js';
import TopBar from '../components/TopBar.jsx';
import { Badge } from '../components/Badge.jsx';

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('questions');

  useEffect(() => {
    if (user && !user.isAdmin) navigate('/', { replace: true });
  }, [user, navigate]);

  if (!user?.isAdmin) return null;

  return (
    <div className="app-shell">
      <TopBar onMenuClick={() => navigate('/')} />
      <div className="page-scroll">
        <div className="page-inner" style={{ maxWidth: 640 }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 14 }}>Admin</h1>

          <div className="friends-tabs" style={{ padding: 0, marginBottom: 18 }}>
            <button className={`friends-tab ${tab === 'questions' ? 'active' : ''}`} onClick={() => setTab('questions')}>
              Questions
            </button>
            <button className={`friends-tab ${tab === 'badges' ? 'active' : ''}`} onClick={() => setTab('badges')}>
              Badges
            </button>
          </div>

          {tab === 'questions' ? <QuestionsAdmin toast={toast} /> : <BadgesAdmin toast={toast} />}
        </div>
      </div>
    </div>
  );
}

function QuestionsAdmin({ toast }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [questionsByCategory, setQuestionsByCategory] = useState({});
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  const [draftByCategory, setDraftByCategory] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  async function loadCategories() {
    setLoading(true);
    try {
      const data = await api.adminCategories();
      setCategories(data.categories);
    } catch (err) {
      toast.error(err.message || 'Could not load categories.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleExpand(key) {
    if (expanded === key) {
      setExpanded(null);
      return;
    }
    setExpanded(key);
    if (!questionsByCategory[key]) {
      setLoadingQuestions(true);
      try {
        const data = await api.adminQuestionsForCategory(key);
        setQuestionsByCategory((prev) => ({ ...prev, [key]: data.questions }));
      } catch (err) {
        toast.error(err.message || 'Could not load questions.');
      } finally {
        setLoadingQuestions(false);
      }
    }
  }

  async function createCategory(e) {
    e.preventDefault();
    if (!newCatLabel.trim() || creatingCat) return;
    setCreatingCat(true);
    try {
      await api.adminCreateCategory(newCatLabel.trim(), newCatDesc.trim());
      setNewCatLabel('');
      setNewCatDesc('');
      toast.success('Category created');
      loadCategories();
    } catch (err) {
      toast.error(err.message || 'Could not create category.');
    } finally {
      setCreatingCat(false);
    }
  }

  async function deleteCategory(key) {
    try {
      await api.adminDeleteCategory(key);
      toast.show('Category deleted');
      setExpanded(null);
      loadCategories();
    } catch (err) {
      toast.error(err.message || 'Could not delete category.');
    }
  }

  async function addQuestion(key) {
    const text = (draftByCategory[key] || '').trim();
    if (!text) return;
    try {
      const res = await api.adminCreateQuestion(key, text);
      setQuestionsByCategory((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), { id: res.question.id, text: res.question.text, createdAt: Date.now() }]
      }));
      setDraftByCategory((prev) => ({ ...prev, [key]: '' }));
      loadCategories(); // refresh counts
    } catch (err) {
      toast.error(err.message || 'Could not add question.');
    }
  }

  function startEdit(q) {
    setEditingId(q.id);
    setEditingText(q.text);
  }

  async function saveEdit(key) {
    try {
      await api.adminUpdateQuestion(editingId, editingText.trim());
      setQuestionsByCategory((prev) => ({
        ...prev,
        [key]: prev[key].map((q) => (q.id === editingId ? { ...q, text: editingText.trim() } : q))
      }));
      setEditingId(null);
      toast.success('Question updated');
    } catch (err) {
      toast.error(err.message || 'Could not update question.');
    }
  }

  async function deleteQuestion(key, id) {
    try {
      await api.adminDeleteQuestion(id);
      setQuestionsByCategory((prev) => ({ ...prev, [key]: prev[key].filter((q) => q.id !== id) }));
      loadCategories(); // refresh counts
    } catch (err) {
      toast.error(err.message || 'Could not delete question.');
    }
  }

  return (
    <div>
      <form className="card" style={{ padding: 16, marginBottom: 18 }} onSubmit={createCategory}>
        <div className="drawer-section-title" style={{ marginBottom: 10 }}>New category</div>
        <div className="field">
          <input placeholder="Category name" value={newCatLabel} onChange={(e) => setNewCatLabel(e.target.value)} maxLength={40} />
        </div>
        <div className="field">
          <input placeholder="Short description (optional)" value={newCatDesc} onChange={(e) => setNewCatDesc(e.target.value)} maxLength={120} />
        </div>
        <button className="btn btn-primary btn-sm" type="submit" disabled={!newCatLabel.trim() || creatingCat}>
          {creatingCat ? <span className="inline-spinner" /> : 'Create category'}
        </button>
      </form>

      {loading ? (
        <div className="full-screen-loading" style={{ padding: '30px 0' }}>
          <span className="inline-spinner" />
        </div>
      ) : (
        categories.map((c) => (
          <div key={c.key} className="card" style={{ marginBottom: 10, overflow: 'hidden' }}>
            <button
              className="drawer-row"
              style={{ padding: '14px 16px' }}
              onClick={() => toggleExpand(c.key)}
            >
              <span>
                <strong>{c.label}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>({c.count})</span>
              </span>
              <span>{expanded === c.key ? '−' : '+'}</span>
            </button>

            {expanded === c.key && (
              <div style={{ padding: '0 16px 16px' }}>
                {loadingQuestions && !questionsByCategory[c.key] ? (
                  <span className="inline-spinner" />
                ) : (
                  <>
                    {(questionsByCategory[c.key] || []).map((q) => (
                      <div key={q.id} className="friend-row" style={{ alignItems: 'flex-start' }}>
                        {editingId === q.id ? (
                          <>
                            <textarea
                              className="answer-textarea"
                              style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8, flex: 1 }}
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              autoFocus
                            />
                            <button className="btn btn-primary btn-sm" onClick={() => saveEdit(c.key)}>
                              Save
                            </button>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: '0.86rem', flex: 1 }}>{q.text}</span>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => startEdit(q)}>
                                Edit
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => deleteQuestion(c.key, q.id)}>
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}

                    <div className="chat-input-row" style={{ padding: '10px 0 0', borderTop: 'none' }}>
                      <input
                        placeholder="Add a question..."
                        value={draftByCategory[c.key] || ''}
                        onChange={(e) => setDraftByCategory((prev) => ({ ...prev, [c.key]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && addQuestion(c.key)}
                      />
                      <button className="btn btn-primary btn-sm" onClick={() => addQuestion(c.key)}>
                        Add
                      </button>
                    </div>

                    {c.count === 0 && (
                      <button className="btn btn-ghost btn-sm" style={{ marginTop: 10, color: 'var(--error)' }} onClick={() => deleteCategory(c.key)}>
                        Delete empty category
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

const PRESET_COLORS = ['#d6336c', '#0d8f7d', '#c98a1f', '#5b5bd6', '#e24444', '#2e9e5b'];

function BadgesAdmin({ toast }) {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  const [label, setLabel] = useState('');
  const [emoji, setEmoji] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [animated, setAnimated] = useState(true);
  const [creating, setCreating] = useState(false);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  async function loadBadges() {
    setLoading(true);
    try {
      const data = await api.adminBadges();
      setBadges(data.badges);
    } catch (err) {
      toast.error(err.message || 'Could not load badges.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBadges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createBadge(e) {
    e.preventDefault();
    if (!label.trim() || !emoji.trim() || creating) return;
    setCreating(true);
    try {
      await api.adminCreateBadge(label.trim(), emoji.trim(), color, animated);
      setLabel('');
      setEmoji('');
      toast.success('Badge created');
      loadBadges();
    } catch (err) {
      toast.error(err.message || 'Could not create badge.');
    } finally {
      setCreating(false);
    }
  }

  async function deleteBadge(key) {
    try {
      await api.adminDeleteBadge(key);
      toast.show('Badge deleted');
      loadBadges();
      setResults((prev) => prev.map((r) => ({ ...r, badges: r.badges.filter((b) => b.key !== key) })));
    } catch (err) {
      toast.error(err.message || 'Could not delete badge.');
    }
  }

  async function searchUsers(q) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await api.adminSearchUsers(q.trim());
      setResults(data.results);
    } catch {
      // low-stakes
    } finally {
      setSearching(false);
    }
  }

  async function toggleUserBadge(user, badgeKey) {
    const has = user.badges.some((b) => b.key === badgeKey);
    try {
      if (has) {
        await api.adminRemoveBadge(user.id, badgeKey);
      } else {
        await api.adminAssignBadge(user.id, badgeKey);
      }
      setResults((prev) =>
        prev.map((r) =>
          r.id === user.id
            ? { ...r, badges: has ? r.badges.filter((b) => b.key !== badgeKey) : [...r.badges, badges.find((b) => b.key === badgeKey)] }
            : r
        )
      );
    } catch (err) {
      toast.error(err.message || 'Could not update badge.');
    }
  }

  return (
    <div>
      <form className="card" style={{ padding: 16, marginBottom: 18 }} onSubmit={createBadge}>
        <div className="drawer-section-title" style={{ marginBottom: 10 }}>New badge</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            placeholder="Emoji"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={4}
            style={{ width: 64, textAlign: 'center', border: '1.5px solid var(--border)', background: 'var(--bg-sunken)', borderRadius: 8, padding: '10px 0' }}
          />
          <input
            placeholder="Badge name"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={30}
            style={{ flex: 1, border: '1.5px solid var(--border)', background: 'var(--bg-sunken)', borderRadius: 8, padding: '10px 12px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: c,
                border: color === c ? '2px solid var(--text)' : '2px solid transparent',
                cursor: 'pointer'
              }}
              aria-label={`Choose color ${c}`}
            />
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', marginLeft: 8 }}>
            <input type="checkbox" checked={animated} onChange={(e) => setAnimated(e.target.checked)} />
            Animated
          </label>
        </div>
        {emoji && label && (
          <div style={{ marginBottom: 12 }}>
            <Badge badge={{ key: 'preview', label, emoji, color, animated }} /> <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>preview</span>
          </div>
        )}
        <button className="btn btn-primary btn-sm" type="submit" disabled={!label.trim() || !emoji.trim() || creating}>
          {creating ? <span className="inline-spinner" /> : 'Create badge'}
        </button>
      </form>

      <div className="card" style={{ padding: 16, marginBottom: 18 }}>
        <div className="drawer-section-title" style={{ marginBottom: 10 }}>All badges</div>
        {loading ? (
          <span className="inline-spinner" />
        ) : badges.length === 0 ? (
          <p className="friends-empty" style={{ padding: '10px 0' }}>No badges yet — create one above.</p>
        ) : (
          badges.map((b) => (
            <div key={b.key} className="friend-row">
              <span className="friend-name">
                <Badge badge={b} /> {b.label}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => deleteBadge(b.key)}>
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div className="drawer-section-title" style={{ marginBottom: 10 }}>Assign to a person</div>
        <input
          className="friends-search-input"
          placeholder="Search by name..."
          value={query}
          onChange={(e) => searchUsers(e.target.value)}
        />
        {searching && <span className="inline-spinner" />}
        {results.map((r) => (
          <div key={r.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 8 }}>{r.displayName}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {badges.map((b) => {
                const has = r.badges.some((rb) => rb.key === b.key);
                return (
                  <button
                    key={b.key}
                    className={`badge-toggle-chip ${has ? 'active' : ''}`}
                    onClick={() => toggleUserBadge(r, b.key)}
                  >
                    {b.emoji} {b.label}
                  </button>
                );
              })}
              {badges.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Create a badge first.</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

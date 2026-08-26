import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function FriendsPanel({ open, onClose }) {
  const toast = useToast();
  const { clearRequestBadge } = useAuth();
  const [tab, setTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const loadFriends = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.friends();
      setFriends(data.friends);
      setIncoming(data.incoming);
      setOutgoing(data.outgoing);
    } catch (err) {
      toast.error(err.message || 'Could not load friends.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    loadFriends();
    clearRequestBadge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return undefined;
    }
    setSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.searchUsers(query.trim());
        setResults(data.results);
      } catch {
        // search is low-stakes — fail silently, they can just retry
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  async function sendRequest(userId) {
    try {
      const res = await api.sendFriendRequest(userId);
      setResults((prev) =>
        prev.map((r) => (r.id === userId ? { ...r, status: res.status === 'friends' ? 'friends' : 'pending_outgoing' } : r))
      );
      if (res.status === 'friends') {
        toast.success('You are now friends');
        loadFriends();
      } else {
        toast.show('Friend request sent');
      }
    } catch (err) {
      toast.error(err.message || 'Could not send that request.');
    }
  }

  async function accept(requestId) {
    try {
      await api.acceptFriendRequest(requestId);
      toast.success('Friend added');
      loadFriends();
    } catch (err) {
      toast.error(err.message || 'Could not accept that request.');
    }
  }

  async function decline(requestId) {
    try {
      await api.declineFriendRequest(requestId);
      loadFriends();
    } catch (err) {
      toast.error(err.message || 'Could not decline that request.');
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer-panel" role="dialog" aria-label="Friends">
        <div className="drawer-header">
          <h3>Friends</h3>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="friends-tabs">
          <button className={`friends-tab ${tab === 'friends' ? 'active' : ''}`} onClick={() => setTab('friends')}>
            Friends{friends.length > 0 ? ` (${friends.length})` : ''}
          </button>
          <button className={`friends-tab ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>
            Requests
            {incoming.length > 0 && <span className="tab-badge">{incoming.length}</span>}
          </button>
          <button className={`friends-tab ${tab === 'add' ? 'active' : ''}`} onClick={() => setTab('add')}>
            Add
          </button>
        </div>

        <div className="friends-body">
          {loading ? (
            <div className="full-screen-loading" style={{ padding: '30px 0' }}>
              <span className="inline-spinner" />
            </div>
          ) : tab === 'friends' ? (
            friends.length === 0 ? (
              <div className="friends-empty">No friends yet — add one from the Add tab.</div>
            ) : (
              friends.map((f) => (
                <div key={f.id} className="friend-row">
                  <span className="friend-name">{f.displayName}</span>
                </div>
              ))
            )
          ) : tab === 'requests' ? (
            <>
              {incoming.length === 0 && outgoing.length === 0 && <div className="friends-empty">No pending requests.</div>}
              {incoming.map((r) => (
                <div key={r.id} className="friend-row">
                  <span className="friend-name">{r.from.displayName}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => decline(r.id)}>
                      Decline
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => accept(r.id)}>
                      Accept
                    </button>
                  </div>
                </div>
              ))}
              {outgoing.map((r) => (
                <div key={r.id} className="friend-row">
                  <span className="friend-name">{r.to.displayName}</span>
                  <span className="friend-status-pill">Requested</span>
                </div>
              ))}
            </>
          ) : (
            <>
              <input
                className="friends-search-input"
                placeholder="Search by name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              {searching && (
                <div style={{ padding: '10px 0' }}>
                  <span className="inline-spinner" />
                </div>
              )}
              {results.map((r) => (
                <div key={r.id} className="friend-row">
                  <span className="friend-name">{r.displayName}</span>
                  {r.status === 'friends' ? (
                    <span className="friend-status-pill">Friends</span>
                  ) : r.status === 'pending_outgoing' ? (
                    <span className="friend-status-pill">Requested</span>
                  ) : r.status === 'pending_incoming' ? (
                    <span className="friend-status-pill">Check Requests</span>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={() => sendRequest(r.id)}>
                      Add
                    </button>
                  )}
                </div>
              ))}
              {query.trim().length >= 2 && !searching && results.length === 0 && (
                <div className="friends-empty">No one found with that name.</div>
              )}
              {query.trim().length > 0 && query.trim().length < 2 && (
                <div className="friends-empty">Keep typing — at least 2 characters.</div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

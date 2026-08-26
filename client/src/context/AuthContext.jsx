import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from '../api.js';
import { connectSocket, disconnectSocket } from '../socket.js';
import { useToast } from './ToastContext.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeRoom, setActiveRoom] = useState(null);
  const [pendingInvite, setPendingInvite] = useState(null);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [status, setStatus] = useState('checking'); // checking | authed | anonymous
  const toast = useToast();

  const refreshSession = useCallback(async () => {
    if (!getToken()) {
      setStatus('anonymous');
      return;
    }
    try {
      const data = await api.me();
      setUser(data.user);
      setActiveRoom(data.activeRoom || null);
      setPendingInvite(data.pendingInvite || null);
      setPendingRequestCount(data.pendingRequestCount || 0);
      setStatus('authed');
    } catch {
      setToken(null);
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // A live socket connection for the whole authenticated session, not just
  // while inside a game — this is what lets a friend request or game invite
  // reach someone in real time no matter which screen they're on.
  useEffect(() => {
    if (status !== 'authed') return;
    const socket = connectSocket();

    const onInvite = ({ roomCode, fromName }) => {
      setPendingInvite({ roomCode, fromName });
      toast.show(`${fromName} invited you to a game`);
    };
    const onRequestReceived = () => {
      setPendingRequestCount((c) => c + 1);
      toast.show('New friend request');
    };
    const onRequestAccepted = ({ by }) => {
      toast.success(`${by.displayName} accepted your friend request`);
    };

    socket.on('game-invite', onInvite);
    socket.on('friend-request-received', onRequestReceived);
    socket.on('friend-request-accepted', onRequestAccepted);

    return () => {
      socket.off('game-invite', onInvite);
      socket.off('friend-request-received', onRequestReceived);
      socket.off('friend-request-accepted', onRequestAccepted);
    };
    // toast's functions are stable in practice (they all route through a
    // useCallback'd push internally) even though the object wrapping them
    // is recreated each render — omitting it avoids re-subscribing on every
    // single toast shown anywhere in the app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const login = useCallback(async (email, password) => {
    const data = await api.login({ email, password });
    setToken(data.token);
    setUser(data.user);
    setStatus('authed');
    const me = await api.me();
    setActiveRoom(me.activeRoom || null);
    setPendingInvite(me.pendingInvite || null);
    setPendingRequestCount(me.pendingRequestCount || 0);
    return data.user;
  }, []);

  const signup = useCallback(async (displayName, email, password) => {
    const data = await api.signup({ displayName, email, password });
    setToken(data.token);
    setUser(data.user);
    setActiveRoom(null);
    setPendingInvite(null);
    setPendingRequestCount(0);
    setStatus('authed');
    return data.user;
  }, []);

  const logout = useCallback(() => {
    disconnectSocket();
    setToken(null);
    setUser(null);
    setActiveRoom(null);
    setPendingInvite(null);
    setPendingRequestCount(0);
    setStatus('anonymous');
  }, []);

  const updateDisplayName = useCallback(async (displayName) => {
    const data = await api.updateDisplayName(displayName);
    setUser(data.user);
    return data.user;
  }, []);

  const clearActiveRoom = useCallback(() => setActiveRoom(null), []);
  const dismissInvite = useCallback(() => setPendingInvite(null), []);
  const clearRequestBadge = useCallback(() => setPendingRequestCount(0), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        activeRoom,
        pendingInvite,
        pendingRequestCount,
        login,
        signup,
        logout,
        updateDisplayName,
        refreshSession,
        clearActiveRoom,
        dismissInvite,
        clearRequestBadge
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

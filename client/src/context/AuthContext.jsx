import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeRoom, setActiveRoom] = useState(null);
  const [status, setStatus] = useState('checking'); // checking | authed | anonymous

  const refreshSession = useCallback(async () => {
    if (!getToken()) {
      setStatus('anonymous');
      return;
    }
    try {
      const data = await api.me();
      setUser(data.user);
      setActiveRoom(data.activeRoom || null);
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

  const login = useCallback(async (email, password) => {
    const data = await api.login({ email, password });
    setToken(data.token);
    setUser(data.user);
    setStatus('authed');
    const me = await api.me();
    setActiveRoom(me.activeRoom || null);
    return data.user;
  }, []);

  const signup = useCallback(async (displayName, email, password) => {
    const data = await api.signup({ displayName, email, password });
    setToken(data.token);
    setUser(data.user);
    setActiveRoom(null);
    setStatus('authed');
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setActiveRoom(null);
    setStatus('anonymous');
  }, []);

  const updateDisplayName = useCallback(async (displayName) => {
    const data = await api.updateDisplayName(displayName);
    setUser(data.user);
    return data.user;
  }, []);

  const clearActiveRoom = useCallback(() => setActiveRoom(null), []);

  return (
    <AuthContext.Provider
      value={{ user, status, activeRoom, login, signup, logout, updateDisplayName, refreshSession, clearActiveRoom }}
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

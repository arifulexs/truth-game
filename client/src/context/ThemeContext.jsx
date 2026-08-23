import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const THEME_KEY = 'truth-game:theme';
const ThemeContext = createContext(null);

function resolveTheme(preference) {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return preference;
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(() => localStorage.getItem(THEME_KEY) || 'system');
  const [resolved, setResolved] = useState(() => resolveTheme(preference));

  useEffect(() => {
    const applied = resolveTheme(preference);
    setResolved(applied);
    document.documentElement.setAttribute('data-theme', applied);
    localStorage.setItem(THEME_KEY, preference);
  }, [preference]);

  useEffect(() => {
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const applied = mq.matches ? 'dark' : 'light';
      setResolved(applied);
      document.documentElement.setAttribute('data-theme', applied);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  const setThemePreference = useCallback((value) => setPreference(value), []);

  return (
    <ThemeContext.Provider value={{ preference, resolved, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

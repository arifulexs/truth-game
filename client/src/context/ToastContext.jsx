import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, type = 'default', durationMs = 3800) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => dismiss(id), durationMs);
      return id;
    },
    [dismiss]
  );

  const toast = {
    show: (msg) => push(msg, 'default'),
    error: (msg) => push(msg, 'error'),
    success: (msg) => push(msg, 'success')
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

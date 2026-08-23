import { Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

export default function RequireAuth({ children }) {
  const { status } = useAuth();

  if (status === 'checking') {
    return (
      <div className="full-screen-loading" style={{ minHeight: '100vh' }}>
        <span className="inline-spinner" />
      </div>
    );
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace />;
  }
  return children;
}

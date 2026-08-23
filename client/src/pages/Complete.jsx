import { useNavigate, useParams } from 'react-router-dom';
import Confetti from '../components/Confetti.jsx';

export default function Complete() {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <Confetti />
      <div className="centered-screen">
        <div className="card complete-wrap" style={{ padding: '40px 28px' }}>
          <div className="complete-badge">🎉</div>
          <h1>Truth Session Complete</h1>
          <p className="sub">
            20 / 20 questions completed
            {roomCode ? ` · room ${roomCode}` : ''}
          </p>
          <div className="complete-actions">
            <button className="btn btn-primary btn-block" onClick={() => navigate('/create')}>
              Play again
            </button>
            <button className="btn btn-secondary btn-block" onClick={() => navigate('/')}>
              Return home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

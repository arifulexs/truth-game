export default function TopBar({ onMenuClick }) {
  return (
    <div className="top-bar">
      <span className="app-name">
        Truth<span className="dot">.</span>
      </span>
      <button className="icon-button" onClick={onMenuClick} aria-label="Open menu">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M2.5 5H17.5M2.5 10H17.5M2.5 15H17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

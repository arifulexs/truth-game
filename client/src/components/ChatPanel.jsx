import { useEffect, useRef, useState } from 'react';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function ChatPanel({ messages, youSlot, onSend, disabled }) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  async function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    try {
      await onSend(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card chat-card">
      <div className="chat-header">Chat</div>

      <div className="chat-messages" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="chat-empty">Say hi — chat stays open for the whole game.</div>
        ) : (
          messages.map((m) => {
            const mine = m.senderSlot === youSlot;
            return (
              <div key={m.id} className={`chat-bubble-row ${mine ? 'mine' : 'theirs'}`}>
                <span className="chat-sender">{mine ? 'You' : m.senderName}</span>
                <div className="chat-bubble">{m.message}</div>
                <span className="chat-timestamp">{formatTime(m.createdAt)}</span>
              </div>
            );
          })
        )}
      </div>

      <form className="chat-input-row" onSubmit={handleSend}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          maxLength={1000}
          disabled={disabled}
          aria-label="Chat message"
        />
        <button className="chat-send-btn" type="submit" disabled={disabled || !draft.trim()} aria-label="Send message">
          ➤
        </button>
      </form>
    </div>
  );
}

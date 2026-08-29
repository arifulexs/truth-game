import { useEffect, useRef, useState } from 'react';
import BadgeRow from './Badge.jsx';

const GROUP_WINDOW_MS = 3 * 60 * 1000; // messages this close together, same sender, don't repeat the name/time
const NEAR_BOTTOM_PX = 80;

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function isGrouped(curr, prev) {
  if (!prev) return false;
  if (curr.senderSlot !== prev.senderSlot) return false;
  return curr.createdAt - prev.createdAt < GROUP_WINDOW_MS;
}

export default function ChatPanel({ messages, youSlot, onSend, disabled }) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const nearBottomRef = useRef(true);
  const prevLenRef = useRef(messages.length);

  function scrollToBottom(behavior = 'auto') {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    setNewCount(0);
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    if (nearBottomRef.current) setNewCount(0);
  }

  useEffect(() => {
    const grew = messages.length > prevLenRef.current;
    prevLenRef.current = messages.length;
    if (!grew) return;
    if (nearBottomRef.current) {
      scrollToBottom();
    } else {
      setNewCount((c) => c + 1);
    }
  }, [messages.length]);

  // First mount: land at the bottom with no animation.
  useEffect(() => {
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      inputRef.current?.focus();
    }
  }

  return (
    <div className="card chat-card">
      <div className="chat-header">Chat</div>

      <div className="chat-messages-wrap">
        <div className="chat-messages" ref={scrollRef} onScroll={handleScroll}>
          {messages.length === 0 ? (
            <div className="chat-empty">Say hi — chat stays open for the whole game.</div>
          ) : (
            messages.map((m, i) => {
              const mine = m.senderSlot === youSlot;
              const grouped = isGrouped(m, messages[i - 1]);
              return (
                <div key={m.id} className={`chat-bubble-row ${mine ? 'mine' : 'theirs'} ${grouped ? 'grouped' : ''}`}>
                  {!grouped && (
                    <span className="chat-sender">
                      {mine ? 'You' : m.senderName}
                      <BadgeRow badges={m.senderBadges} />
                    </span>
                  )}
                  <div className="chat-bubble">{m.message}</div>
                  {!grouped && <span className="chat-timestamp">{formatTime(m.createdAt)}</span>}
                </div>
              );
            })
          )}
        </div>

        {newCount > 0 && (
          <button className="chat-jump-pill" onClick={() => scrollToBottom('smooth')}>
            {newCount} new message{newCount > 1 ? 's' : ''} ↓
          </button>
        )}
      </div>

      <form className="chat-input-row" onSubmit={handleSend}>
        <input
          ref={inputRef}
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

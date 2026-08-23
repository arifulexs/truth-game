import { useState } from 'react';

export default function AnswerCard({ mine, name, submitted, answerText, revealed, onSubmit, disabled }) {
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!draft.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(draft.trim());
    } finally {
      setSubmitting(false);
    }
  }

  const tagClass = mine ? 'you-tag' : 'friend-tag';
  const tagLabel = mine ? 'You' : name;

  return (
    <div className="answer-card">
      <div className={`answer-card-inner ${revealed ? 'flipped' : ''}`}>
        <div className="answer-face front">
          <div className={`answer-owner ${tagClass}`}>
            <span className="swatch" />
            {tagLabel}
          </div>

          {mine ? (
            submitted ? (
              <div className="answer-submitted-state">
                <span className="check">✓</span>
                <span>Answer submitted</span>
                <span style={{ fontSize: '0.78rem' }}>Waiting for your friend...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <textarea
                  className="answer-textarea"
                  placeholder="Write your answer..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={2000}
                  disabled={disabled || submitting}
                  autoFocus
                />
                <button
                  className="btn btn-primary btn-sm"
                  type="submit"
                  style={{ marginTop: 10 }}
                  disabled={disabled || submitting || !draft.trim()}
                >
                  {submitting ? <span className="inline-spinner" /> : 'Submit answer'}
                </button>
              </form>
            )
          ) : submitted ? (
            <div className="answer-submitted-state">
              <span className="check">✓</span>
              <span>{name} has answered</span>
            </div>
          ) : (
            <div className="answer-submitted-state">
              <span>
                Waiting for {name}
                <span className="waiting-dots">
                  <span />
                  <span />
                  <span />
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="answer-face back">
          <div className={`answer-owner ${tagClass}`}>
            <span className="swatch" />
            {tagLabel}
          </div>
          <div className="answer-revealed-text">{answerText}</div>
        </div>
      </div>
    </div>
  );
}

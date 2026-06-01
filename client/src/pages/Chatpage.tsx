import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../api/axios';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

const SUGGESTIONS = [
  'Explain the key concepts of this topic simply',
  'What are the most common exam questions on this?',
  'Give me a quick summary with bullet points',
  'What is the difference between X and Y?',
  'Create a short quiz for me on this topic',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.get('/chat/history')
      .then(r => setMessages(r.data.messages || []))
      .catch(() => setMessages([]))
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setInput('');
    setError('');

    const userMsg: Message = { id: Date.now(), role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.post('/chat', { message: msg });
      const assistantMsg: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: res.data.reply,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to get a response. Please try again.');
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearHistory = async () => {
    if (!confirm('Clear all chat history?')) return;
    await api.delete('/chat/history');
    setMessages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  const isEmpty = messages.length === 0 && !historyLoading;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1rem 1.75rem', borderBottom: '1px solid var(--line)', background: 'var(--ink2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--violet), var(--sage))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🤖</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>AI Study Assistant</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--sage)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sage)', display: 'inline-block' }} />
              Powered by Gemini
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearHistory} style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--text3)', fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderRadius: 7, cursor: 'pointer', transition: 'all 0.15s' }}>
            Clear history
          </button>
        )}
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 0' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 1.5rem' }}>
          {historyLoading && (
            <div className="loading-state">
              <div className="spinner" />
              <span>Loading chat history...</span>
            </div>
          )}

          {isEmpty && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(74,222,154,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1.25rem' }}>🤖</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Ask me anything</div>
              <div style={{ color: 'var(--text3)', fontSize: '0.87rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                I can explain concepts, answer exam questions,<br />create quizzes, and help you study smarter.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => sendMessage(s)} style={{ background: 'var(--ink3)', border: '1px solid var(--line)', color: 'var(--text2)', fontSize: '0.8rem', padding: '0.5rem 1rem', borderRadius: 20, cursor: 'pointer', transition: 'all 0.15s' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={msg.id ?? i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '1.25rem', gap: '0.65rem', alignItems: 'flex-start' }}>
              {msg.role === 'assistant' && (
                <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: 'linear-gradient(135deg, var(--violet), var(--sage))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', marginTop: 2 }}>🤖</div>
              )}
              <div style={{
                maxWidth: '78%',
                padding: msg.role === 'user' ? '0.65rem 1rem' : '0.85rem 1.1rem',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                background: msg.role === 'user' ? 'linear-gradient(135deg, var(--violet), rgba(139,92,246,0.7))' : 'var(--ink3)',
                border: msg.role === 'assistant' ? '1px solid var(--line)' : 'none',
                color: 'var(--text)',
                fontSize: '0.9rem',
                lineHeight: 1.65,
              }}>
                {msg.role === 'user' ? (
                  <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>
                ) : (
                  <div className="notes-content">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: 'linear-gradient(135deg, var(--violet), var(--sage))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>🤖</div>
              <div style={{ padding: '0.85rem 1.1rem', borderRadius: '4px 18px 18px 18px', background: 'var(--ink3)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text3)', display: 'inline-block', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}

          {error && <div className="alert alert-error" style={{ maxWidth: 500 }}>{error}</div>}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div style={{ borderTop: '1px solid var(--line)', background: 'var(--ink2)', padding: '1rem 1.5rem', flexShrink: 0 }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {messages.length > 0 && messages.length < 6 && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {SUGGESTIONS.slice(0, 3).map(s => (
                <button key={s} onClick={() => sendMessage(s)} disabled={loading} style={{ background: 'var(--ink3)', border: '1px solid var(--line)', color: 'var(--text3)', fontSize: '0.74rem', padding: '0.3rem 0.7rem', borderRadius: 20, cursor: 'pointer', transition: 'all 0.15s', opacity: loading ? 0.5 : 1 }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 14, padding: '0.5rem 0.5rem 0.5rem 1rem', transition: 'border-color 0.15s' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your studies... (Enter to send, Shift+Enter for newline)"
              disabled={loading}
              rows={1}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '0.9rem', lineHeight: 1.5, resize: 'none', fontFamily: 'inherit', padding: '0.35rem 0', maxHeight: 160, overflowY: 'auto' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                width: 38, height: 38, borderRadius: 10, border: 'none',
                background: input.trim() && !loading ? 'linear-gradient(135deg, var(--violet), var(--sage))' : 'var(--ink2)',
                color: input.trim() && !loading ? '#fff' : 'var(--text3)',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0, transition: 'all 0.15s'
              }}
            >
              {loading ? (
                <div style={{ width: 16, height: 16, border: '2px solid var(--text3)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              ) : '↑'}
            </button>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginTop: '0.4rem', textAlign: 'center' }}>
            AI can make mistakes. Verify important information.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
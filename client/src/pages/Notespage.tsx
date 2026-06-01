import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import api from '../api/axios';

export default function NotesPage() {
  const { id } = useParams();
  const [syllabus, setSyllabus] = useState<any>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [notes, setNotes] = useState<any>(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/syllabi/${id}`).then(r => {
      setSyllabus(r.data.syllabus);
      setTopics(r.data.topics);
      if (r.data.topics.length > 0) setSelectedTopic(r.data.topics[0]);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!selectedTopic) return;
    setNotesLoading(true); setNotes(null);
    api.get(`/topics/${selectedTopic.id}/notes`)
      .then(r => setNotes(r.data.notes))
      .catch(() => setNotes(null))
      .finally(() => setNotesLoading(false));
  }, [selectedTopic]);

  const toggleComplete = async (topic: any) => {
    await api.put(`/topics/${topic.id}/complete`, { completed: !topic.is_completed });
    setTopics(prev => prev.map(t => t.id === topic.id ? { ...t, is_completed: !t.is_completed } : t));
  };

  // Group topics by unit
  const units = topics.reduce((acc: any, t) => {
    const key = `Unit ${t.unit_number}: ${t.unit_title || 'Topics'}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const completed = topics.filter(t => t.is_completed).length;
  const progress = topics.length ? Math.round((completed / topics.length) * 100) : 0;

  if (loading) return <div className="loading-state"><div className="spinner" /></div>;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Topics sidebar */}
      <div style={{ width: 280, minWidth: 280, background: 'var(--ink2)', borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <Link to="/syllabi" style={{ color: 'var(--text3)', fontSize: '0.78rem', textDecoration: 'none' }}>← Back</Link>
          <div style={{ fontWeight: 700, marginTop: '0.4rem', fontSize: '0.95rem' }}>{syllabus?.title}</div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
            <div className="progress-bar" style={{ flex: 1 }}>
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text3)', flexShrink: 0 }}>{progress}%</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
          {Object.entries(units).map(([unitKey, unitTopics]: any) => (
            <div key={unitKey} style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', padding: '0 0.5rem', marginBottom: '0.4rem' }}>
                {unitKey}
              </div>
              {unitTopics.map((t: any) => (
                <div
                  key={t.id}
                  className={`topic-item ${selectedTopic?.id === t.id ? 'active' : ''} ${t.is_completed ? 'completed' : ''}`}
                  onClick={() => setSelectedTopic(t)}
                >
                  <div
                    className={`topic-check ${t.is_completed ? 'done' : ''}`}
                    onClick={e => { e.stopPropagation(); toggleComplete(t); }}
                  >
                    {t.is_completed ? '✓' : ''}
                  </div>
                  <span className="topic-name">{t.topic_name}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Notes viewer */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {selectedTopic ? (
          <>
            <div style={{ padding: '1rem 1.75rem', borderBottom: '1px solid var(--line)', background: 'var(--ink2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedTopic.topic_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.1rem' }}>{selectedTopic.unit_title}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link to={`/syllabi/${id}/questions?topic=${selectedTopic.id}`} className="btn btn-secondary btn-sm">❓ Questions</Link>
                <Link to={`/syllabi/${id}/mcqs?topic=${selectedTopic.id}`} className="btn btn-secondary btn-sm">🎯 MCQs</Link>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.75rem 2rem' }}>
              {notesLoading ? (
                <div className="loading-state"><div className="spinner" /><span>Loading notes...</span></div>
              ) : notes ? (
                <div>
                  {/* Key points */}
                  {notes.key_points && (
                    <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'rgba(74,222,154,0.2)', background: 'var(--sage-dim)' }}>
                      <div style={{ fontWeight: 700, color: 'var(--sage)', marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📌 Key Points</div>
                      <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {(typeof notes.key_points === 'string' ? JSON.parse(notes.key_points) : notes.key_points).map((p: string, i: number) => (
                          <li key={i} style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.5 }}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Summary */}
                  {notes.summary && (
                    <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '3px solid var(--amber)', background: 'var(--amber-dim)' }}>
                      <div style={{ fontWeight: 700, color: 'var(--amber)', marginBottom: '0.5rem', fontSize: '0.82rem', textTransform: 'uppercase' }}>Summary</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.6 }}>{notes.summary}</div>
                    </div>
                  )}
                  {/* Full notes */}
                  <div className="notes-content">
                    <ReactMarkdown>{notes.content}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">⏳</div>
                  <div>Notes are still being generated for this topic.</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text3)' }}>Please wait a few minutes and refresh.</div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📖</div>
            <div>Select a topic to view notes</div>
          </div>
        )}
      </div>
    </div>
  );
}
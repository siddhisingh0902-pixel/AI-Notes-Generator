import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';

const TYPES = ['all', 'important', 'viva', 'short', 'long'];
const DIFF_COLOR: any = { easy: 'badge-green', medium: 'badge-amber', hard: 'badge-red' };

export default function QuestionsPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [syllabus, setSyllabus] = useState<any>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/syllabi/${id}`).then(r => {
      setSyllabus(r.data.syllabus);
      setTopics(r.data.topics);
      const paramTopic = searchParams.get('topic');
      const first = paramTopic ? r.data.topics.find((t: any) => t.id === parseInt(paramTopic)) : r.data.topics[0];
      if (first) setSelectedTopic(first);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!selectedTopic) return;
    const q = filter !== 'all' ? `?type=${filter}` : '';
    api.get(`/topics/${selectedTopic.id}/questions${q}`).then(r => setQuestions(r.data.questions));
  }, [selectedTopic, filter]);

  const toggleReveal = (qId: number) => {
    setRevealed(prev => { const n = new Set(prev); n.has(qId) ? n.delete(qId) : n.add(qId); return n; });
  };

  if (loading) return <div className="loading-state"><div className="spinner" /></div>;

  const units = topics.reduce((acc: any, t) => {
    const key = t.unit_title || `Unit ${t.unit_number}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Topics sidebar */}
      <div style={{ width: 260, minWidth: 260, background: 'var(--ink2)', borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <Link to="/syllabi" style={{ color: 'var(--text3)', fontSize: '0.78rem', textDecoration: 'none' }}>← Back</Link>
          <div style={{ fontWeight: 700, marginTop: '0.4rem', fontSize: '0.9rem' }}>{syllabus?.title}</div>
          <div style={{ color: 'var(--sage)', fontSize: '0.8rem', marginTop: '0.2rem' }}>Questions</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
          {Object.entries(units).map(([unitKey, unitTopics]: any) => (
            <div key={unitKey} style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', padding: '0 0.5rem', marginBottom: '0.4rem' }}>{unitKey}</div>
              {unitTopics.map((t: any) => (
                <div key={t.id} className={`topic-item ${selectedTopic?.id === t.id ? 'active' : ''}`} onClick={() => setSelectedTopic(t)}>
                  <span className="topic-name">{t.topic_name}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Questions */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem 1.75rem', borderBottom: '1px solid var(--line)', background: 'var(--ink2)', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, marginBottom: '0.75rem' }}>{selectedTopic?.topic_name}</div>
          <div className="tabs" style={{ marginBottom: 0 }}>
            {TYPES.map(t => (
              <button key={t} className={`tab ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1.75rem' }}>
          {questions.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">❓</div><div>No questions yet for this topic.</div></div>
          ) : (
            questions.map((q, i) => (
              <div key={q.id} className="question-card">
                <div className="question-meta">
                  <span style={{ color: 'var(--text3)', fontSize: '0.75rem', fontFamily: 'IBM Plex Mono', fontWeight: 500 }}>Q{i + 1}</span>
                  <span className={`badge ${q.type === 'important' ? 'badge-amber' : q.type === 'viva' ? 'badge-violet' : q.type === 'long' ? 'badge-blue' : 'badge-green'}`}>
                    {q.type}
                  </span>
                  <span className={`badge ${DIFF_COLOR[q.difficulty]}`}>{q.difficulty}</span>
                </div>
                <div className="question-text">{q.question_text}</div>
                {q.answer && (
                  <>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ marginTop: '0.5rem' }}
                      onClick={() => toggleReveal(q.id)}
                    >
                      {revealed.has(q.id) ? '▲ Hide Answer' : '▼ Show Answer'}
                    </button>
                    <div className={`question-answer ${revealed.has(q.id) ? 'visible' : ''}`}>
                      {q.answer}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
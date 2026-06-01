import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';

export default function MCQPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [syllabus, setSyllabus] = useState<any>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [mcqs, setMcqs] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/syllabi/${id}`).then(r => {
      setSyllabus(r.data.syllabus);
      setTopics(r.data.topics);
      const paramTopic = searchParams.get('topic');
      const first = paramTopic ? r.data.topics.find((t: any) => t.id === parseInt(paramTopic)) : r.data.topics[0];
      if (first) setSelectedTopic(first);
    }).finally(() => setLoading(false));
  }, [id, searchParams]);

  useEffect(() => {
    if (!selectedTopic) return;
    setAnswers({}); setChecked(false);
    api.get(`/topics/${selectedTopic.id}/mcqs`).then(r => setMcqs(r.data.mcqs));
  }, [selectedTopic]);

  const selectAnswer = (mcqId: number, opt: string) => {
    if (checked) return;
    setAnswers(prev => ({ ...prev, [mcqId]: opt }));
  };

  // Fixed line: Uses uppercase matching variables cleanly against the database schema
  const score = checked ? mcqs.filter(m => answers[m.id] === m.correct_option).length : 0;

  const optionClass = (mcq: any, opt: string) => {
    if (!checked) return answers[mcq.id] === opt ? 'selected' : '';
    if (opt === mcq.correct_option) return 'correct';
    if (answers[mcq.id] === opt && opt !== mcq.correct_option) return 'wrong';
    return '';
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
      <div style={{ width: 260, minWidth: 260, background: 'var(--ink2)', borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <Link to="/syllabi" style={{ color: 'var(--text3)', fontSize: '0.78rem', textDecoration: 'none' }}>← Back</Link>
          <div style={{ fontWeight: 700, marginTop: '0.4rem', fontSize: '0.9rem' }}>{syllabus?.title}</div>
          <div style={{ color: 'var(--violet)', fontSize: '0.8rem', marginTop: '0.2rem' }}>MCQ Practice</div>
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

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem 1.75rem', borderBottom: '1px solid var(--line)', background: 'var(--ink2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700 }}>{selectedTopic?.topic_name}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text3)', marginTop: '0.1rem' }}>{mcqs.length} MCQs</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {checked && (
              <div style={{ fontWeight: 700, color: score / mcqs.length >= 0.6 ? 'var(--sage)' : 'var(--coral)', fontSize: '1rem' }}>
                {score}/{mcqs.length} ({Math.round((score / mcqs.length) * 100)}%)
              </div>
            )}
            {!checked ? (
              <button className="btn btn-primary btn-sm" onClick={() => setChecked(true)} disabled={Object.keys(answers).length === 0}>
                Check Answers
              </button>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={() => { setAnswers({}); setChecked(false); }}>
                Reset
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1.75rem' }}>
          {mcqs.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🎯</div><div>No MCQs yet for this topic.</div></div>
          ) : (
            mcqs.map((m, i) => (
              <div key={m.id} className="mcq-card">
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text3)', fontSize: '0.78rem', fontFamily: 'IBM Plex Mono', fontWeight: 500, flexShrink: 0 }}>Q{i + 1}</span>
                  <span style={{ fontWeight: 500, fontSize: '0.9rem', lineHeight: 1.5 }}>{m.question_text}</span>
                </div>
                <div className="mcq-options">
                  {(['A', 'B', 'C', 'D'] as const).map(opt => (
                    <div
                      key={opt}
                      className={`mcq-option ${optionClass(m, opt)}`}
                      onClick={() => selectAnswer(m.id, opt)}
                    >
                      <div className="mcq-opt-letter">{opt}</div>
                      <span>{m[`option_${opt.toLowerCase()}`]}</span>
                    </div>
                  ))}
                </div>
                {checked && m.explanation && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--ink3)', borderRadius: 8, borderLeft: '3px solid var(--sage)', fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.5 }}>
                    💡 {m.explanation}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
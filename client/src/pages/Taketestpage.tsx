import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';

export default function TakeTestPage() {
  const { id } = useParams();

  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.get(`/tests/${id}`).then(r => {
      const t = r.data.test;
      const qs = r.data.questions || [];
      setTest(t);
      setQuestions(qs);
      if (t.completed_at) {
        setSubmitted(true);
        setResult(r.data.result || { score: t.score, percentage: t.percentage });
        if (r.data.answers) setAnswers(r.data.answers);
      } else {
        const elapsed = t.started_at ? Math.floor((Date.now() - new Date(t.started_at).getTime()) / 1000) : 0;
        const total = (t.time_limit || 30) * 60;
        setTimeLeft(Math.max(0, total - elapsed));
        if (!t.started_at) api.put(`/tests/${id}/start`);
      }
    }).finally(() => setLoading(false));
  }, [id]);

  const submitTest = useCallback(async (_auto = false) => {
    if (submitting || submitted) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/tests/${id}/submit`, { answers });
      setResult(res.data.result);
      setSubmitted(true);
      if (timerRef.current) clearInterval(timerRef.current);
    } catch (e) {
      console.error(e);
    } finally { setSubmitting(false); }
  }, [id, answers, submitting, submitted]);

  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft <= 0) { submitTest(true); return; }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) { submitTest(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft, submitted, submitTest]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const q = questions[current];
  const scoreColor = (pct: number) => pct >= 75 ? 'var(--sage)' : pct >= 50 ? 'var(--amber)' : 'var(--coral)';

  const optionClass = (opt: string) => {
    if (!submitted) return answers[q?.id] === opt ? 'selected' : '';
    if (opt === q?.correct_option) return 'correct';
    if (answers[q?.id] === opt && opt !== q?.correct_option) return 'wrong';
    return '';
  };

  if (loading) return <div className="loading-state"><div className="spinner" /><span>Loading test...</span></div>;
  if (!test) return <div className="loading-state"><span>Test not found.</span></div>;

  // ==========================================
  // RESULTS / REVIEW VIEW (SUBMIT KRNE KE BAAD)
  // ==========================================
  if (submitted && result) {
    const pct = Math.round(result.percentage || (result.score / questions.length) * 100);
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">Test Results</div>
            <div className="page-subtitle">{test.title}</div>
          </div>
          <Link to="/tests" className="btn btn-secondary">← Back to Tests</Link>
        </div>
        <div className="p-page">
          {/* Score card */}
          <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '2.5rem' }}>
            <div style={{ fontSize: '4rem', fontWeight: 800, color: scoreColor(pct), lineHeight: 1 }}>{pct}%</div>
            <div style={{ fontSize: '1.1rem', color: 'var(--text2)', margin: '0.5rem 0' }}>
              {result.score} / {questions.length} correct
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text3)' }}>
              {pct >= 75 ? '🎉 Great job!' : pct >= 50 ? '👍 Good effort!' : '📚 Keep practising!'}
            </div>
          </div>

          <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem' }}>Question Review</div>
          {questions.map((qs, i) => {
            const questionId = Number(qs.id);
            const userAns = answers[questionId];
            const isCorrect = userAns && String(userAns).toUpperCase() === String(qs.correct_option).toUpperCase();
            
            return (
              <div key={qs.id} className="mcq-card" style={{ borderLeft: `3px solid ${isCorrect ? 'var(--sage)' : 'var(--coral)'}`, marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text3)', fontSize: '0.78rem', fontFamily: 'IBM Plex Mono', fontWeight: 500, flexShrink: 0 }}>Q{i + 1}</span>
                  <span style={{ fontWeight: 500, fontSize: '0.9rem', lineHeight: 1.5 }}>{qs.question_text}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.95rem', fontWeight: 'bold', color: isCorrect ? 'var(--sage)' : 'var(--coral)' }}>
                    {isCorrect ? '✅ Right' : '❌ Wrong'}
                  </span>
                </div>

                <div className="mcq-options">
                  {(['A', 'B', 'C', 'D'] as const).map(opt => {
                    let cls = '';
                    let indicator = null;

                    if (opt === qs.correct_option) {
                      cls = 'correct';
                      if (userAns === opt) {
                        indicator = <span style={{ marginLeft: 'auto', color: '#4ade9a', fontSize: '0.8rem', fontWeight: 'bold' }}>✅ Your Answer (Correct)</span>;
                      } else {
                        indicator = <span style={{ marginLeft: 'auto', color: '#4ade9a', fontSize: '0.8rem', fontWeight: 'bold' }}>✨ Correct Option</span>;
                      }
                    } else if (userAns === opt) {
                      cls = 'wrong';
                      indicator = <span style={{ marginLeft: 'auto', color: '#f06b6b', fontSize: '0.8rem', fontWeight: 'bold' }}>❌ Your Choice (Wrong)</span>;
                    }

                    return (
                      <div key={opt} className={`mcq-option ${cls}`} style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="mcq-opt-letter">{opt}</div>
                        <span>{(qs as Record<string, any>)[`option_${opt.toLowerCase()}`]}</span>
                        {indicator}
                      </div>
                    );
                  })}
                </div>

                {qs.explanation && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--ink3)', borderRadius: 8, borderLeft: '3px solid var(--sage)', fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.5 }}>
                    💡 <strong>Explanation:</strong> {qs.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ==========================================
  // ACTIVE QUIZ VIEW (TEST DETE WAQT)
  // ==========================================
  const answered = Object.keys(answers).length;
  const timeDanger = timeLeft !== null && timeLeft < 120;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', flexDirection: 'column' }}>
      <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--line)', background: 'var(--ink2)', display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, flex: 1 }}>{test.title}</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text3)' }}>{answered}/{questions.length} answered</div>
        {timeLeft !== null && (
          <div style={{
            fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: '1.1rem',
            color: timeDanger ? 'var(--coral)' : 'var(--text)',
            background: timeDanger ? 'rgba(240,107,107,0.12)' : 'var(--ink3)',
            padding: '0.3rem 0.75rem', borderRadius: 8
          }}>
            ⏱ {formatTime(timeLeft)}
          </div>
        )}
        <button className="btn btn-primary btn-sm" onClick={() => submitTest(false)} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Test'}
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: 220, minWidth: 220, background: 'var(--ink2)', borderRight: '1px solid var(--line)', overflowY: 'auto', padding: '1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', marginBottom: '0.75rem' }}>Questions</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem' }}>
            {questions.map((qs, i) => (
              <button
                key={qs.id}
                onClick={() => setCurrent(i)}
                style={{
                  width: '100%', aspectRatio: '1', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.78rem',
                  background: current === i ? 'var(--sage)' : answers[qs.id] ? 'rgba(74,222,154,0.2)' : 'var(--ink3)',
                  color: current === i ? '#000' : answers[qs.id] ? 'var(--sage)' : 'var(--text3)',
                  transition: 'all 0.15s',
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
          {q && (
            <div style={{ maxWidth: 700 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text3)', fontFamily: 'IBM Plex Mono', marginBottom: '0.5rem' }}>
                Question {current + 1} of {questions.length}
              </div>
              <div style={{ fontWeight: 600, fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                {q.question_text}
              </div>
              <div className="mcq-options">
                {(['A', 'B', 'C', 'D'] as const).map(opt => (
                  <div
                    key={opt}
                    className={`mcq-option ${optionClass(opt)}`}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="mcq-opt-letter">{opt}</div>
                    <span>{(q as Record<string, any>)[`option_${opt.toLowerCase()}`]}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
                <button className="btn btn-secondary btn-sm" disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>← Prev</button>
                <button className="btn btn-secondary btn-sm" disabled={current === questions.length - 1} onClick={() => setCurrent(c => c + 1)}>Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
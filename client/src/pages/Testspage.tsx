import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function TestsPage() {
  const [tests, setTests] = useState<any[]>([]);
  const [syllabi, setSyllabi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ syllabus_id: '', title: '', unit_number: '', num_questions: '20', time_limit: '30' });
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/tests'),
      api.get('/syllabi'),
    ]).then(([testsRes, syllabiRes]) => {
      setTests(testsRes.data.tests || []);
      setSyllabi(syllabiRes.data.syllabi?.filter((s: any) => s.status === 'ready') || []);
    }).finally(() => setLoading(false));
  }, []);

  const createTest = async () => {
    if (!form.syllabus_id || !form.title) { setError('Please fill in required fields.'); return; }
    setError(''); setCreating(true);
    try {
      const res = await api.post('/tests', {
        syllabus_id: parseInt(form.syllabus_id),
        title: form.title,
        unit_number: form.unit_number ? parseInt(form.unit_number) : undefined,
        num_questions: parseInt(form.num_questions),
        time_limit: parseInt(form.time_limit),
      });
      setTests(prev => [res.data.test, ...prev]);
      setShowForm(false);
      setForm({ syllabus_id: '', title: '', unit_number: '', num_questions: '20', time_limit: '30' });
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to create test.');
    } finally { setCreating(false); }
  };

  const deleteTest = async (id: number) => {
    if (!confirm('Delete this test?')) return;
    await api.delete(`/tests/${id}`);
    setTests(prev => prev.filter(t => t.id !== id));
  };

  const scoreColor = (pct: number) => pct >= 75 ? 'var(--sage)' : pct >= 50 ? 'var(--amber)' : 'var(--coral)';

  const statusBadge = (test: any) => {
    if (test.completed_at) return <span className="badge badge-green">✓ Completed</span>;
    if (test.started_at) return <span className="badge badge-amber">⏳ In Progress</span>;
    return <span className="badge badge-blue">📋 Ready</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Tests</div>
          <div className="page-subtitle">Create and take AI-generated unit-wise tests</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ Cancel' : '+ Create Test'}
        </button>
      </div>

      <div className="p-page">
        {/* Create test form */}
        {showForm && (
          <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'rgba(74,222,154,0.25)' }}>
            <div style={{ fontWeight: 700, marginBottom: '1rem' }}>📝 New Test</div>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="grid-2" style={{ marginBottom: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Title *</label>
                <input className="form-input" placeholder="e.g. Unit 2 Test" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Syllabus *</label>
                <select className="form-input" value={form.syllabus_id}
                  onChange={e => setForm({ ...form, syllabus_id: e.target.value })}>
                  <option value="">Select a syllabus</option>
                  {syllabi.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Unit Number (optional)</label>
                <input className="form-input" type="number" placeholder="Leave blank for all units"
                  value={form.unit_number} onChange={e => setForm({ ...form, unit_number: e.target.value })} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Number of Questions</label>
                <input className="form-input" type="number" min={5} max={50} value={form.num_questions}
                  onChange={e => setForm({ ...form, num_questions: e.target.value })} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Time Limit (minutes)</label>
                <input className="form-input" type="number" min={5} max={180} value={form.time_limit}
                  onChange={e => setForm({ ...form, time_limit: e.target.value })} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={createTest} disabled={creating}>
              {creating ? '⏳ Creating...' : '✓ Create Test'}
            </button>
          </div>
        )}

        {/* Tests list */}
        {loading ? (
          <div className="loading-state"><div className="spinner" /><span>Loading tests...</span></div>
        ) : tests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <div style={{ fontWeight: 600 }}>No tests yet</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text3)' }}>Create your first test to start practising</div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>Create Test</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {tests.map((t: any) => (
              <div key={t.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ fontSize: '2rem' }}>📋</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{t.title}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {statusBadge(t)}
                    <span className="badge badge-blue">{t.num_questions || '?'} Qs</span>
                    {t.time_limit && <span className="badge" style={{ background: 'var(--ink3)', color: 'var(--text3)' }}>⏱ {t.time_limit} min</span>}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                  {t.percentage != null && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.82rem' }}>
                      Score: <span style={{ fontWeight: 700, color: scoreColor(t.percentage) }}>{Math.round(t.percentage)}%</span>
                      {' '}({t.score}/{t.num_questions})
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  {!t.completed_at ? (
                    <Link to={`/tests/${t.id}/take`} className="btn btn-primary btn-sm">
                      {t.started_at ? '▶ Resume' : '▶ Start'}
                    </Link>
                  ) : (
                    <Link to={`/tests/${t.id}/take`} className="btn btn-secondary btn-sm">📊 Review</Link>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={() => deleteTest(t.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
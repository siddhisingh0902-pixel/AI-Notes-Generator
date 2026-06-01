import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function SyllabusPage() {
  const [syllabi, setSyllabi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', subject: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Toggles between 'file' picker grid and custom direct 'text' writer view
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [textInput, setTextInput] = useState('');
  
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchSyllabi = () => {
    api.get('/syllabi').then(r => setSyllabi(r.data.syllabi)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchSyllabi(); }, []);

  // Background processor status poller
  useEffect(() => {
    const processing = syllabi.filter(s => s.status === 'processing');
    if (!processing.length) return;
    const interval = setInterval(async () => {
      for (const s of processing) {
        const r = await api.get(`/syllabi/${s.id}/status`);
        if (r.data.status !== 'processing') {
          setSyllabi(prev => prev.map(x => x.id === s.id ? { ...x, status: r.data.status } : x));
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [syllabi]);

  const handleUpload = async () => {
    if (!form.title) { setError('Please enter a title.'); return; }
    setError(''); setUploading(true);

    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('subject', form.subject);

    if (uploadMode === 'file') {
      const files = fileRef.current?.files;
      if (!files || files.length === 0) { 
        setError('Please select at least one file (PDF, Image, or Text).'); 
        setUploading(false); 
        return; 
      }
      for (let i = 0; i < files.length; i++) {
        fd.append('files', files[i]); 
      }
    } else {
      if (!textInput.trim()) { 
        setError('Please paste or type your syllabus text.'); 
        setUploading(false); 
        return; 
      }
      // Converts typed string buffer stream into a virtual .txt file attachment seamlessly
      const textBlob = new Blob([textInput], { type: 'text/plain' });
      fd.append('files', textBlob, 'syllabus_pasted.txt');
    }

    try {
      await api.post('/syllabi/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess('Syllabus submitted successfully! AI is parsing content in the background.');
      setForm({ title: '', subject: '' });
      setTextInput('');
      if (fileRef.current) fileRef.current.value = '';
      fetchSyllabi();
      setTimeout(() => setSuccess(''), 8000);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Upload failed.');
    } finally { setUploading(false); }
  };

  const deleteSyllabus = async (id: number) => {
    if (!confirm('Delete this syllabus and all its content?')) return;
    await api.delete(`/syllabi/${id}`);
    setSyllabi(prev => prev.filter(s => s.id !== id));
  };

  const statusBadge = (status: string) => {
    if (status === 'ready') return <span className="badge badge-green">✓ Ready</span>;
    if (status === 'processing') return <span className="badge badge-amber">⏳ Processing</span>;
    return <span className="badge badge-red">✗ Error</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Syllabi</div>
          <div className="page-subtitle">Provide your syllabus details to generate comprehensive study guides</div>
        </div>
      </div>

      <div className="p-page">
        {/* Main interactive ingestion module */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '1.25rem', fontSize: '1rem' }}>📤 Add New Syllabus</div>
          
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          
          <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Title *</label>
              <input className="form-input" placeholder="e.g. Operating Systems" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Subject</label>
              <input className="form-input" placeholder="e.g. Computer Science" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} />
            </div>
          </div>

          {/* Mode switch navigation buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <button 
              type="button" 
              className={`btn ${uploadMode === 'file' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => { setUploadMode('file'); setError(''); }}
            >
              📁 Upload Files
            </button>
            <button 
              type="button" 
              className={`btn ${uploadMode === 'text' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => { setUploadMode('text'); setError(''); }}
            >
              ✍️ Paste Text
            </button>
          </div>

          {/* Conditional Layout Interface */}
          {uploadMode === 'file' ? (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input 
                ref={fileRef} 
                type="file" 
                accept="application/pdf, image/jpeg, image/png, text/plain" 
                multiple 
                style={{ flex: 1, background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 9, padding: '0.6rem 1rem', color: 'var(--text)', fontSize: '0.85rem' }} 
              />
            </div>
          ) : (
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Syllabus Text Contents</label>
              <textarea
                className="form-input"
                rows={6}
                placeholder="Paste or type syllabus text details, topic schedules, or unit chapters here directly..."
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                style={{ resize: 'vertical', fontFamily: 'inherit', padding: '0.75rem', lineHeight: 1.5 }}
              />
            </div>
          )}

          <button 
            className="btn btn-primary" 
            style={{ marginTop: '1.25rem' }}
            onClick={handleUpload} 
            disabled={uploading}
          >
            {uploading ? '⏳ Generating Study Materials...' : '↑ Upload & Generate'}
          </button>
        </div>

        {/* Saved Items Presentation Registry */}
        {loading ? (
          <div className="loading-state"><div className="spinner" /></div>
        ) : syllabi.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <div style={{ fontWeight: 600 }}>No syllabi setup yet</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {syllabi.map(s => (
              <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ fontSize: '2rem' }}>📕</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{s.title}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {statusBadge(s.status)}
                    {s.subject && <span className="badge badge-blue">{s.subject}</span>}
                  </div>
                </div>
                {s.status === 'ready' && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
                    <Link to={`/syllabi/${s.id}/notes`} className="btn btn-secondary btn-sm">📖 Notes</Link>
                    <Link to={`/syllabi/${s.id}/questions`} className="btn btn-secondary btn-sm">❓ Questions</Link>
                    <Link to={`/syllabi/${s.id}/mcqs`} className="btn btn-secondary btn-sm">🎯 MCQs</Link>
                    <button 
                      className="btn btn-primary btn-sm" 
                      style={{ background: 'linear-gradient(135deg, var(--violet), #6d28d9)' }}
                      onClick={async () => {
                        try {
                          const res = await api.post('/tests/create', { syllabusId: s.id, title: `${s.title} - Mock Test` });
                          window.location.href = `/tests/${res.data.testId}/take`;
                        } catch (err: any) {
                          alert(err.response?.data?.message || 'Failed to initialize test.');
                        }
                      }}
                    >
                      📝 Take a Test
                    </button>
                  </div>
                )}
                <button className="btn btn-danger btn-sm" onClick={() => deleteSyllabus(s.id)}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', institution: '', course: '', semester: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const f = (k: string) => (e: any) => setForm({...form, [k]: e.target.value});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) { setError('Password must be 6+ characters.'); return; }
    setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/register', form);
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-hero-text">
          <div className="auth-brand" style={{ marginBottom: '2rem' }}>
            <div className="auth-brand-icon">S</div>
            <div className="auth-brand-name">StudyAI</div>
          </div>
          <h1>Study smarter,<br />not <span>harder.</span></h1>
          <p style={{ marginTop: '1rem' }}>Join thousands of students using AI to transform their syllabi into complete study materials in minutes.</p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card" style={{ maxWidth: '440px' }}>
          <div className="auth-brand">
            <div className="auth-brand-icon">S</div>
            <div className="auth-brand-name">StudyAI</div>
          </div>
          <h2 className="auth-title">Create account</h2>
          <p className="auth-desc">Start generating AI study materials</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" type="text" placeholder="Your name" value={form.name} onChange={f('name')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={f('email')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Min 6 characters" value={form.password} onChange={f('password')} required />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Institution (optional)</label>
                <input className="form-input" type="text" placeholder="College name" value={form.institution} onChange={f('institution')} />
              </div>
              <div className="form-group">
                <label className="form-label">Course (optional)</label>
                <input className="form-input" type="text" placeholder="e.g. B.Tech CSE" value={form.course} onChange={f('course')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Semester (optional)</label>
              <input className="form-input" type="text" placeholder="e.g. 3rd Semester" value={form.semester} onChange={f('semester')} />
            </div>
            <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: '0.5rem' }} disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>

          <p className="auth-switch">Have an account? <Link to="/login">Sign In</Link></p>
        </div>
      </div>
    </div>
  );
}
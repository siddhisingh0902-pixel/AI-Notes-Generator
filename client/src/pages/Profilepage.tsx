import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function ProfilePage() {
  const { user, login } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    institution: user?.institution || '',
    course: user?.course || '',
    semester: user?.semester || '',
  });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const saveProfile = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await api.put('/auth/profile', form);
      login(localStorage.getItem('token') || '', res.data.user);
      setSuccess('Profile updated successfully.');
      setEditing(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to save profile.');
    } finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (pwForm.new_password !== pwForm.confirm) { setPwError('Passwords do not match.'); return; }
    if (pwForm.new_password.length < 6) { setPwError('Password must be 6+ characters.'); return; }
    setChangingPw(true); setPwError(''); setPwSuccess('');
    try {
      await api.put('/auth/password', { current_password: pwForm.current_password, new_password: pwForm.new_password });
      setPwSuccess('Password changed successfully.');
      setPwForm({ current_password: '', new_password: '', confirm: '' });
      setTimeout(() => setPwSuccess(''), 4000);
    } catch (e: any) {
      setPwError(e.response?.data?.message || 'Failed to change password.');
    } finally { setChangingPw(false); }
  };

  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Profile</div>
          <div className="page-subtitle">Manage your account and preferences</div>
        </div>
      </div>

      <div className="p-page" style={{ maxWidth: 680 }}>
        {/* Avatar + info */}
        <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--sage), var(--violet))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem', fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user?.name}</div>
            <div style={{ color: 'var(--text3)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{user?.email}</div>
            {user?.institution && (
              <div style={{ fontSize: '0.82rem', color: 'var(--text2)', marginTop: '0.2rem' }}>
                {user.institution}{user?.course ? ` · ${user.course}` : ''}{user?.semester ? ` · ${user.semester}` : ''}
              </div>
            )}
          </div>
          {!editing && (
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>✏️ Edit</button>
          )}
        </div>

        {/* Edit form */}
        {editing && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '1rem' }}>Edit Profile</div>
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Institution</label>
                <input className="form-input" placeholder="College / University" value={form.institution}
                  onChange={e => setForm({ ...form, institution: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Course</label>
                <input className="form-input" placeholder="e.g. B.Tech CSE" value={form.course}
                  onChange={e => setForm({ ...form, course: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Semester</label>
              <input className="form-input" placeholder="e.g. 3rd Semester" value={form.semester}
                onChange={e => setForm({ ...form, semester: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
                {saving ? 'Saving...' : '✓ Save Changes'}
              </button>
              <button className="btn btn-secondary" onClick={() => { setEditing(false); setError(''); }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Change password */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '1rem' }}>🔒 Change Password</div>
          {pwError && <div className="alert alert-error">{pwError}</div>}
          {pwSuccess && <div className="alert alert-success">{pwSuccess}</div>}
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input className="form-input" type="password" placeholder="••••••••"
              value={pwForm.current_password} onChange={e => setPwForm({ ...pwForm, current_password: e.target.value })} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" placeholder="Min 6 characters"
                value={pwForm.new_password} onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input className="form-input" type="password" placeholder="Repeat new password"
                value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={changePassword} disabled={changingPw}>
            {changingPw ? 'Changing...' : 'Change Password'}
          </button>
        </div>

        {/* Account info */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: '1rem' }}>Account Info</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text3)' }}>Email</span>
              <span>{user?.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text3)' }}>Member since</span>
              <span>{(user as any)?.created_at ? new Date((user as any).created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' }) : '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
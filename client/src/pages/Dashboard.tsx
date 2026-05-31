import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

interface Note {
  id: number;
  filename: string;
  generated_notes: string;
  created_at: string;
}

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
    try {
      const res = await api.get('/notes');
      setNotes(res.data.notes);
    } catch (err) {
      console.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotes(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploadSuccess('');
    setUploading(true);
    setSelectedNote(null);

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const res = await api.post('/notes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newNote = res.data.note;
      setNotes((prev) => [newNote, ...prev]);
      setSelectedNote(newNote);
      setUploadSuccess('Notes generated!');
      setTimeout(() => setUploadSuccess(''), 3000);
    } catch (err: any) {
      setUploadError(err.response?.data?.message || 'Failed to process PDF.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this note?')) return;
    try {
      await api.delete(`/notes/${id}`);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (selectedNote?.id === id) setSelectedNote(null);
    } catch {
      alert('Failed to delete.');
    }
  };

  const copyNotes = () => {
    if (!selectedNote) return;
    navigator.clipboard.writeText(selectedNote.generated_notes);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials = user?.name?.slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="dashboard">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-top">
          {/* Brand */}
          <div className="sidebar-brand">
            <div className="brand-icon">📝</div>
            <div className="brand-name">AI <span>Notes</span></div>
          </div>

          {/* Upload button */}
          <div className="upload-area">
            <input
              type="file"
              accept="application/pdf"
              ref={fileInputRef}
              onChange={handleUpload}
              style={{ display: 'none' }}
              id="pdf-upload"
            />
            <label
              htmlFor="pdf-upload"
              className={`upload-label ${uploading ? 'uploading' : ''}`}
            >
              {uploading ? (
                <>⏳ Generating notes...</>
              ) : (
                <><span className="upload-icon">↑</span> Upload PDF</>
              )}
            </label>

            {uploading && (
              <div className="upload-progress">
                <div className="upload-progress-bar" style={{ width: '100%' }} />
              </div>
            )}
            {uploadError && (
              <div className="upload-status error">{uploadError}</div>
            )}
            {uploadSuccess && (
              <div className="upload-status success">✓ {uploadSuccess}</div>
            )}
          </div>
        </div>

        {/* Notes list */}
        <div className="notes-section">
          <div className="notes-section-header">
            <span className="notes-section-title">Your Notes</span>
            <span className="notes-count">{notes.length}</span>
          </div>

          {loading ? (
            <div className="notes-empty">
              <div className="notes-empty-icon">⏳</div>
              <p>Loading notes...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="notes-empty">
              <div className="notes-empty-icon">📂</div>
              <p>No notes yet.<br />Upload a PDF to get started.</p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className={`note-item ${selectedNote?.id === note.id ? 'active' : ''}`}
                onClick={() => setSelectedNote(note)}
              >
                <div className="note-file-icon">📄</div>
                <div className="note-info">
                  <span className="note-filename">{note.filename}</span>
                  <span className="note-date">
                    {new Date(note.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </span>
                </div>
                <button
                  className="note-delete"
                  onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                  title="Delete"
                >
                  🗑
                </button>
              </div>
            ))
          )}
        </div>

        {/* User row */}
        <div className="sidebar-bottom">
          <div className="user-row">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <span className="user-name-text">{user?.name}</span>
              <span className="user-role">Free plan</span>
            </div>
            <button className="btn-logout" onClick={handleLogout} title="Sign out">
              ↩
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN VIEWER ── */}
      <main className="note-viewer">
        {uploading ? (
          <div className="generating-state">
            <div className="generating-spinner" />
            <h3>Generating your notes...</h3>
            <p>Reading PDF and calling AI — this takes 10–20 seconds</p>
          </div>
        ) : selectedNote ? (
          <>
            <div className="note-header-bar">
              <div className="note-header-left">
                <div className="note-header-filename">📄 {selectedNote.filename}</div>
                <div className="note-header-date">
                  {new Date(selectedNote.created_at).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="note-header-actions">
                <button className="btn-action" onClick={copyNotes}>Copy</button>
                <button
                  className="btn-action danger"
                  onClick={() => handleDelete(selectedNote.id)}
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="note-body">
              <div className="note-content-box">
                <pre>{selectedNote.generated_notes}</pre>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🤖</div>
            <h2>AI Notes Generator</h2>
            <p>Upload any PDF and get structured, AI-powered notes in seconds.</p>
            <div className="empty-steps">
              <div className="empty-step">
                <div className="empty-step-num">1</div>
                <p>Click Upload PDF</p>
              </div>
              <div className="empty-step">
                <div className="empty-step-num">2</div>
                <p>AI reads your file</p>
              </div>
              <div className="empty-step">
                <div className="empty-step-num">3</div>
                <p>Notes appear here</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
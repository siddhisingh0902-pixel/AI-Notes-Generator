import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { RadialBarChart, RadialBar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(r => setStats(r.data))
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return <div className="loading-state"><div className="spinner" /><span>Loading dashboard...</span></div>;

  const s = stats?.stats || {};
  const recentTests = stats?.recentTests || [];

  const scoreColor = s.averageScore >= 75 ? '#4ade9a' : s.averageScore >= 50 ? '#f5c842' : '#f06b6b';

  const progressData = [{ name: 'Progress', value: s.completionRate || 0, fill: '#4ade9a' }];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">{greeting}, {user?.name?.split(' ')[0]} 👋</div>
          <div className="page-subtitle">Here's your study overview</div>
        </div>
        <Link to="/syllabi" className="btn btn-primary">+ Upload Syllabus</Link>
      </div>

      <div className="p-page">
        {/* Stats row */}
        <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-icon">📚</div>
            <div className="stat-value">{s.totalSyllabi || 0}</div>
            <div className="stat-label">Syllabi</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📖</div>
            <div className="stat-value">{s.completedTopics || 0}<span style={{ fontSize: '1rem', color: 'var(--text3)' }}>/{s.totalTopics || 0}</span></div>
            <div className="stat-label">Topics Done</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📝</div>
            <div className="stat-value">{s.testsAttempted || 0}</div>
            <div className="stat-label">Tests Taken</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-value" style={{ color: scoreColor }}>{s.averageScore || 0}%</div>
            <div className="stat-label">Avg Score</div>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
          {/* Syllabus Completion Ring */}
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: '1rem' }}>Syllabus Completion</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <div style={{ width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%" cy="50%"
                    innerRadius="60%"
                    outerRadius="100%"
                    data={progressData}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--sage)' }}>{s.completionRate || 0}%</div>
                <div style={{ color: 'var(--text3)', fontSize: '0.85rem' }}>Topics completed</div>
                <div style={{ marginTop: '0.5rem', color: 'var(--text2)', fontSize: '0.82rem' }}>{s.completedTopics || 0} of {s.totalTopics || 0} topics</div>
              </div>
            </div>
          </div>

          {/* Recent test scores */}
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: '1rem' }}>Recent Test Scores</div>
            {recentTests.length === 0 ? (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <div style={{ color: 'var(--text3)', fontSize: '0.85rem' }}>No tests attempted yet</div>
                <Link to="/tests" className="btn btn-secondary btn-sm">Take a Test</Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={recentTests.map((t: any) => ({ name: t.title?.slice(0, 12), score: Math.round(t.percentage) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text3)', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--text3)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--text)' }} />
                  <Bar dataKey="score" fill="#4ade9a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: '1rem' }}>Quick Actions</div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/syllabi" className="btn btn-secondary">📚 My Syllabi</Link>
            <Link to="/tests" className="btn btn-secondary">📝 Take a Test</Link>
            <Link to="/chat" className="btn btn-secondary">🤖 Ask AI</Link>
            <Link to="/profile" className="btn btn-secondary">👤 My Profile</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
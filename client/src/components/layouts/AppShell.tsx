import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/dashboard', icon: '⬛', label: 'Dashboard' },
  { to: '/syllabi', icon: '📚', label: 'Syllabi' },
  { to: '/tests', icon: '📝', label: 'Tests' },
  { to: '/chat', icon: '🤖', label: 'AI Assistant' },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };
  const initials = user?.name?.slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">S</div>
          <div>
            <div className="logo-text">StudyAI</div>
            <div className="logo-sub">Powered by Gemini</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-label">Main</div>
            {navItems.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="icon">{n.icon}</span>
                {n.label}
              </NavLink>
            ))}
          </div>

          <div className="nav-section">
            <div className="nav-label">Account</div>
            <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="icon">👤</span>Profile
            </NavLink>
            <div className="nav-item" onClick={handleLogout} style={{ cursor: 'pointer' }}>
              <span className="icon">↩</span>Sign Out
            </div>
          </div>
        </nav>

        <div className="sidebar-bottom">
          <NavLink to="/profile" style={{ textDecoration: 'none' }}>
            <div className="user-chip">
              <div className="user-av">{initials}</div>
              <div>
                <div className="user-chip-name">{user?.name}</div>
                <div className="user-chip-role">{user?.course || 'Student'}</div>
              </div>
            </div>
          </NavLink>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
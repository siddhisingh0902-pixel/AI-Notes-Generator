import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface User { 
  id: number; 
  name: string; 
  email: string; 
  institution?: string; 
  course?: string; 
  semester?: string; 
  bio?: string; 
}

interface AuthCtx { 
  user: User | null; 
  token: string | null; 
  login: (t: string, u: User) => void; 
  logout: () => void; 
  setUser: (u: User) => void; 
  isAuth: boolean; 
  loading: boolean; // TypeScript interface mein loading ko include kiya
}

const AuthContext = createContext<AuthCtx | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Reload redirection fix state

  useEffect(() => {
    // Local storage se values ko safe extract karo reload par restore karne ke liye
    const storedToken = localStorage.getItem('sa_token');
    const storedUser = localStorage.getItem('sa_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUserState(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse stored user session data:", e);
        // Clean session corrupt hone par data clear karein
        localStorage.removeItem('sa_token');
        localStorage.removeItem('sa_user');
      }
    }
    // Check pura hone par loader band karo
    setLoading(false);
  }, []);

  const login = (t: string, u: User) => {
    localStorage.setItem('sa_token', t);
    localStorage.setItem('sa_user', JSON.stringify(u));
    setToken(t);
    setUserState(u);
  };

  const logout = () => {
    localStorage.removeItem('sa_token');
    localStorage.removeItem('sa_user');
    setToken(null);
    setUserState(null);
  };

  const setUser = (u: User) => {
    localStorage.setItem('sa_user', JSON.stringify(u));
    setUserState(u);
  };

  // isAuth tabhi true hoga jab hamare paas active token validate state mein ho
  const isAuth = !!token;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, setUser, isAuth, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => { 
  const c = useContext(AuthContext); 
  if (!c) throw new Error('useAuth must be used within an AuthProvider'); 
  return c; 
};
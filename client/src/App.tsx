import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppShell from './components/layouts/AppShell';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SyllabusPage from './pages/Syllabuspage';
import NotesPage from './pages/Notespage';
import QuestionsPage from './pages/Questionspage';
import MCQPage from './pages/Mcqpage';
import TestsPage from './pages/Testspage';
import TakeTestPage from './pages/Taketestpage';
import ProfilePage from './pages/Profilepage';
import ChatPage from './pages/Chatpage';
import './index.css';

const Guard = ({ children }: { children: React.ReactNode }) => {
  const { isAuth, loading } = useAuth() as any; 


  if (loading) {
    return (
      <div className="loading-state" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="spinner" />
        <span style={{ marginTop: '1rem', color: 'var(--text2)', fontSize: '0.9rem' }}>Verifying session...</span>
      </div>
    );
  }

  // 2. Verification complete hone ke baad hi safe navigation allow karo
  return isAuth ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Guard><AppShell /></Guard>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="syllabi" element={<SyllabusPage />} />
            <Route path="syllabi/:id/notes" element={<NotesPage />} />
            <Route path="syllabi/:id/questions" element={<QuestionsPage />} />
            <Route path="syllabi/:id/mcqs" element={<MCQPage />} />
            <Route path="tests" element={<TestsPage />} />
            <Route path="tests/:id/take" element={<TakeTestPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
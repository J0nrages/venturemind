import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import AuthGuard from './components/AuthGuard';
import { DialogProvider } from './contexts/DialogContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ChatProvider } from './contexts/ChatContext';
import { ContextProvider } from './contexts/WorkspaceProvider';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dialog from './components/Dialog';
import ConversationMode from './components/ConversationMode';
import { cleanupInvalidSessions, migrateOldContextData } from './utils/sessionCleanup';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  
  // Clean up invalid session data on startup
  useEffect(() => {
    cleanupInvalidSessions();
    migrateOldContextData();
  }, []);
  
  // Show loading state while auth is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-purple-50/30 to-blue-50/30 dark:from-gray-950 dark:via-purple-950/20 dark:to-blue-950/20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        
        <Route element={<AuthGuard />}>
          <Route path="/" element={<ConversationMode />} />
          <Route path="/*" element={<ConversationMode />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
      
      <Dialog />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DialogProvider>
          <ChatProvider>
            <ContextProvider>
              <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <AppContent />
              </Router>
            </ContextProvider>
          </ChatProvider>
        </DialogProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BusinessPlan from './pages/BusinessPlan';
import SwotAnalysis from './pages/SwotAnalysis.tsx';
import { SimpleSidebar } from './components/SimpleSidebar';
import ProformaPage from './pages/ProformaPage.tsx';
import DocumentMemory from './pages/DocumentMemory.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Settings from './pages/Settings.tsx';
import AIProcessing from './pages/AIProcessing.tsx';
import Documents from './pages/Documents.tsx';
import Customers from './pages/Customers.tsx';
import Metrics from './pages/Metrics.tsx';
import Strategy from './pages/Strategy.tsx';
import Integrations from './pages/Integrations.tsx';
import Auth from './pages/Auth';
import AuthGuard from './components/AuthGuard';
import { DialogProvider } from './contexts/DialogContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ChatProvider } from './contexts/ChatContext';
import { ContextProvider } from './contexts/ContextProvider';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ModernChatSidebar from './components/ModernChatSidebar';
import { useChat } from './contexts/ChatContext';
import Dialog from './components/Dialog';
import ConversationMode from './components/ConversationMode';
// import ConversationMode from './components/SafeConversationMode';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Grid3X3, ArrowLeft } from 'lucide-react';
import { cleanupInvalidSessions, migrateOldContextData } from './utils/sessionCleanup';

function AppContent() {
  const { isOpen, position, toggleChat, setPosition } = useChat();
  const { isAuthenticated, loading } = useAuth();
  const [synaMode, setSynaMode] = useState(true); // Default to SYNA mode
  
  // Check if user prefers SYNA mode (could be stored in localStorage)
  useEffect(() => {
    // Clean up invalid session data on startup
    cleanupInvalidSessions();
    migrateOldContextData();
    
    const savedMode = localStorage.getItem('syna-mode');
    if (savedMode === 'true') {
      setSynaMode(true);
    }
  }, []);
  
  const toggleSynaMode = () => {
    const newMode = !synaMode;
    setSynaMode(newMode);
    localStorage.setItem('syna-mode', newMode.toString());
  };
  
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
      {/* SYNA Mode Toggle - Only show when authenticated */}
      {isAuthenticated && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          onClick={toggleSynaMode}
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-xl shadow-lg backdrop-blur-lg transition-all duration-300 hover:scale-105 flex items-center gap-2 ${
            synaMode 
              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-purple-500/20' 
              : 'bg-white/90 text-gray-700 hover:bg-white'
          }`}
          title={synaMode ? 'Switch to Traditional Mode' : 'Switch to SYNA Mode'}
        >
          {synaMode ? (
            <>
              <Grid3X3 className="w-4 h-4" />
              <span className="text-sm font-medium">Traditional</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">SYNA</span>
            </>
          )}
        </motion.button>
      )}
      
      <AnimatePresence mode="wait">
        {synaMode ? (
          <motion.div
            key="syna"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full h-screen"
          >
            <Routes>
              <Route path="/auth" element={<Auth />} />
              
              <Route element={<AuthGuard />}>
                <Route path="/" element={<ConversationMode />} />
                <Route path="/*" element={<ConversationMode />} />
              </Route>
              
              <Route path="*" element={<Navigate to="/auth" replace />} />
            </Routes>
          </motion.div>
        ) : (
          <motion.div
            key="traditional"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <Routes>
            <Route path="/auth" element={<Auth />} />
            
            <Route element={<AuthGuard />}>
              {/* Dashboard/Business Plan - keeping the current main page as / */}
              <Route
                path="/"
                element={
                  <SimpleSidebar>
                    <div className="p-6">
                      <BusinessPlan />
                    </div>
                  </SimpleSidebar>
                }
              />

            {/* Dashboard Overview */}
            <Route
              path="/dashboard"
              element={
                <SimpleSidebar>
                  <div className="p-6">
                    <Dashboard />
                  </div>
                </SimpleSidebar>
              }
            />

            {/* AI Document Memory */}
            <Route
              path="/document-memory"
              element={
                <SimpleSidebar>
                  <DocumentMemory />
                </SimpleSidebar>
              }
            />

            {/* Financial Proforma */}
            <Route
              path="/proforma/*"
              element={
                <SimpleSidebar>
                  <div className="p-6">
                    <ProformaPage />
                  </div>
                </SimpleSidebar>
              }
            />

            {/* API Integrations */}
            <Route
              path="/integrations"
              element={
                <SimpleSidebar>
                  <div className="p-6">
                    <Integrations />
                  </div>
                </SimpleSidebar>
              }
            />

            {/* AI Processing */}
            <Route
              path="/ai-processing"
              element={
                <SimpleSidebar>
                  <div className="p-6">
                    <AIProcessing />
                  </div>
                </SimpleSidebar>
              }
            />

            {/* Documents */}
            <Route
              path="/documents"
              element={
                <SimpleSidebar>
                  <div className="p-6">
                    <Documents />
                  </div>
                </SimpleSidebar>
              }
            />

            {/* Customers */}
            <Route
              path="/customers"
              element={
                <SimpleSidebar>
                  <div className="p-6">
                    <Customers />
                  </div>
                </SimpleSidebar>
              }
            />

            {/* Metrics */}
            <Route
              path="/metrics"
              element={
                <SimpleSidebar>
                  <div className="p-6">
                    <Metrics />
                  </div>
                </SimpleSidebar>
              }
            />

            {/* Strategy */}
            <Route
              path="/strategy"
              element={
                <SimpleSidebar>
                  <div className="p-6">
                    <Strategy />
                  </div>
                </SimpleSidebar>
              }
            />

            {/* Settings */}
            <Route
              path="/settings"
              element={
                <SimpleSidebar>
                  <div className="p-6">
                    <Settings />
                  </div>
                </SimpleSidebar>
              }
            />

            {/* SWOT Analysis */}
            <Route
              path="/swot/:type"
              element={
                <SimpleSidebar>
                  <div className="p-6">
                    <SwotAnalysis />
                  </div>
                </SimpleSidebar>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
        
        {/* Global Chat Component - Only show when authenticated */}
        {isAuthenticated && (
          <ModernChatSidebar 
            isOpen={isOpen}
            onToggle={toggleChat}
            position={position}
            onPositionChange={setPosition}
          />
        )}
        
            <Dialog />
          </motion.div>
        )}
      </AnimatePresence>
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
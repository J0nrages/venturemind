import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BusinessPlan from './pages/BusinessPlan';
import SwotAnalysis from './pages/SwotAnalysis.tsx';
import { ModernLayout } from './components/ModernSidebar';
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
import ModernChatSidebar from './components/ModernChatSidebar';
import { useChat } from './contexts/ChatContext';
import Dialog from './components/Dialog';

function AppContent() {
  const { isOpen, position, toggleChat, setPosition } = useChat();
  
  return (
    <>
      <Routes>
            <Route path="/auth" element={<Auth />} />
            
            <Route element={<AuthGuard />}>
              {/* Dashboard/Business Plan - keeping the current main page as / */}
              <Route
                path="/"
                element={
                  <ModernLayout>
                    <div className="p-6">
                      <BusinessPlan />
                    </div>
                  </ModernLayout>
                }
              />

            {/* Dashboard Overview */}
            <Route
              path="/dashboard"
              element={
                <ModernLayout>
                  <div className="p-6">
                    <Dashboard />
                  </div>
                </ModernLayout>
              }
            />

            {/* AI Document Memory */}
            <Route
              path="/document-memory"
              element={
                <ModernLayout>
                  <DocumentMemory />
                </ModernLayout>
              }
            />

            {/* Financial Proforma */}
            <Route
              path="/proforma/*"
              element={
                <ModernLayout>
                  <div className="p-6">
                    <ProformaPage />
                  </div>
                </ModernLayout>
              }
            />

            {/* API Integrations */}
            <Route
              path="/integrations"
              element={
                <ModernLayout>
                  <div className="p-6">
                    <Integrations />
                  </div>
                </ModernLayout>
              }
            />

            {/* AI Processing */}
            <Route
              path="/ai-processing"
              element={
                <ModernLayout>
                  <div className="p-6">
                    <AIProcessing />
                  </div>
                </ModernLayout>
              }
            />

            {/* Documents */}
            <Route
              path="/documents"
              element={
                <ModernLayout>
                  <div className="p-6">
                    <Documents />
                  </div>
                </ModernLayout>
              }
            />

            {/* Customers */}
            <Route
              path="/customers"
              element={
                <ModernLayout>
                  <div className="p-6">
                    <Customers />
                  </div>
                </ModernLayout>
              }
            />

            {/* Metrics */}
            <Route
              path="/metrics"
              element={
                <ModernLayout>
                  <div className="p-6">
                    <Metrics />
                  </div>
                </ModernLayout>
              }
            />

            {/* Strategy */}
            <Route
              path="/strategy"
              element={
                <ModernLayout>
                  <div className="p-6">
                    <Strategy />
                  </div>
                </ModernLayout>
              }
            />

            {/* Settings */}
            <Route
              path="/settings"
              element={
                <ModernLayout>
                  <div className="p-6">
                    <Settings />
                  </div>
                </ModernLayout>
              }
            />

            {/* SWOT Analysis */}
            <Route
              path="/swot/:type"
              element={
                <ModernLayout>
                  <div className="p-6">
                    <SwotAnalysis />
                  </div>
                </ModernLayout>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
        
        {/* Global Chat Component */}
        <ModernChatSidebar 
          isOpen={isOpen}
          onToggle={toggleChat}
          position={position}
          onPositionChange={setPosition}
        />
        
        <Dialog />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <DialogProvider>
        <ChatProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppContent />
          </Router>
        </ChatProvider>
      </DialogProvider>
    </ThemeProvider>
  );
}

export default App;
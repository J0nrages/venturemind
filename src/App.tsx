import React from 'react';
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
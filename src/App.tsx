import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BusinessPlan from './pages/BusinessPlan';
import SwotAnalysis from './pages/SwotAnalysis.tsx';
import Sidebar from './components/Sidebar';
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
import Dialog from './components/Dialog';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <ThemeProvider>
      <DialogProvider>
        <Router>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            
            <Route element={<AuthGuard />}>
              {/* Dashboard/Business Plan - keeping the current main page as / */}
              <Route
                path="/"
                element={
                  <>
                    <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                      <main className="p-8 pl-16">
                        <BusinessPlan />
                      </main>
                    </div>
                  </>
                }
              />

            {/* Dashboard Overview */}
            <Route
              path="/dashboard"
              element={
                <>
                  <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                    <main className="p-8 pl-16">
                      <Dashboard />
                    </main>
                  </div>
                </>
              }
            />

            {/* AI Document Memory */}
            <Route
              path="/document-memory"
              element={
                <>
                  <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                    <DocumentMemory />
                  </div>
                </>
              }
            />

            {/* Financial Proforma */}
            <Route
              path="/proforma/*"
              element={
                <>
                  <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                    <main className="p-8 pl-16">
                      <ProformaPage />
                    </main>
                  </div>
                </>
              }
            />

            {/* API Integrations */}
            <Route
              path="/integrations"
              element={
                <>
                  <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                    <main className="p-8 pl-16">
                      <Integrations />
                    </main>
                  </div>
                </>
              }
            />

            {/* AI Processing */}
            <Route
              path="/ai-processing"
              element={
                <>
                  <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                    <main className="p-8 pl-16">
                      <AIProcessing />
                    </main>
                  </div>
                </>
              }
            />

            {/* Documents */}
            <Route
              path="/documents"
              element={
                <>
                  <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                    <main className="p-8 pl-16">
                      <Documents />
                    </main>
                  </div>
                </>
              }
            />

            {/* Customers */}
            <Route
              path="/customers"
              element={
                <>
                  <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                    <main className="p-8 pl-16">
                      <Customers />
                    </main>
                  </div>
                </>
              }
            />

            {/* Metrics */}
            <Route
              path="/metrics"
              element={
                <>
                  <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                    <main className="p-8 pl-16">
                      <Metrics />
                    </main>
                  </div>
                </>
              }
            />

            {/* Strategy */}
            <Route
              path="/strategy"
              element={
                <>
                  <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                    <main className="p-8 pl-16">
                      <Strategy />
                    </main>
                  </div>
                </>
              }
            />

            {/* Settings */}
            <Route
              path="/settings"
              element={
                <>
                  <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                    <main className="p-8 pl-16">
                      <Settings />
                    </main>
                  </div>
                </>
              }
            />

            {/* SWOT Analysis */}
            <Route
              path="/swot/:type"
              element={
                <>
                  <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                    <main className="p-8 pl-16">
                      <SwotAnalysis />
                    </main>
                  </div>
                </>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
        <Dialog />
      </Router>
    </DialogProvider>
  </ThemeProvider>
  );
}

export default App;
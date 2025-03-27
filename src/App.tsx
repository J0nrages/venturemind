import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BusinessPlan from './pages/BusinessPlan';
import SwotAnalysis from './pages/SwotAnalysis.tsx';
import Sidebar from './components/Sidebar';
import ProformaPage from './pages/ProformaPage.tsx';
import Auth from './pages/Auth';
import AuthGuard from './components/AuthGuard';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        
        <Route element={<AuthGuard />}>
          <Route
            path="/"
            element={
              <>
                <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                <div className="min-h-screen bg-gray-50">
                  <main className="p-8 pl-16">
                    <BusinessPlan />
                  </main>
                </div>
              </>
            }
          />
          
          <Route
            path="/swot/:type"
            element={
              <>
                <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                <div className="min-h-screen bg-gray-50">
                  <main className="p-8 pl-16">
                    <SwotAnalysis />
                  </main>
                </div>
              </>
            }
          />
          
          <Route
            path="/proforma/*"
            element={
              <>
                <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                <div className="min-h-screen bg-gray-50">
                  <main className="p-8 pl-16">
                    <ProformaPage />
                  </main>
                </div>
              </>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
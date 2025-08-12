import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  LayoutDashboard,
  Brain,
  FileText,
  Users,
  TrendingUp,
  Settings,
  Target,
  LineChart,
  DollarSign,
  MessageCircle,
  Zap
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Business Plan' },
  { path: '/dashboard', icon: DollarSign, label: 'Dashboard' },
  { path: '/document-memory', icon: MessageCircle, label: 'AI Document Memory' },
  { path: '/proforma', icon: LineChart, label: 'Financial Proforma' },
  { path: '/integrations', icon: Zap, label: 'API Integrations' },
  { path: '/ai-processing', icon: Brain, label: 'AI Processing' },
  { path: '/documents', icon: FileText, label: 'Documents' },
  { path: '/customers', icon: Users, label: 'Customers' },
  { path: '/metrics', icon: TrendingUp, label: 'Metrics' },
  { path: '/strategy', icon: Target, label: 'Strategy' },
  { path: '/settings', icon: Settings, label: 'Settings' }
];

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const location = useLocation();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-6 left-4 z-30 p-2 rounded-lg bg-white shadow-md hover:bg-gray-50"
      >
        <Menu className="w-6 h-6 text-gray-600" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black z-30"
            />
            
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-40 p-4"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-semibold">DocuMind AI</h2>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <nav className="space-y-2">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.path || 
                    (item.path === '/proforma' && location.pathname.startsWith('/proforma')) ||
                    (item.path === '/integrations' && location.pathname.startsWith('/integrations'));
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
import React, { useState } from 'react';
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
  Zap,
  ChevronRight
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useChat } from '@/contexts/ChatContext';
import { cn } from '@/lib/utils';

const menuGroups = [
  {
    label: 'Overview',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Business Plan' },
      { path: '/dashboard', icon: DollarSign, label: 'Dashboard' },
    ],
  },
  {
    label: 'AI Analytics',
    items: [
      { path: '/document-memory', icon: MessageCircle, label: 'AI Document Memory' },
      { path: '/ai-processing', icon: Brain, label: 'AI Processing' },
      { path: '/metrics', icon: TrendingUp, label: 'Metrics' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { path: '/proforma', icon: LineChart, label: 'Financial Proforma' },
      { path: '/strategy', icon: Target, label: 'Strategy' },
      { path: '/documents', icon: FileText, label: 'Documents' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { path: '/customers', icon: Users, label: 'Customers' },
      { path: '/integrations', icon: Zap, label: 'API Integrations' },
      { path: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

interface SimpleSidebarProps {
  children: React.ReactNode;
}

export function SimpleSidebar({ children }: SimpleSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { position: chatPosition } = useChat();
  
  // Position opposite to chat
  const navPosition = chatPosition === 'right' ? 'left' : 'right';
  
  // Simple menu items like original
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

  return (
    <div className="flex h-screen">
      {/* Sidebar - Responsive width */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 256 }}
            exit={{ width: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              navPosition === 'right' ? 'order-2' : 'order-0',
              'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm'
            )}
          >
            <div className="w-64 h-full p-4 flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">DocuMind AI</h2>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <button 
                    onClick={() => setIsOpen(false)} 
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </div>

              {/* Navigation - Groups with labels */}
              <nav className="flex-1 overflow-y-auto space-y-6">
                {/* Overview Group */}
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-3">Overview</p>
                  <div className="space-y-1">
                    {menuItems.slice(0, 2).map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                            isActive
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* AI Analytics Group */}
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-3">AI Analytics</p>
                  <div className="space-y-1">
                    {menuItems.slice(2, 6).map((item) => {
                      const isActive = location.pathname === item.path || 
                        (item.path === '/proforma' && location.pathname.startsWith('/proforma'));
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                            isActive
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Planning Group */}
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-3">Planning</p>
                  <div className="space-y-1">
                    {menuItems.slice(6, 9).map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                            isActive
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Operations Group */}
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-3">Operations</p>
                  <div className="space-y-1">
                    {menuItems.slice(9).map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                            isActive
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </nav>

              {/* Footer */}
              <div className="mt-auto pt-4 border-t dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Powered by advanced AI orchestration
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content - Responsive */}
      <div className={cn(
        "flex-1 bg-background transition-all duration-300",
        navPosition === 'right' ? 'order-1' : 'order-2'
      )}>
        {children}
      </div>

      {/* Floating Toggle Button - Moves with sidebar */}
      <motion.button
        animate={{ 
          x: isOpen ? (navPosition === 'left' ? 240 : -240) : 0,
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed top-6 z-30 p-2.5 rounded-lg",
          "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800",
          "shadow-sm hover:shadow-md transition-all duration-200",
          navPosition === 'left' ? 'left-4' : 'right-4'
        )}
      >
        <Menu className="w-5 h-5" />
      </motion.button>
    </div>
  );
}
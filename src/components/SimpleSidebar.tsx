import React, { useState, useEffect } from 'react';
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
  const { position: chatPosition, isOpen: isChatOpen } = useChat();
  
  // Position opposite to chat
  const navPosition = chatPosition === 'right' ? 'left' : 'right';
  
  // Add keyboard shortcut (Cmd/Ctrl + /)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      // Close on Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);
  
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
      {/* Sidebar - Using transform for better performance */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm"
            />
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: navPosition === 'left' ? -256 : 256 }}
              animate={{ x: 0 }}
              exit={{ x: navPosition === 'left' ? -256 : 256 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={cn(
                "fixed top-0 w-64 h-full z-30",
                navPosition === 'left' ? 'left-0' : 'right-0',
                'bg-card/80 backdrop-blur-xl border-r border-border/50 shadow-2xl'
              )}
            >
              <div className="w-full h-full flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-border/50 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl backdrop-blur-sm">
                      <LayoutDashboard className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="font-semibold text-foreground">DocuMind AI</h2>
                  </div>
                  <div className="flex items-center gap-1">
                    <ThemeToggle />
                    <button 
                      onClick={() => setIsOpen(false)} 
                      className="p-2 hover:bg-accent/50 rounded-lg transition-colors"
                      aria-label="Close menu"
                    >
                      <ChevronRight className={cn(
                        "w-4 h-4 transition-transform",
                        navPosition === 'left' ? 'rotate-180' : ''
                      )} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Navigation - Groups with labels */}
              <nav className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Overview Group */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-3">Overview</p>
                  <div className="space-y-1">
                    {menuItems.slice(0, 2).map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200',
                            isActive
                              ? 'bg-primary/10 text-primary font-medium backdrop-blur-sm'
                              : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
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
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-3">AI Analytics</p>
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
                            'flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200',
                            isActive
                              ? 'bg-primary/10 text-primary font-medium backdrop-blur-sm'
                              : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
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
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-3">Planning</p>
                  <div className="space-y-1">
                    {menuItems.slice(6, 9).map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200',
                            isActive
                              ? 'bg-primary/10 text-primary font-medium backdrop-blur-sm'
                              : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
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
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-3">Operations</p>
                  <div className="space-y-1">
                    {menuItems.slice(9).map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200',
                            isActive
                              ? 'bg-primary/10 text-primary font-medium backdrop-blur-sm'
                              : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
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
              <div className="p-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground text-center">
                  Powered by advanced AI orchestration
                </p>
              </div>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content - Shift to accommodate open side panels on large screens */}
      <div
        className={cn(
          "flex-1 bg-background transition-[margin] duration-300 pt-14",
          // Reserve space for chat on large screens
          isChatOpen && chatPosition === 'right' ? 'lg:mr-96' : '',
          isChatOpen && chatPosition === 'left' ? 'lg:ml-96' : '',
          // Reserve space for nav when open on large screens
          isOpen && navPosition === 'left' ? 'lg:ml-64' : '',
          isOpen && navPosition === 'right' ? 'lg:mr-64' : ''
        )}
      >
        {children}
      </div>

      {/* Floating Toggle Button - Only visible when sidebar is closed */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(true)}
            className={cn(
              "fixed top-6 z-30 p-3 rounded-xl group",
              "bg-primary backdrop-blur-lg",
              "shadow-lg shadow-primary/20",
              "hover:shadow-xl hover:shadow-primary/30",
              "hover:scale-105 active:scale-95",
              "transition-all duration-200",
              navPosition === 'left' ? 'left-4' : 'right-4'
            )}
            aria-label="Open navigation menu"
            title="Open menu (Cmd+/)"
          >
            <Menu className="w-5 h-5 text-primary-foreground" />
            {/* Keyboard shortcut hint */}
            <span className={cn(
              "absolute -bottom-8 px-2 py-1 text-xs",
              "bg-popover text-popover-foreground rounded-md shadow-md",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
              "whitespace-nowrap pointer-events-none",
              navPosition === 'left' ? 'left-0' : 'right-0'
            )}>
              ⌘/
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
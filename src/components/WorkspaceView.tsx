import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  FolderOpen, 
  Workflow, 
  FileText,
  MessageSquare,
  X,
  GripVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MainChat } from './MainChat';
import { Context } from '../types/context';

// Import existing pages/components
import SettingsPage from '../pages/Settings';
import BusinessPlan from '../pages/BusinessPlan';
import Strategy from '../pages/Strategy';
import DocumentMemory from '../pages/DocumentMemory';

export type SurfaceType = 'settings' | 'projects' | 'workflows' | 'ledger' | null;

interface WorkspaceViewProps {
  context: Context;
  isActive: boolean;
  className?: string;
}

export function WorkspaceView({ context, isActive, className }: WorkspaceViewProps) {
  const [activeSurface, setActiveSurface] = useState<SurfaceType>(null);
  const [splitPosition, setSplitPosition] = useState(60); // 60% for surface, 40% for chat
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Handle navigation from UnifiedChatInput
  const handleNavigate = (page: 'settings' | 'projects' | 'workflows' | 'ledger') => {
    setActiveSurface(page as SurfaceType);
  };

  // Close surface handler
  const handleCloseSurface = () => {
    setActiveSurface(null);
  };

  // Render the appropriate surface component
  const renderSurface = () => {
    if (!activeSurface) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <Square className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Select a surface from the menu to begin</p>
          </div>
        </div>
      );
    }

    const surfaceComponents = {
      settings: <SettingsPage />,
      projects: <BusinessPlan />,
      workflows: <Strategy />,
      ledger: <DocumentMemory />
    };

    return surfaceComponents[activeSurface] || null;
  };

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      <AnimatePresence mode="wait">
        {/* Chat View (when no surface is active) */}
        {!activeSurface ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full"
          >
            <MainChat
              context={context}
              isActive={isActive}
              unbounded={true}
              onNavigate={handleNavigate}
            />
          </motion.div>
        ) : (
        /* Split View - Single Joined Card (when surface is active) */
          <motion.div
            key="split"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3, type: "spring", damping: 20 }}
              className="w-full h-full max-w-[1600px] bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 overflow-hidden"
              ref={splitContainerRef}
            >
              <div className="h-full flex">
                {/* Left: Surface Section */}
                <div 
                  className="h-full flex flex-col overflow-hidden"
                  style={{ width: `${splitPosition}%` }}
                >
                  <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 bg-muted/10">
                    <div className="flex items-center gap-3">
                      {activeSurface === 'settings' && <Settings className="w-5 h-5 text-primary" />}
                      {activeSurface === 'projects' && <FolderOpen className="w-5 h-5 text-primary" />}
                      {activeSurface === 'workflows' && <Workflow className="w-5 h-5 text-primary" />}
                      {activeSurface === 'ledger' && <FileText className="w-5 h-5 text-primary" />}
                      <h2 className="text-lg font-semibold capitalize">
                        {activeSurface || 'Workspace Surface'}
                      </h2>
                    </div>
                    {activeSurface && (
                      <button
                        onClick={handleCloseSurface}
                        className="p-1.5 hover:bg-secondary/50 rounded-lg transition-all"
                      >
                        <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                    <div className="p-6">
                      {renderSurface()}
                    </div>
                  </div>
                </div>

                {/* Resizable Divider */}
                <div 
                  className="relative w-px bg-border/50 hover:bg-border cursor-col-resize group"
                  onMouseDown={(e) => {
                    isDragging.current = true;
                    e.preventDefault();
                    
                    const handleMouseMove = (e: MouseEvent) => {
                      if (!isDragging.current || !splitContainerRef.current) return;
                      
                      const rect = splitContainerRef.current.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const percentage = (x / rect.width) * 100;
                      
                      // Limit between 30% and 70%
                      setSplitPosition(Math.min(70, Math.max(30, percentage)));
                    };
                    
                    const handleMouseUp = () => {
                      isDragging.current = false;
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };
                    
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                >
                  <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-primary/10" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                {/* Right: Chat Section */}
                <div 
                  className="h-full flex flex-col overflow-hidden border-l border-border/30"
                  style={{ width: `${100 - splitPosition}%` }}
                >
                  <div className="px-6 py-4 border-b border-border/30 bg-muted/10">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold">MainChat</h3>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <MainChat
                      context={context}
                      isActive={isActive}
                      unbounded={true}
                      onNavigate={handleNavigate}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Update MainChat component prop types
declare module './MainChat' {
  interface ConversationSpineProps {
    onNavigate?: (page: 'settings' | 'projects' | 'workflows' | 'ledger') => void;
  }
}
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import ContextSwitcher from './ContextSwitcher';
import { useContexts } from '../contexts/ContextProvider';
import { cn } from '@/lib/utils';

// Static gradient background (no animation for better performance)
function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-purple-600/90 via-blue-600/90 to-indigo-600/90" />
  );
}

// Removed demo control buttons component

// Main conversation interface component
function ConversationInterface() {
  const { contexts, currentContextIndex, switchContext } = useContexts();

  // Add keyboard shortcuts that don't interfere with the ContextSwitcher's
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle special keys that aren't handled by ContextSwitcher
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Add additional shortcuts here if needed
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <AnimatedBackground />
      
      {/* Main Context Switcher */}
      <div className={cn(
        "relative z-10 w-full h-full flex items-center justify-center",
        contexts.length > 1 ? "p-5" : "" // Only add padding when multiple contexts (windowed mode)
      )}>
        <ContextSwitcher
          contexts={contexts}
          currentContext={currentContextIndex}
          onContextChange={switchContext}
          className={cn(
            "w-full h-full",
            contexts.length > 1 ? "max-w-7xl max-h-[900px]" : "" // Remove size constraints in unbounded mode
          )}
        />
      </div>
    </div>
  );
}

// Main exported component - assumes ContextProvider is already available
export default function ConversationMode() {
  return <ConversationInterface />;
}
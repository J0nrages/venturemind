import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import ContextSwitcher from './ContextSwitcher';
import { useContexts } from '../contexts/ContextProvider';
import { cn } from '@/lib/utils';

// Animated background component
function AnimatedBackground() {
  return (
    <motion.div
      className="fixed inset-0 overflow-hidden"
      animate={{
        background: [
          'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
          'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        ]
      }}
      transition={{
        duration: 10,
        ease: 'easeInOut',
        repeat: Infinity,
      }}
    />
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
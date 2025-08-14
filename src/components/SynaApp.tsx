import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import ContextSwitcher from './ContextSwitcher';
import { ContextProvider, useContexts } from '../contexts/ContextProvider';
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

// Control buttons component
function SynaControls() {
  const { 
    toggleDocumentSurface, 
    toggleAgentRail, 
    toggleExpandedMode,
    switchContext,
    currentContextIndex,
    contexts,
    documentSurfaceVisible,
    agentRailVisible,
    expandedMode 
  } = useContexts();

  const switchToNext = () => {
    const nextIndex = (currentContextIndex + 1) % contexts.length;
    switchContext(nextIndex);
  };

  const switchToPrev = () => {
    const prevIndex = (currentContextIndex - 1 + contexts.length) % contexts.length;
    switchContext(prevIndex);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="fixed bottom-5 left-1/2 transform -translate-x-1/2 z-40"
    >
      <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-2.5 flex items-center gap-2 flex-wrap max-w-[90vw] justify-center">
        <button
          onClick={toggleExpandedMode}
          className="px-3 py-2 text-sm rounded-xl bg-white shadow-sm hover:bg-gray-50 hover:-translate-y-0.5 transition-all whitespace-nowrap"
        >
          Toggle Mode ({expandedMode})
        </button>
        
        <button
          onClick={toggleDocumentSurface}
          className={cn(
            "px-3 py-2 text-sm rounded-xl shadow-sm hover:-translate-y-0.5 transition-all whitespace-nowrap",
            documentSurfaceVisible
              ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
              : "bg-white hover:bg-gray-50"
          )}
        >
          Show Document
        </button>
        
        <button
          onClick={toggleAgentRail}
          className={cn(
            "px-3 py-2 text-sm rounded-xl shadow-sm hover:-translate-y-0.5 transition-all whitespace-nowrap",
            agentRailVisible
              ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
              : "bg-white hover:bg-gray-50"
          )}
        >
          Show Agents
        </button>
        
        <button
          onClick={switchToPrev}
          className="px-3 py-2 text-sm rounded-xl bg-white shadow-sm hover:bg-gray-50 hover:-translate-y-0.5 transition-all whitespace-nowrap"
        >
          ← Previous
        </button>
        
        <button
          onClick={switchToNext}
          className="px-3 py-2 text-sm rounded-xl bg-white shadow-sm hover:bg-gray-50 hover:-translate-y-0.5 transition-all whitespace-nowrap"
        >
          Next →
        </button>
      </div>
    </motion.div>
  );
}

// Main SYNA interface component
function SynaInterface() {
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
      <div className="relative z-10 w-full h-full flex items-center justify-center p-5">
        <ContextSwitcher
          contexts={contexts}
          currentContext={currentContextIndex}
          onContextChange={switchContext}
          className="w-full h-full max-w-7xl max-h-[900px]"
        />
      </div>
      
    </div>
  );
}

// Main exported component with provider
export default function SynaApp() {
  return (
    <ContextProvider>
      <SynaInterface />
    </ContextProvider>
  );
}
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import ContextSwitcher from '../components/WorkspaceSwitcher';
import { useContexts } from '../contexts/WorkspaceProvider';
import { cn } from '@/lib/utils';

// Static gradient background (no animation for better performance)
function AnimatedBackground() {
  // Theme-aware gradient using shadcn tokens
  return (
    <div className="fixed inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_hsl(var(--primary)/0.25),_transparent_40%),_radial-gradient(ellipse_at_bottom_right,_hsl(var(--secondary)/0.25),_transparent_45%),_linear-gradient(to_br,_hsl(var(--background)),_hsl(var(--background)))]" />
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
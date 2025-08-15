import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import ContextCard from './ContextCard';
import { Context, ContextType } from '../types/context';

interface ContextSwitcherProps {
  contexts: Context[];
  currentContext: number;
  onContextChange: (index: number) => void;
  className?: string;
}

export default function ContextSwitcher({
  contexts,
  currentContext,
  onContextChange,
  className
}: ContextSwitcherProps) {
  const [keyboardHintVisible, setKeyboardHintVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't interfere with input fields
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          switchContext('prev');
          break;
        case 'ArrowRight':
          e.preventDefault();
          switchContext('next');
          break;
        case '1':
        case '2':
        case '3':
          e.preventDefault();
          const index = parseInt(e.key) - 1;
          if (index < contexts.length) {
            onContextChange(index);
            showKeyboardHint();
          }
          break;
        case 'm':
          // Toggle mode - can be handled by parent component
          break;
        case 'd':
          // Toggle document surface - can be handled by parent component
          break;
        case 'a':
          // Toggle agent rail - can be handled by parent component
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentContext, contexts.length]);

  const switchContext = useCallback((direction: 'next' | 'prev' | number) => {
    let newIndex: number;
    
    if (typeof direction === 'number') {
      newIndex = direction;
    } else if (direction === 'next') {
      newIndex = (currentContext + 1) % contexts.length;
    } else {
      newIndex = (currentContext - 1 + contexts.length) % contexts.length;
    }
    
    onContextChange(newIndex);
    showKeyboardHint();
  }, [currentContext, contexts.length, onContextChange]);

  const showKeyboardHint = () => {
    setKeyboardHintVisible(true);
    setTimeout(() => setKeyboardHintVisible(false), 2000);
  };

  // Handle swipe gestures for touch devices
  useEffect(() => {
    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    };

    const handleSwipe = () => {
      const swipeThreshold = 50;
      if (touchEndX < touchStartX - swipeThreshold) {
        switchContext('next');
      }
      if (touchEndX > touchStartX + swipeThreshold) {
        switchContext('prev');
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });
      
      return () => {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [switchContext]);

  const getContextPosition = (index: number) => {
    // Only show side contexts if there are multiple active contexts
    if (contexts.length <= 1) {
      return index === currentContext ? 'active' : 'hidden';
    }
    
    if (index === currentContext) {
      return 'active';
    } else if (index === (currentContext - 1 + contexts.length) % contexts.length) {
      return 'prev';
    } else if (index === (currentContext + 1) % contexts.length) {
      return 'next';
    }
    return 'hidden';
  };

  return (
    <>
      {/* Keyboard Hint */}
      <AnimatePresence>
        {keyboardHintVisible && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 bg-black/80 text-white px-4 py-2 rounded-full text-sm whitespace-nowrap"
          >
            Use ← → arrows or 1-3 keys to switch contexts • Click on side cards to switch
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Indicator Dots */}
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 flex gap-2 z-30">
        {contexts.map((context, index) => (
          <button
            key={context.id}
            onClick={() => switchContext(index)}
            className={cn(
              "transition-all duration-300 cursor-pointer relative group",
              index === currentContext
                ? "w-6 h-2 bg-white/80 rounded-sm"
                : "w-2 h-2 bg-white/30 rounded-full hover:bg-white/60 hover:scale-110"
            )}
            title={context.title}
          />
        ))}
      </div>

      {/* Context Switcher Container */}
      <div 
        ref={containerRef}
        className={cn(
          "relative w-full h-full flex items-center justify-center perspective-[1500px] overflow-hidden",
          className
        )}
      >
        {contexts.map((context, index) => {
          const position = getContextPosition(index);
          if (position === 'hidden') return null;

          return (
            <ContextCard
              key={context.id}
              context={context}
              position={position}
              onClick={() => {
                if (position !== 'active') {
                  switchContext(index);
                }
              }}
              className="absolute"
              totalContexts={contexts.length}
            />
          );
        })}
      </div>
    </>
  );
}
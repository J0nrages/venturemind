import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Context } from '../types/context';
import ConversationSpine from './ConversationSpine';
import AgentRail from './AgentRail';
import Surface from './Surface';
import PageSurface from './PageSurface';
import { useContexts } from '../contexts/ContextProvider';
import { PrefetchData } from '../services/AgentOrchestrator';
import toast from 'react-hot-toast';

interface ContextCardProps {
  context: Context;
  position: 'active' | 'prev' | 'next';
  onClick?: () => void;
  className?: string;
  totalContexts?: number; // Add to know if we should show window chrome
}

export default function ContextCard({
  context,
  position,
  onClick,
  className,
  totalContexts = 1
}: ContextCardProps) {
  const { spawnAgentWorkstream } = useContexts();
  
  const handleSpawnAgentWorkstream = (agentId: string, prefetchData?: PrefetchData) => {
    const newContextId = spawnAgentWorkstream(agentId, context.id, prefetchData);
    toast.success(`Spawned ${agentId} workstream`);
  };

  // Define variables before they're used
  const showWindowChrome = position !== 'active'; // Show window chrome for non-active contexts
  const isUnbounded = position === 'active'; // Active context is always unbounded
  
  const getCardStyles = () => {
    // For unbounded mode (single context), use full viewport
    if (isUnbounded) {
      return {
        width: '100vw',
        height: '100vh',
        transform: 'translateX(0) scale(1) rotateY(0)',
        opacity: 1,
        zIndex: 20,
      };
    }

    // For windowed mode (multiple contexts), use original sizing
    const baseStyles = {
      width: 'min(800px, 90vw)',
      height: 'min(700px, 85vh)',
    };

    switch (position) {
      case 'prev':
        return {
          ...baseStyles,
          transform: 'translateX(max(-50vw, -450px)) scale(0.6) rotateY(40deg)',
          opacity: 0.3,
          filter: 'brightness(0.6) blur(2px)',
          zIndex: 1,
        };
      case 'next':
        return {
          ...baseStyles,
          transform: 'translateX(min(50vw, 450px)) scale(0.6) rotateY(-40deg)',
          opacity: 0.3,
          filter: 'brightness(0.6) blur(2px)',
          zIndex: 1,
        };
      case 'active':
      default:
        return {
          ...baseStyles,
          transform: 'translateX(0) scale(1) rotateY(0)',
          opacity: 1,
          zIndex: 20,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 100px rgba(102, 126, 234, 0.1)',
        };
    }
  };

  const cardVariants = {
    active: {
      x: 0,
      scale: 1,
      rotateY: 0,
      opacity: 1,
      filter: 'brightness(1) blur(0px)',
      transition: {
        type: 'spring',
        damping: 25,
        stiffness: 200,
        duration: 0.5,
      },
    },
    prev: {
      x: isUnbounded ? '-100vw' : 'max(-50vw, -450px)', // Move completely off-screen in unbounded mode
      scale: isUnbounded ? 1 : 0.6,
      rotateY: isUnbounded ? 0 : 40,
      opacity: isUnbounded ? 0 : 0.3,
      filter: isUnbounded ? 'brightness(1) blur(0px)' : 'brightness(0.6) blur(2px)',
      transition: {
        type: 'spring',
        damping: 25,
        stiffness: 200,
        duration: 0.5,
      },
    },
    next: {
      x: isUnbounded ? '100vw' : 'min(50vw, 450px)', // Move completely off-screen in unbounded mode
      scale: isUnbounded ? 1 : 0.6,
      rotateY: isUnbounded ? 0 : -40,
      opacity: isUnbounded ? 0 : 0.3,
      filter: isUnbounded ? 'brightness(1) blur(0px)' : 'brightness(0.6) blur(2px)',
      transition: {
        type: 'spring',
        damping: 25,
        stiffness: 200,
        duration: 0.5,
      },
    },
  };

  const hoverVariants = {
    prev: {
      scale: 0.65,
      rotateY: 35,
      opacity: 0.5,
      filter: 'brightness(0.75) blur(1px)',
      transition: { duration: 0.2 },
    },
    next: {
      scale: 0.65,
      rotateY: -35,
      opacity: 0.5,
      filter: 'brightness(0.75) blur(1px)',
      transition: { duration: 0.2 },
    },
  };

  return (
    <motion.div
      variants={cardVariants}
      initial={position}
      animate={position}
      whileHover={position !== 'active' ? hoverVariants[position] : undefined}
      onClick={position !== 'active' ? onClick : undefined}
      className={cn(
        "overflow-hidden flex flex-col will-change-transform",
        showWindowChrome && "bg-white/98 backdrop-blur-xl rounded-3xl shadow-2xl",
        isUnbounded && "bg-transparent", // Completely transparent for unbounded mode
        position !== 'active' && "cursor-pointer",
        className
      )}
      style={getCardStyles()}
    >
      {/* Window Chrome - Only show when multiple contexts */}
      {showWindowChrome && (
        <div className="h-10 bg-white/80 backdrop-blur-sm border-b border-black/10 flex items-center px-4">
          {/* Traffic Lights */}
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full hover:brightness-110 cursor-pointer transition-all" />
            <div className="w-3 h-3 bg-yellow-500 rounded-full hover:brightness-110 cursor-pointer transition-all" />
            <div className="w-3 h-3 bg-green-500 rounded-full hover:brightness-110 cursor-pointer transition-all" />
          </div>
          
          {/* Window Title */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Syna</span>
            <span className="px-2 py-0.5 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-600 text-xs font-semibold rounded-full">
              {context.title}
            </span>
          </div>
        </div>
      )}

      {/* Unbounded Chat Container */}
      <div className={cn(
        "flex-1 flex overflow-hidden relative",
        isUnbounded && "bg-transparent" // Ensure container is transparent in unbounded mode
      )}>
        {/* Main Conversation Area - Unbounded */}
        <div className={cn(
          "flex flex-col min-w-0 transition-all duration-300 relative",
          isUnbounded && "bg-transparent", // Transparent background for unbounded mode
          // Expand chat area when no side content is visible
          !context.surfaces.document?.visible && !context.surfaces.agents?.visible 
            ? "flex-1" 
            : "flex-[0.6]" // Take less space when side content is visible
        )}>
          {/* Conversation Messages - Unbounded with fade at top */}
          <div className="flex-1 relative overflow-hidden">
            {/* Fade overlay at top - only show in windowed mode */}
            {!isUnbounded && (
              <div className="absolute top-0 left-0 right-0 h-20 z-10 pointer-events-none bg-gradient-to-b from-white/80 to-transparent" />
            )}
            
            {/* Messages container - unbounded */}
            <div className={cn(
              "absolute inset-0 overflow-y-auto scrollbar-hide",
              isUnbounded ? "pt-10 pb-40 bg-transparent" : "pt-20 pb-32", // More space at bottom for floating input, transparent background
            )}>
              <ConversationSpine 
                context={context}
                isActive={position === 'active'}
                unbounded={isUnbounded}
              />
            </div>
          </div>
        </div>

        {/* Page Surface (replaces Document Surface) */}
        {context.surfaces.document?.visible && (
          <PageSurface
            context={context}
            isVisible={true}
            className="flex-[0.4] border-l border-black/10"
          />
        )}

        {/* Agent Rail */}
        {context.surfaces.agents?.visible && (
          <AgentRail
            context={context}
            agents={context.activeAgents}
            onSpawnAgentWorkstream={handleSpawnAgentWorkstream}
            className="w-48 border-l border-black/10 flex-shrink-0"
          />
        )}
      </div>
    </motion.div>
  );
}
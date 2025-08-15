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
}

export default function ContextCard({
  context,
  position,
  onClick,
  className
}: ContextCardProps) {
  const { spawnAgentWorkstream } = useContexts();
  
  const handleSpawnAgentWorkstream = (agentId: string, prefetchData?: PrefetchData) => {
    const newContextId = spawnAgentWorkstream(agentId, context.id, prefetchData);
    toast.success(`Spawned ${agentId} workstream`);
  };
  const getCardStyles = () => {
    const baseStyles = {
      width: 'min(600px, 80vw)',
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
      x: 'max(-50vw, -450px)',
      scale: 0.6,
      rotateY: 40,
      opacity: 0.3,
      filter: 'brightness(0.6) blur(2px)',
      transition: {
        type: 'spring',
        damping: 25,
        stiffness: 200,
        duration: 0.5,
      },
    },
    next: {
      x: 'min(50vw, 450px)',
      scale: 0.6,
      rotateY: -40,
      opacity: 0.3,
      filter: 'brightness(0.6) blur(2px)',
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
        "bg-white/98 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col will-change-transform",
        position !== 'active' && "cursor-pointer",
        className
      )}
      style={getCardStyles()}
    >
      {/* Window Chrome */}
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

      {/* Chat Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation Spine (Main Chat Area) - Expands when no side content */}
        <div className={cn(
          "flex flex-col min-w-0 transition-all duration-300",
          // Expand chat area when no side content is visible
          !context.surfaces.document?.visible && !context.surfaces.agents?.visible 
            ? "flex-1" 
            : "flex-[0.6]" // Take less space when side content is visible
        )}>
          <ConversationSpine 
            context={context}
            isActive={position === 'active'}
          />
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
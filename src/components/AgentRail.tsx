import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Code, 
  FileText, 
  BarChart3, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Sparkles,
  Settings,
  Target,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Agent, Context } from '../types/context';

interface AgentRailProps {
  context: Context;
  agents: Agent[];
  className?: string;
}

const AGENT_ICONS = {
  planner: Target,
  writer: FileText,
  engineer: Code,
  analyst: BarChart3,
  critic: AlertCircle,
  tester: CheckCircle2,
  ops: Settings,
} as const;

const AGENT_COLORS = {
  planner: 'text-blue-600 bg-blue-100',
  writer: 'text-green-600 bg-green-100',
  engineer: 'text-purple-600 bg-purple-100',
  analyst: 'text-orange-600 bg-orange-100',
  critic: 'text-red-600 bg-red-100',
  tester: 'text-emerald-600 bg-emerald-100',
  ops: 'text-gray-600 bg-gray-100',
} as const;

const STATUS_INDICATORS = {
  idle: { icon: Brain, color: 'text-gray-400', bg: 'bg-gray-100' },
  working: { icon: Loader2, color: 'text-blue-600', bg: 'bg-blue-100', animate: 'animate-spin' },
  thinking: { icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-100', animate: 'animate-pulse' },
  complete: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
  error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
} as const;

export default function AgentRail({ context, agents, className }: AgentRailProps) {
  const railVariants = {
    hidden: {
      width: 0,
      opacity: 0,
      transition: { duration: 0.4, ease: 'easeInOut' }
    },
    visible: {
      width: 'min(200px, 20vw)',
      opacity: 1,
      transition: { duration: 0.4, ease: 'easeInOut' }
    }
  };

  const agentVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: (index: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: 0.1 + index * 0.05,
        duration: 0.3,
        ease: 'easeOut'
      }
    })
  };

  const getAgentIcon = (agent: Agent) => {
    const Icon = AGENT_ICONS[agent.type] || Brain;
    return Icon;
  };

  const getAgentColors = (agent: Agent) => {
    return AGENT_COLORS[agent.type] || 'text-gray-600 bg-gray-100';
  };

  const getStatusIndicator = (status: Agent['status']) => {
    return STATUS_INDICATORS[status] || STATUS_INDICATORS.idle;
  };

  const formatAgentName = (name: string) => {
    // Remove @ prefix if present and capitalize
    return name.startsWith('@') ? name : `@${name}`;
  };

  const getTaskPreview = (task?: string) => {
    if (!task) return null;
    return task.length > 30 ? `${task.substring(0, 30)}...` : task;
  };

  return (
    <AnimatePresence mode="wait">
      {context.surfaces.agents?.visible && (
        <motion.div
          variants={railVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className={cn(
            "bg-white/95 backdrop-blur-sm overflow-hidden flex-shrink-0",
            className
          )}
        >
          <div className="h-full flex flex-col">
            {/* Rail Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-gray-50 to-white">
              <h3 className="text-sm font-semibold text-gray-800 mb-1">
                Active Agents
              </h3>
              <p className="text-xs text-gray-600">
                {agents.filter(a => a.status !== 'idle').length} of {agents.length} working
              </p>
            </div>

            {/* Agent Cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {agents.map((agent, index) => {
                const AgentIcon = getAgentIcon(agent);
                const agentColors = getAgentColors(agent);
                const statusIndicator = getStatusIndicator(agent.status);
                const StatusIcon = statusIndicator.icon;

                return (
                  <motion.div
                    key={agent.id}
                    variants={agentVariants}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                    className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                  >
                    {/* Agent Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn('p-1.5 rounded-lg', agentColors)}>
                          <AgentIcon className="w-3 h-3" />
                        </div>
                        <span className="text-sm font-medium text-gray-800">
                          {formatAgentName(agent.name)}
                        </span>
                      </div>
                      
                      {/* Status Indicator */}
                      <div className={cn('p-1 rounded-full', statusIndicator.bg)}>
                        <StatusIcon className={cn('w-3 h-3', statusIndicator.color, statusIndicator.animate)} />
                      </div>
                    </div>

                    {/* Agent Status Text */}
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600 capitalize">
                        {agent.status === 'idle' ? 'Ready' : agent.status}
                      </p>
                      
                      {/* Current Task */}
                      {agent.currentTask && (
                        <p className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                          {getTaskPreview(agent.currentTask)}
                        </p>
                      )}

                      {/* Capabilities Preview */}
                      {agent.status === 'idle' && agent.capabilities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {agent.capabilities.slice(0, 2).map((capability, capIndex) => (
                            <span
                              key={capIndex}
                              className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full"
                            >
                              {capability.replace('_', ' ')}
                            </span>
                          ))}
                          {agent.capabilities.length > 2 && (
                            <span className="text-xs text-gray-400">
                              +{agent.capabilities.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Working Animation */}
                    {agent.status === 'working' && (
                      <div className="mt-2 flex items-center gap-1">
                        <div className="flex space-x-1">
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <span className="text-xs text-blue-600 ml-1">Processing...</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {/* Empty State */}
              {agents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Search className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 mb-1">No agents available</p>
                  <p className="text-xs text-gray-400">Start a conversation to activate agents</p>
                </div>
              )}
            </div>

            {/* Context Badge */}
            <div className="p-3 border-t border-gray-200 bg-gradient-to-br from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <span 
                  className="px-2 py-1 text-xs font-medium rounded-full"
                  style={{
                    backgroundColor: context.color.secondary,
                    color: context.color.accent
                  }}
                >
                  {context.badge}
                </span>
                <div className="flex items-center gap-1">
                  <div 
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: context.color.primary }}
                  />
                  <span className="text-xs text-gray-600">Live</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
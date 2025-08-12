import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, TrendingUp, Users, DollarSign, Target, BarChart3, 
  Sparkles, ArrowUpRight, ArrowDownRight, MoreVertical,
  FileText, Brain, ChevronRight, Plus, Zap, Shield, Globe
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color: string;
  delay?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, value, change, icon: Icon, color, delay = 0 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <div className={cn(
        "glass-card glass-card-hover rounded-2xl p-6 relative overflow-hidden group cursor-pointer",
        "border border-white/10"
      )}>
        <motion.div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at ${isHovered ? '50%' : '0%'} 50%, ${color}20, transparent)`,
          }}
        />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className={cn(
              "p-3 rounded-xl glass transition-all duration-300",
              "group-hover:scale-110 group-hover:rotate-3"
            )}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-white/60 font-medium">{title}</p>
            <div className="flex items-baseline gap-2">
              <motion.p 
                className="text-3xl font-bold text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay + 0.2 }}
              >
                {value}
              </motion.p>
              {change !== undefined && (
                <motion.span 
                  className={cn(
                    "flex items-center text-sm font-medium",
                    change >= 0 ? "text-green-400" : "text-red-400"
                  )}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: delay + 0.3 }}
                >
                  {change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {Math.abs(change)}%
                </motion.span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

interface ProgressCardProps {
  title: string;
  metrics: { label: string; value: number; color: string }[];
  delay?: number;
}

const ProgressCard: React.FC<ProgressCardProps> = ({ title, metrics, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass-card rounded-2xl p-6 border border-white/10"
    >
      <h3 className="text-lg font-semibold text-white mb-6">{title}</h3>
      <div className="space-y-4">
        {metrics.map((metric, index) => (
          <motion.div 
            key={metric.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + 0.1 * (index + 1) }}
            className="space-y-2"
          >
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/70">{metric.label}</span>
              <span className="text-sm font-semibold text-white">{metric.value}%</span>
            </div>
            <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="absolute h-full rounded-full"
                style={{ background: metric.color }}
                initial={{ width: 0 }}
                animate={{ width: `${metric.value}%` }}
                transition={{ duration: 1, delay: delay + 0.2 + 0.1 * index }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

const ModernDashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [showAI, setShowAI] = useState(false);

  const metrics = [
    { title: 'Total Revenue', value: '$0', change: 0, icon: DollarSign, color: '#10b981' },
    { title: 'Active Users', value: '0', change: 0, icon: Users, color: '#3b82f6' },
    { title: 'Conversion Rate', value: '0%', change: 0, icon: Target, color: '#8b5cf6' },
    { title: 'Growth Rate', value: '0%', change: 0, icon: TrendingUp, color: '#f59e0b' },
  ];

  const keyMetrics = [
    { label: 'Processing Speed', value: 159, color: '#10b981' },
    { label: 'Accuracy Rate', value: 59.1, color: '#3b82f6' },
    { label: 'API Uptime', value: 99.9, color: '#8b5cf6' },
  ];

  const initiatives = [
    { title: 'AI Processing', status: '159ms avg · 59.1% accuracy', icon: Brain, color: '#8b5cf6' },
    { title: 'Document Memory', status: 'Available', icon: FileText, color: '#3b82f6' },
    { title: 'Global Expansion', status: 'Q2 2025', icon: Globe, color: '#10b981' },
    { title: 'Security Upgrade', status: 'In Progress', icon: Shield, color: '#f59e0b' },
  ];

  return (
    <div className="min-h-screen p-8 text-white">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="mb-8">
          <motion.h1 
            className="text-4xl font-bold mb-2 gradient-text"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            Boltdev
          </motion.h1>
          <motion.p 
            className="text-white/60"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            Series A Metrics Dashboard
          </motion.p>
        </div>

        {/* Top Actions Bar */}
        <motion.div 
          className="glass rounded-2xl p-4 mb-8 flex items-center justify-between"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => setSelectedPeriod('This Month')}
            >
              This Month
            </Button>
            <Button 
              variant="ghost" 
              className="text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => setSelectedPeriod('This Quarter')}
            >
              This Quarter
            </Button>
            <Button 
              variant="ghost" 
              className="text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => setSelectedPeriod('This Year')}
            >
              This Year
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAI(!showAI)}
              className={cn(
                "px-4 py-2 rounded-xl flex items-center gap-2 transition-all",
                "glass-hover border border-white/20",
                showAI && "bg-white/20"
              )}
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">AI Insights</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Add Widget</span>
            </motion.button>
          </div>
        </motion.div>

        {/* AI Assistant Panel */}
        <AnimatePresence>
          {showAI && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="gradient-border rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">AI Orchestrator Active</h3>
                    <p className="text-white/70 mb-4">
                      Your AI assistant is analyzing business metrics and preparing strategic recommendations.
                    </p>
                    <div className="flex items-center gap-4">
                      <Button className="bg-white/10 hover:bg-white/20 text-white border-0">
                        View Insights
                      </Button>
                      <Button variant="ghost" className="text-white/70 hover:text-white">
                        Configure AI
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => (
            <MetricCard key={metric.title} {...metric} delay={index * 0.1} />
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Key Metrics */}
          <div className="lg:col-span-1">
            <ProgressCard title="Key Metrics" metrics={keyMetrics} delay={0.4} />
          </div>

          {/* Strategic Initiatives */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="lg:col-span-2 glass-card rounded-2xl p-6 border border-white/10"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Strategic Initiatives</h3>
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            <div className="space-y-3">
              {initiatives.map((initiative, index) => (
                <motion.div
                  key={initiative.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  whileHover={{ x: 4 }}
                  className="glass rounded-xl p-4 border border-white/5 hover:border-white/20 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg glass transition-all duration-300",
                        "group-hover:scale-110"
                      )}>
                        <initiative.icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{initiative.title}</p>
                        <p className="text-sm text-white/60">{initiative.status}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* SWOT Analysis Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="glass-card rounded-2xl p-6 border border-white/10"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Strengths</h3>
            <p className="text-white/60">No items yet</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
            className="glass-card rounded-2xl p-6 border border-white/10"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Opportunities</h3>
            <p className="text-white/60">No items yet</p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default ModernDashboard;
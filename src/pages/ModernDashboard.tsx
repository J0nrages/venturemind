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
      <Card className="p-6 hover:shadow-xl transition-all duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-xl bg-primary/10 backdrop-blur-sm">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">{title}</p>
          <div className="flex items-baseline gap-2">
            <motion.p 
              className="text-3xl font-bold text-gray-900 dark:text-white"
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
                  change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
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
      </Card>
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
    >
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6 text-foreground">{title}</h3>
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
                <span className="text-sm text-muted-foreground">{metric.label}</span>
                <span className="text-sm font-semibold text-foreground">{metric.value}%</span>
              </div>
              <div className="relative h-2 bg-gray-200 dark:bg-gray-700/50 rounded-full overflow-hidden">
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
      </Card>
    </motion.div>
  );
};

const ModernDashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [showAI, setShowAI] = useState(false);

  const metrics = [
    { title: 'Total Revenue', value: '$0', change: 0, icon: DollarSign, color: 'hsl(var(--chart-1))' },
    { title: 'Active Users', value: '0', change: 0, icon: Users, color: 'hsl(var(--chart-2))' },
    { title: 'Conversion Rate', value: '0%', change: 0, icon: Target, color: 'hsl(var(--chart-3))' },
    { title: 'Growth Rate', value: '0%', change: 0, icon: TrendingUp, color: 'hsl(var(--chart-4))' },
  ];

  const keyMetrics = [
    { label: 'Processing Speed', value: 159, color: 'hsl(var(--chart-1))' },
    { label: 'Accuracy Rate', value: 59.1, color: 'hsl(var(--chart-2))' },
    { label: 'API Uptime', value: 99.9, color: 'hsl(var(--chart-3))' },
  ];

  const initiatives = [
    { title: 'AI Processing', status: '159ms avg · 59.1% accuracy', icon: Brain, color: 'hsl(var(--chart-3))' },
    { title: 'Document Memory', status: 'Available', icon: FileText, color: 'hsl(var(--chart-2))' },
    { title: 'Global Expansion', status: 'Q2 2025', icon: Globe, color: 'hsl(var(--chart-1))' },
    { title: 'Security Upgrade', status: 'In Progress', icon: Shield, color: 'hsl(var(--chart-4))' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100/50 to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="mb-8">
          <motion.h1 
            className="text-4xl font-bold mb-2 text-gray-900 dark:text-white"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            Boltdev
          </motion.h1>
          <motion.p 
            className="text-gray-600 dark:text-gray-300"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            Series A Metrics Dashboard
          </motion.p>
        </div>

        {/* Top Actions Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-4 mb-8">
            <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost"
              onClick={() => setSelectedPeriod('This Month')}
            >
              This Month
            </Button>
            <Button 
              variant="ghost"
              onClick={() => setSelectedPeriod('This Quarter')}
            >
              This Quarter
            </Button>
            <Button 
              variant="ghost"
              onClick={() => setSelectedPeriod('This Year')}
            >
              This Year
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant={showAI ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowAI(!showAI)}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              AI Insights
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Widget
            </Button>
          </div>
            </div>
          </Card>
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
              <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                    <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">AI Orchestrator Active</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      Your AI assistant is analyzing business metrics and preparing strategic recommendations.
                    </p>
                    <div className="flex items-center gap-4">
                      <Button variant="default" size="sm">
                        View Insights
                      </Button>
                      <Button variant="outline" size="sm">
                        Configure AI
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
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
            className="lg:col-span-2"
          >
            <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Strategic Initiatives</h3>
              <Button variant="ghost" size="sm">
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
                  className="rounded-xl p-4 bg-gray-50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-all cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg bg-primary/10 backdrop-blur-sm transition-all duration-300",
                        "group-hover:scale-110"
                      )}>
                        <initiative.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{initiative.title}</p>
                        <p className="text-sm text-muted-foreground">{initiative.status}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                  </div>
                </motion.div>
              ))}
            </div>
            </Card>
          </motion.div>
        </div>

        {/* SWOT Analysis Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          {/* Strengths */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="p-6 bg-gradient-to-br from-blue-50 via-blue-50/50 to-white dark:from-blue-950/30 dark:via-blue-900/20 dark:to-gray-900/90 backdrop-blur-xl border border-blue-200 dark:border-blue-800/50 hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Strengths</h3>
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                  <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm">No items yet</p>
            </Card>
          </motion.div>
          
          {/* Weaknesses */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 }}
          >
            <Card className="p-6 bg-gradient-to-br from-orange-50 via-orange-50/50 to-white dark:from-orange-950/30 dark:via-orange-900/20 dark:to-gray-900/90 backdrop-blur-xl border border-orange-200 dark:border-orange-800/50 hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">Weaknesses</h3>
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50">
                  <Target className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm">No items yet</p>
            </Card>
          </motion.div>
          
          {/* Opportunities */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Card className="p-6 bg-gradient-to-br from-green-50 via-green-50/50 to-white dark:from-green-950/30 dark:via-green-900/20 dark:to-gray-900/90 backdrop-blur-xl border border-green-200 dark:border-green-800/50 hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">Opportunities</h3>
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm">No items yet</p>
            </Card>
          </motion.div>
          
          {/* Threats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95 }}
          >
            <Card className="p-6 bg-gradient-to-br from-red-50 via-red-50/50 to-white dark:from-red-950/30 dark:via-red-900/20 dark:to-gray-900/90 backdrop-blur-xl border border-red-200 dark:border-red-800/50 hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">Threats</h3>
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50">
                  <Zap className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm">No items yet</p>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default ModernDashboard;
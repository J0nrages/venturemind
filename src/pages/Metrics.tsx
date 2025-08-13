import { Card } from '@/components/ui/card';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Clock, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  Plus,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import MetricCard from '../components/MetricCard';
import { StrategicService, LiveMetrics } from '../services/StrategicService';
import { BusinessService, BusinessMetric } from '../services/BusinessService';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function Metrics() {
  const [metrics, setMetrics] = useState<BusinessMetric[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showNewMetricForm, setShowNewMetricForm] = useState(false);
  const [newMetric, setNewMetric] = useState({
    name: '',
    description: '',
    metric_type: 'revenue',
    unit: 'dollars',
    target_value: 0
  });

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const [metricsData, liveMetricsData] = await Promise.all([
        BusinessService.getBusinessMetrics(user.id),
        StrategicService.getLiveMetrics(user.id)
      ]);

      setMetrics(metricsData);
      setLiveMetrics(liveMetricsData);
    } catch (err: any) {
      console.error('Error loading metrics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMetric = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const created = await BusinessService.createBusinessMetric({
        user_id: user.id,
        name: newMetric.name,
        description: newMetric.description,
        metric_type: newMetric.metric_type as any,
        unit: newMetric.unit,
        target_value: newMetric.target_value,
        dimensions: [],
        is_active: true
      });

      setMetrics(prev => [...prev, created]);
      setShowNewMetricForm(false);
      setNewMetric({
        name: '',
        description: '',
        metric_type: 'revenue',
        unit: 'dollars',
        target_value: 0
      });
      
      toast.success('Metric created successfully');
    } catch (error) {
      console.error('Error creating metric:', error);
      toast.error('Failed to create metric');
    }
  };

  // Generate sample data for metrics that don't have real data yet
  const generateSampleData = (metricType: string) => {
    const data = [];
    const now = new Date();
    const days = 14;
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (days - i - 1));
      
      let value;
      if (metricType === 'revenue') {
        value = 10000 + Math.round(Math.random() * 5000) + (i * 200);
      } else if (metricType === 'customer') {
        value = 500 + Math.round(Math.random() * 100) + (i * 10);
      } else {
        value = 80 + Math.round(Math.random() * 10) + (i * 0.5);
      }
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value
      });
    }
    
    return data;
  };

  // Calculate metric values from live data when available
  const getMetricValue = (metric: BusinessMetric) => {
    if (!liveMetrics) return 'No data';
    
    switch (metric.name.toLowerCase()) {
      case 'monthly recurring revenue':
        return liveMetrics.revenue.hasData ? `$${liveMetrics.revenue.current.toLocaleString()}` : 'No data';
      case 'customer acquisition cost':
        return liveMetrics.financial.hasData && liveMetrics.financial.cac > 0 ? `$${liveMetrics.financial.cac.toLocaleString()}` : 'No data';
      case 'monthly churn rate':
        return liveMetrics.financial.hasData ? `${liveMetrics.financial.churnRate}%` : 'No data';
      default:
        return 'No data';
    }
  };

  // Filter metrics by category
  const filteredMetrics = activeCategory === 'all' 
    ? metrics 
    : metrics.filter(m => m.metric_type === activeCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          <span className="text-gray-600 dark:text-gray-400">Loading metrics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Metrics</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={loadMetrics}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-14">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Business Metrics</h1>
          <p className="text-muted-foreground mt-1">Monitor key performance indicators</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewMetricForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80"
          >
            <Plus className="w-4 h-4" />
            Add Metric
          </button>
          <button
            onClick={loadMetrics}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Metric Categories Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <div className="text-sm text-muted-foreground flex items-center">
          <Filter className="w-4 h-4 mr-1" />
          Filter:
        </div>
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1 text-sm rounded-lg whitespace-nowrap ${
            activeCategory === 'all' 
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-muted text-foreground hover:bg-muted/80'
          }`}
        >
          All Metrics
        </button>
        <button
          onClick={() => setActiveCategory('revenue')}
          className={`px-3 py-1 text-sm rounded-lg whitespace-nowrap ${
            activeCategory === 'revenue' 
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-muted text-foreground hover:bg-muted/80'
          }`}
        >
          Revenue
        </button>
        <button
          onClick={() => setActiveCategory('customer')}
          className={`px-3 py-1 text-sm rounded-lg whitespace-nowrap ${
            activeCategory === 'customer' 
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-muted text-foreground hover:bg-muted/80'
          }`}
        >
          Customer
        </button>
        <button
          onClick={() => setActiveCategory('operational')}
          className={`px-3 py-1 text-sm rounded-lg whitespace-nowrap ${
            activeCategory === 'operational' 
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-muted text-foreground hover:bg-muted/80'
          }`}
        >
          Operational
        </button>
        <button
          onClick={() => setActiveCategory('financial')}
          className={`px-3 py-1 text-sm rounded-lg whitespace-nowrap ${
            activeCategory === 'financial' 
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-muted text-foreground hover:bg-muted/80'
          }`}
        >
          Financial
        </button>
        <button
          onClick={() => setActiveCategory('growth')}
          className={`px-3 py-1 text-sm rounded-lg whitespace-nowrap ${
            activeCategory === 'growth' 
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-muted text-foreground hover:bg-muted/80'
          }`}
        >
          Growth
        </button>
      </div>

      {showNewMetricForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/80 backdrop-blur-xl rounded-xl shadow-sm p-6 border border-border/50"
        >
          <h2 className="text-lg font-medium text-foreground mb-4">Create New Metric</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Metric Name
                </label>
                <input
                  type="text"
                  value={newMetric.name}
                  onChange={(e) => setNewMetric({ ...newMetric, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g., Customer Lifetime Value"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  value={newMetric.description}
                  onChange={(e) => setNewMetric({ ...newMetric, description: e.target.value })}
                  className="w-full px-3 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  rows={3}
                  placeholder="What does this metric measure?"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Metric Type
                </label>
                <select
                  value={newMetric.metric_type}
                  onChange={(e) => setNewMetric({ ...newMetric, metric_type: e.target.value })}
                  className="w-full px-3 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="revenue">Revenue</option>
                  <option value="customer">Customer</option>
                  <option value="operational">Operational</option>
                  <option value="financial">Financial</option>
                  <option value="growth">Growth</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Unit
                </label>
                <select
                  value={newMetric.unit}
                  onChange={(e) => setNewMetric({ ...newMetric, unit: e.target.value })}
                  className="w-full px-3 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="dollars">Dollars ($)</option>
                  <option value="percentage">Percentage (%)</option>
                  <option value="count">Count (#)</option>
                  <option value="time">Time (days/hours)</option>
                  <option value="ratio">Ratio (x:y)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Target Value
                </label>
                <input
                  type="number"
                  value={newMetric.target_value}
                  onChange={(e) => setNewMetric({ ...newMetric, target_value: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Target value"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={() => setShowNewMetricForm(false)}
              className="px-4 py-2 text-foreground hover:bg-accent/40 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateMetric}
              disabled={!newMetric.name}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              Create Metric
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredMetrics.map((metric) => {
          // Determine icon based on metric type
          const getIcon = () => {
            switch (metric.metric_type) {
              case 'revenue':
                return DollarSign;
              case 'customer':
                return Users;
              case 'growth':
                return TrendingUp;
              case 'financial':
                return BarChart3;
              default:
                return Clock;
            }
          };

          // Determine change value from live metrics if available
          const getChange = () => {
            if (!liveMetrics) return 0;
            
            if (metric.name.toLowerCase().includes('revenue')) {
              return liveMetrics.revenue.change;
            } else if (metric.name.toLowerCase().includes('churn')) {
              return -1.2; // Negative is good for churn
            } else if (metric.name.toLowerCase().includes('customer')) {
              return liveMetrics.customers.change;
            }
            
            return 0;
          };
          
          return (
            <MetricCard
              key={metric.id}
              title={metric.name}
              value={getMetricValue(metric)}
              change={getChange()}
              icon={getIcon()}
              to="/metrics"
              description={metric.description}
            />
          );
        })}
      </div>

      {filteredMetrics.length === 0 && (
        <div className="bg-card/80 backdrop-blur-xl rounded-xl shadow-sm p-8 text-center">
          <BarChart3 className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No Metrics Found</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            {activeCategory === 'all'
              ? "You haven't created any metrics yet. Add your first metric to start tracking."
              : `You don't have any metrics in the '${activeCategory}' category.`}
          </p>
          <button
            onClick={() => setShowNewMetricForm(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Create Your First Metric
          </button>
        </div>
      )}

      {/* Detailed Metric Charts */}
      {metrics.length > 0 && liveMetrics && (
        <div className="space-y-8">
          {/* MRR Chart */}
          <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Monthly Recurring Revenue
            </h2>
            {liveMetrics.revenue.hasData && liveMetrics.revenue.trending.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={liveMetrics.revenue.trending}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis 
                      domain={['dataMin - 1000', 'dataMax + 1000']}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`$${value.toLocaleString()}`, 'MRR']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--chart-1))" 
                      strokeWidth={2}
                      name="MRR"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
                    <p className="text-muted-foreground">No revenue data available</p>
                    <p className="text-sm text-muted-foreground mt-2">
                    Connect payment integrations to see revenue metrics
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Customer Metrics */}
          <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Customer Metrics
            </h2>
            {liveMetrics.customers.hasData && Object.keys(liveMetrics.customers.segments).length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(liveMetrics.customers.segments).map(([name, value]) => ({
                      name,
                      value
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => [value.toLocaleString(), 'Customers']}
                    />
                    <Bar dataKey="value" fill="hsl(var(--chart-2))" name="Customers" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
                  <p className="text-muted-foreground">No customer segmentation data available</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Add customer data to see segment metrics
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Performance Metrics */}
          <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Performance Metrics
            </h2>
            {liveMetrics.performance.hasData ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-card/70 backdrop-blur-xl border border-border/50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-foreground">Processing Speed</h3>
                    <span className="text-emerald-600 text-sm flex items-center">
                      <ArrowDownRight className="w-4 h-4 mr-0.5" />
                      5.2%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{liveMetrics.performance.processingSpeed}</span>
                      <span className="text-muted-foreground">ms</span>
                  </div>
                  <div className="mt-2 bg-muted h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                
                <div className="p-4 bg-card/70 backdrop-blur-xl border border-border/50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-foreground">Accuracy Rate</h3>
                    <span className="text-emerald-600 text-sm flex items-center">
                      <ArrowUpRight className="w-4 h-4 mr-0.5" />
                      1.3%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{liveMetrics.performance.accuracyRate}</span>
                      <span className="text-muted-foreground">%</span>
                  </div>
                  <div className="mt-2 bg-muted h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full" style={{ width: `${liveMetrics.performance.accuracyRate}%` }}></div>
                  </div>
                </div>
                
                <div className="p-4 bg-card/70 backdrop-blur-xl border border-border/50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-foreground">API Uptime</h3>
                    <span className="text-emerald-600 text-sm flex items-center">
                      <ArrowUpRight className="w-4 h-4 mr-0.5" />
                      0.1%
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{liveMetrics.performance.apiUptime}</span>
                      <span className="text-muted-foreground">%</span>
                  </div>
                  <div className="mt-2 bg-muted h-2 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full" style={{ width: `${liveMetrics.performance.apiUptime}%` }}></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
                <p className="text-muted-foreground">No performance data available</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Use API features to generate performance metrics
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
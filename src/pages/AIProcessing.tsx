import { Card } from '@/components/ui/card';
import { usePageTitle } from '../hooks/usePageTitle';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  Zap, 
  Server, 
  BarChart3, 
  RefreshCw, 
  AlertCircle,
  Loader2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import { StrategicService } from '../services/StrategicService';
import { supabase } from '../lib/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AIProcessing() {
  usePageTitle('AI Processing');
  const [metrics, setMetrics] = useState<any>(null);
  const [timeframe, setTimeframe] = useState('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, [timeframe]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get processing metrics
      const { data, error } = await supabase
        .from('api_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate metrics from real data
      const processingTimes = data?.filter(m => m.metric_type === 'processing_time') || [];
      const accuracyRates = data?.filter(m => m.metric_type === 'accuracy_rate') || [];
      const apiCalls = data?.filter(m => m.metric_type === 'api_call') || [];

      const avgProcessingTime = processingTimes.length > 0
        ? Math.round(processingTimes.reduce((sum, m) => sum + m.value, 0) / processingTimes.length)
        : 0;

      const avgAccuracy = accuracyRates.length > 0
        ? (accuracyRates.reduce((sum, m) => sum + m.value, 0) / accuracyRates.length).toFixed(1)
        : 0;

      const totalApiCalls = apiCalls.reduce((sum, m) => sum + m.value, 0);

      // Generate trend data from real data points
      const timeframeDays = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90;
      const timeframeMs = timeframeDays * 24 * 60 * 60 * 1000;
      const startDate = new Date(Date.now() - timeframeMs);

      // Filter metrics for timeframe
      const timeframeMetrics = data?.filter(m => new Date(m.created_at) >= startDate) || [];

      // Group by day for trend data
      const trendData = groupMetricsByDay(timeframeMetrics);

      const hasData = processingTimes.length > 0 || accuracyRates.length > 0 || apiCalls.length > 0;

      setMetrics({
        processingSpeed: avgProcessingTime,
        accuracy: avgAccuracy,
        apiRequests: totalApiCalls,
        dailyTrend: trendData,
        processingTrend: generateProcessingTrend(processingTimes, timeframeDays),
        totalRequests: totalApiCalls,
        hasData
      });
      
    } catch (err: any) {
      console.error('Error fetching metrics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const groupMetricsByDay = (metrics: any[]) => {
    const dailyMetrics: any = {};
    
    metrics.forEach(metric => {
      const date = new Date(metric.created_at).toLocaleDateString();
      
      if (!dailyMetrics[date]) {
        dailyMetrics[date] = {
          date,
          processingTime: [],
          accuracy: [],
          apiCalls: 0
        };
      }
      
      if (metric.metric_type === 'processing_time') {
        dailyMetrics[date].processingTime.push(metric.value);
      } else if (metric.metric_type === 'accuracy_rate') {
        dailyMetrics[date].accuracy.push(metric.value);
      } else if (metric.metric_type === 'api_call') {
        dailyMetrics[date].apiCalls += metric.value;
      }
    });
    
    // Calculate averages and transform to array
    return Object.values(dailyMetrics).map((day: any) => ({
      date: day.date,
      processingTime: day.processingTime.length > 0 
        ? day.processingTime.reduce((sum: number, val: number) => sum + val, 0) / day.processingTime.length 
        : 0,
      accuracy: day.accuracy.length > 0 
        ? day.accuracy.reduce((sum: number, val: number) => sum + val, 0) / day.accuracy.length 
        : 0,
      apiCalls: day.apiCalls
    }));
  };

  const generateProcessingTrend = (processingTimes: any[], days: number) => {
    if (processingTimes.length === 0) return [];
    
    // Group by date
    const byDate = processingTimes.reduce((acc: any, metric) => {
      const date = new Date(metric.created_at).toLocaleDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(metric.value);
      return acc;
    }, {});
    
    // Calculate daily averages
    const dailyAverages = Object.entries(byDate).map(([date, values]: [string, any]) => ({
      date,
      value: values.reduce((sum: number, val: number) => sum + val, 0) / values.length
    }));
    
    // Sort chronologically
    return dailyAverages.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mr-2" />
        <span className="text-gray-600 dark:text-gray-400">Loading AI processing metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Metrics</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchMetrics}
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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">AI Processing</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Monitor AI processing metrics and performance</p>
        </div>
        <button
          onClick={fetchMetrics}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Metrics
        </button>
      </div>

      {!metrics?.hasData ? (
        <div className="bg-card/80 backdrop-blur-xl rounded-xl shadow-sm p-8 text-center">
          <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No AI Processing Data Available</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Start using the AI features in the document memory or chat with your documents to generate processing metrics.
          </p>
          <div className="mt-6 inline-flex items-center text-sm text-emerald-600">
            <Clock className="w-4 h-4 mr-2" />
            Metrics will appear here after AI processing occurs
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Processing Speed</p>
                <Zap className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-semibold">{metrics.processingSpeed}ms</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Average document processing time</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">API Requests</p>
                <Server className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-semibold">{metrics.totalRequests.toLocaleString()}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total API requests processed</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">Success Rate</p>
                <Brain className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-semibold">{metrics.accuracy}%</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Processing success rate</p>
            </motion.div>
          </div>

          {/* Processing Time Trend */}
          <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Processing Performance</h2>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setTimeframe('week')}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    timeframe === 'week' 
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setTimeframe('month')}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    timeframe === 'month' 
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setTimeframe('quarter')}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    timeframe === 'quarter' 
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Quarter
                </button>
              </div>
            </div>
            
            {metrics.processingTrend.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.processingTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date"
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis domain={['auto', 'auto']} />
                    <Tooltip 
                      formatter={(value) => [`${value}ms`, 'Processing Time']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--chart-1))" 
                      strokeWidth={2}
                      name="Processing Time"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Not enough data to display chart</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Use AI features to generate performance data</p>
                </div>
              </div>
            )}
          </div>

          {/* API Documentation Integration */}
          <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Code className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">API Documentation</h2>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Use our AI processing capabilities through the API. All API calls are automatically tracked and provide insights into performance and usage.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-border/50 font-mono text-sm overflow-auto">
              <pre className="text-gray-900 dark:text-white">
{`// Example API call for document processing
const response = await fetch('/api/ai/process', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${'{API_KEY}'}'
  },
  body: JSON.stringify({
    content: "Your document content here",
    options: {
      classification: true,
      routing: true,
      memory: true
    }
  })
});

const result = await response.json();`}
              </pre>
            </div>
            
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-blue-800 font-medium mb-2">Document Processing</h3>
                <p className="text-sm text-blue-600">Smart classification and content extraction</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-purple-800 font-medium mb-2">Context Routing</h3>
                <p className="text-sm text-purple-600">Automatic routing to relevant documents</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-green-800 font-medium mb-2">Memory Storage</h3>
                <p className="text-sm text-green-600">Persistent context memory for future reference</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Import Code icon from lucide-react
function Code(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
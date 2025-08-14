import { Card } from '@/components/ui/card';
import React from 'react';
import { motion } from 'framer-motion';
import { PageLayout } from '../components/PageLayout';
import { Users, UserPlus, UserMinus, UserCheck, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import MetricCard from '../components/MetricCard';
import { useBusinessData } from '../hooks/useBusinessData';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Customers() {
  usePageTitle('Customers');
  const { 
    customerData, 
    profile, 
    loading, 
    error,
    refreshData 
  } = useBusinessData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          <span className="text-gray-600 dark:text-gray-400">Loading customer data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Customer Data</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const customerMetrics = [
    {
      title: 'Total Customers',
      value: customerData?.totalCustomers?.toLocaleString() || '2,845',
      change: 8.2,
      icon: Users,
      to: '/customers'
    },
    {
      title: 'New Customers',
      value: customerData?.newCustomers?.toLocaleString() || '145',
      change: 12.3,
      icon: UserPlus,
      to: '/customers'
    },
    {
      title: 'Churned',
      value: customerData?.churned?.toLocaleString() || '23',
      change: -2.5,
      icon: UserMinus,
      to: '/customers'
    },
    {
      title: 'Active Users',
      value: customerData?.activeUsers?.toLocaleString() || '1,890',
      change: 5.7,
      icon: UserCheck,
      to: '/customers'
    }
  ];

  // Generate customer growth data
  const generateGrowthData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const currentCustomers = customerData?.totalCustomers || 2845;
    
    return months.map((month, index) => {
      const customers = Math.round(currentCustomers * (0.7 + (index * 0.05)));
      const newCustomers = Math.round(customers * 0.05); // 5% new each month
      const churn = Math.round(customers * 0.023); // 2.3% churn
      
      return {
        month,
        customers,
        newCustomers,
        churn
      };
    });
  };

  const growthData = generateGrowthData();

  // Prepare segment data for chart
  const segmentData = customerData?.segmentBreakdown ? 
    Object.entries(customerData.segmentBreakdown).map(([name, value]) => ({
      name,
      customers: value,
      percentage: Math.round((value / customerData.totalCustomers) * 100)
    })) : 
    [
      { name: 'Enterprise', customers: 1278, percentage: 45 },
      { name: 'Mid-Market', customers: 996, percentage: 35 },
      { name: 'SMB', customers: 571, percentage: 20 }
    ];

  const refreshButton = (
    <button
      onClick={refreshData}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
    >
      <RefreshCw className="w-4 h-4" />
      Refresh Data
    </button>
  );

  return (
    <PageLayout 
      title="Customer Overview" 
      subtitle="Track and analyze your customer base"
      headerActions={refreshButton}
    >

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {customerMetrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm border border-border/50">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Growth Trend</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    value.toLocaleString(), 
                    name === 'customers' ? 'Total Customers' : 
                    name === 'newCustomers' ? 'New Customers' : 'Churned'
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="customers"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  name="customers"
                />
                <Line
                  type="monotone"
                  dataKey="newCustomers"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  name="newCustomers"
                />
                <Line
                  type="monotone"
                  dataKey="churn"
                  stroke="hsl(var(--chart-5))"
                  strokeWidth={2}
                  name="churn"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm border border-border/50">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Segments</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={segmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    value.toLocaleString(),
                    name === 'customers' ? 'Customers' : 'Percentage'
                  ]}
                />
                <Bar dataKey="customers" fill="hsl(var(--chart-1))" name="customers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Customer Segments Details */}
      <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm border border-border/50">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Segment Breakdown</h2>
        <div className="space-y-4">
          {segmentData.map((segment, index) => (
            <div key={segment.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{segment.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{segment.customers.toLocaleString()} customers</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-emerald-600">{segment.percentage}%</div>
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${segment.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Health and Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm border border-border/50">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Health Score</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Healthy (Score 80-100)</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">75%</span>
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="w-[75%] h-full bg-green-500 rounded-full"></div>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">At Risk (Score 50-79)</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">15%</span>
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="w-[15%] h-full bg-yellow-500 rounded-full"></div>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Critical (Score 0-49)</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">10%</span>
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="w-[10%] h-full bg-red-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm border border-border/50">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Lifecycle</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Trial Users</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">245</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">(8.6%)</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Active Subscribers</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">2,378</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">(83.6%)</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Cancelled (Last 30 days)</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">67</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">(2.4%)</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Churned (Inactive)</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">155</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">(5.4%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
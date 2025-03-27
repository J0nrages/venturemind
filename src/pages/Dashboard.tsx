import React from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  RefreshCw,
  UserPlus,
  AlertCircle,
  Clock,
  Wallet
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import MetricCard from '../components/MetricCard';

const revenueData = [
  { month: 'Jan', mrr: 35000, arr: 420000 },
  { month: 'Feb', mrr: 42000, arr: 504000 },
  { month: 'Mar', mrr: 38000, arr: 456000 },
  { month: 'Apr', mrr: 45000, arr: 540000 },
  { month: 'May', mrr: 48000, arr: 576000 },
  { month: 'Jun', mrr: 54000, arr: 648000 }
];

const metrics = [
  {
    title: 'Monthly Recurring Revenue',
    value: '$54,000',
    change: 12.5,
    icon: DollarSign
  },
  {
    title: 'Annual Recurring Revenue',
    value: '$648,000',
    change: 8.2,
    icon: TrendingUp
  },
  {
    title: 'Active Customers',
    value: '2,845',
    change: 5.7,
    icon: Users
  },
  {
    title: 'Customer Churn Rate',
    value: '2.3%',
    change: -0.8,
    icon: RefreshCw
  }
];

const additionalMetrics = [
  {
    title: 'Customer Acquisition Cost',
    value: '$125',
    change: -3.2,
    icon: UserPlus
  },
  {
    title: 'Average Revenue Per User',
    value: '$89',
    change: 4.5,
    icon: Wallet
  },
  {
    title: 'Lifetime Value',
    value: '$1,240',
    change: 7.8,
    icon: TrendingUp
  },
  {
    title: 'Time to Convert',
    value: '18 days',
    change: -2.1,
    icon: Clock
  }
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Dashboard Overview</h1>
        <p className="text-gray-500 mt-1">Track your key business metrics and performance indicators</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Revenue Growth</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="mrr"
                  stackId="1"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.2}
                />
                <Area
                  type="monotone"
                  dataKey="arr"
                  stackId="2"
                  stroke="#6366F1"
                  fill="#6366F1"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Customer Growth</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="mrr"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: '#10B981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {additionalMetrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Customer Segments</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Enterprise</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">45%</span>
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="w-[45%] h-full bg-emerald-500 rounded-full"></div>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Mid-Market</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">35%</span>
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="w-[35%] h-full bg-emerald-500 rounded-full"></div>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Small Business</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">20%</span>
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="w-[20%] h-full bg-emerald-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Subscription Plans</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Premium</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">40%</span>
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="w-[40%] h-full bg-blue-500 rounded-full"></div>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Professional</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">35%</span>
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="w-[35%] h-full bg-blue-500 rounded-full"></div>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Basic</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">25%</span>
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="w-[25%] h-full bg-blue-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Health Score</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Healthy</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">75%</span>
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="w-[75%] h-full bg-green-500 rounded-full"></div>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">At Risk</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">15%</span>
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="w-[15%] h-full bg-yellow-500 rounded-full"></div>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Churning</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">10%</span>
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="w-[10%] h-full bg-red-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
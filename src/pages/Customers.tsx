import React from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, UserMinus, UserCheck } from 'lucide-react';
import MetricCard from '../components/MetricCard';

const customerMetrics = [
  {
    title: 'Total Customers',
    value: '2,845',
    change: 8.2,
    icon: Users
  },
  {
    title: 'New Customers',
    value: '145',
    change: 12.3,
    icon: UserPlus
  },
  {
    title: 'Churned',
    value: '23',
    change: -2.5,
    icon: UserMinus
  },
  {
    title: 'Active Users',
    value: '1,890',
    change: 5.7,
    icon: UserCheck
  }
];

export default function Customers() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Customer Overview</h1>
        <p className="text-gray-500 mt-1">Track and analyze your customer base</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {customerMetrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>
    </div>
  );
}
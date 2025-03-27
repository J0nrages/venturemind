import React from 'react';
import { DollarSign } from 'lucide-react';
import MetricCard from '../components/MetricCard';

export default function Revenue() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Revenue Analytics</h1>
        <p className="text-gray-500 mt-1">Track your business revenue and financial metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value="$54,239"
          change={12.5}
          icon={DollarSign}
        />
      </div>
    </div>
  );
}
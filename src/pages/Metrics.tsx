import React from 'react';
import { BarChart3 } from 'lucide-react';
import MetricCard from '../components/MetricCard';

export default function Metrics() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Business Metrics</h1>
        <p className="text-gray-500 mt-1">Monitor key performance indicators</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Growth Rate"
          value="23.5%"
          change={4.1}
          icon={BarChart3}
        />
      </div>
    </div>
  );
}
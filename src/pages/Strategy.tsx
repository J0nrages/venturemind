import React from 'react';
import { Target, TrendingUp, Users } from 'lucide-react';
import MetricCard from '../components/MetricCard';

export default function Strategy() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Strategy</h1>
        <p className="text-gray-500 mt-1">Strategic initiatives and growth metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Market Share"
          value="23%"
          change={2.5}
          icon={Target}
          to="/metrics"
          description="Current market penetration"
        />
        <MetricCard
          title="Growth Rate"
          value="32%"
          change={8.2}
          icon={TrendingUp}
          to="/metrics"
          description="Month over month growth"
        />
        <MetricCard
          title="Enterprise Clients"
          value="45%"
          change={5.7}
          icon={Users}
          to="/metrics"
          description="Enterprise segment share"
        />
      </div>
    </div>
  );
}
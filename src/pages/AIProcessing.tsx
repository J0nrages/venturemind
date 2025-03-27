import React from 'react';
import { Brain, Zap, Server } from 'lucide-react';
import MetricCard from '../components/MetricCard';

export default function AIProcessing() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">AI Processing</h1>
        <p className="text-gray-500 mt-1">Monitor AI processing metrics and performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Processing Speed"
          value="98ms"
          change={-12.5}
          icon={Zap}
          to="/metrics"
          description="Average document processing time"
        />
        <MetricCard
          title="API Requests"
          value="2.3M"
          change={8.2}
          icon={Server}
          to="/metrics"
          description="Monthly API requests"
        />
        <MetricCard
          title="Success Rate"
          value="99.2%"
          change={0.5}
          icon={Brain}
          to="/metrics"
          description="Processing success rate"
        />
      </div>
    </div>
  );
}
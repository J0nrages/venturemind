import { Card } from '@/components/ui/card';
import React from 'react';
import { Building2 } from 'lucide-react';
import MetricCard from '../components/MetricCard';

export default function Company() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Company Overview</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">View your company information and settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Employees"
          value="42"
          change={15.0}
          icon={Building2}
        />
      </div>
    </div>
  );
}
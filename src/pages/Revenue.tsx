import { Card } from '@/components/ui/card';
import React from 'react';
import { DollarSign } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import { usePageTitle } from '../hooks/usePageTitle';
import { PageLayout } from '../components/PageLayout';

export default function Revenue() {
  usePageTitle('Revenue');
  return (
    <PageLayout 
      title="Revenue Analytics" 
      subtitle="Track your business revenue and financial metrics"
    >

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value="$54,239"
          change={12.5}
          icon={DollarSign}
        />
      </div>
    </PageLayout>
  );
}
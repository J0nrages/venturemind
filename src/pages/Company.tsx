import { Card } from '@/components/ui/card';
import React from 'react';
import { Building2 } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import { usePageTitle } from '../hooks/usePageTitle';
import { PageLayout } from '../components/PageLayout';

export default function Company() {
  usePageTitle('Company');
  return (
    <PageLayout 
      title="Company Overview" 
      subtitle="View your company information and settings"
    >

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Employees"
          value="42"
          change={15.0}
          icon={Building2}
        />
      </div>
    </PageLayout>
  );
}
import { Card } from '@/components/ui/card';
import React from 'react';
import { FileText, FilePlus, FileCheck } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import { usePageTitle } from '../hooks/usePageTitle';
import { PageLayout } from '../components/PageLayout';

export default function Documents() {
  usePageTitle('Documents');
  return (
    <PageLayout 
      title="Documents" 
      subtitle="Track document processing and analytics"
    >

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Total Documents"
          value="892k"
          change={15.3}
          icon={FileText}
          to="/metrics"
          description="Documents processed this month"
        />
        <MetricCard
          title="New Documents"
          value="12.5k"
          change={5.8}
          icon={FilePlus}
          to="/metrics"
          description="Added in last 24 hours"
        />
        <MetricCard
          title="Processing Rate"
          value="99.8%"
          change={0.2}
          icon={FileCheck}
          to="/metrics"
          description="Successful processing rate"
        />
      </div>
    </PageLayout>
  );
}
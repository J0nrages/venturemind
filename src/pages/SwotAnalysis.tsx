import { Card } from '@/components/ui/card';
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

const swotData = {
  strengths: {
    title: 'Strengths',
    color: 'bg-blue-500 dark:bg-blue-600',
    items: [
      'State-of-the-art AI models',
      'High accuracy rates',
      'Fast processing speed',
      'Scalable infrastructure',
      'Strong enterprise relationships',
      'Industry-leading security',
      'Robust API ecosystem',
      'Global data center presence'
    ],
    description: 'Our competitive advantages and core capabilities'
  },
  weaknesses: {
    title: 'Weaknesses',
    color: 'bg-orange-500 dark:bg-orange-600',
    items: [
      'Long sales cycles',
      'Complex implementation',
      'Resource intensive',
      'High customer acquisition cost',
      'Limited market penetration',
      'Dependencies on third-party services',
      'Technical debt in legacy systems',
      'Skills gap in emerging technologies'
    ],
    description: 'Areas where we need to improve'
  },
  opportunities: {
    title: 'Opportunities',
    color: 'bg-green-500 dark:bg-green-600',
    items: [
      'New market segments',
      'Geographic expansion',
      'Product diversification',
      'Strategic partnerships',
      'Emerging AI technologies',
      'Industry consolidation',
      'Regulatory changes',
      'Growing demand for automation'
    ],
    description: 'External factors we can capitalize on'
  },
  threats: {
    title: 'Threats',
    color: 'bg-red-500 dark:bg-red-600',
    items: [
      'Emerging competitors',
      'Rapid tech changes',
      'Market saturation',
      'Regulatory challenges',
      'Economic uncertainty',
      'Cybersecurity risks',
      'Talent acquisition',
      'Customer churn'
    ],
    description: 'External risks to our business'
  }
};

export default function SwotAnalysis() {
  const { type } = useParams<{ type: keyof typeof swotData }>();
  const navigate = useNavigate();
  const data = type ? swotData[type] : null;

  if (!data) {
    navigate('/');
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 mb-8"
      >
        <ChevronLeft className="w-5 h-5" />
        Back to Dashboard
      </button>

      <div className={`bg-${data.color}-50 p-8 rounded-xl`}>
        <h1 className={`text-3xl font-bold text-${data.color}-700 mb-2`}>
          {data.title}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">{data.description}</p>

        <div className="grid gap-4">
          {data.items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-card/80 backdrop-blur-xl p-4 rounded-lg shadow-sm border border-${data.color}-100`}
            >
              <p className="text-gray-900 dark:text-white">{item}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
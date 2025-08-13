import { Card } from '@/components/ui/card';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DollarSign, Users, TrendingUp, Clock, Wallet } from 'lucide-react';

// Generate SaaS metrics data
const generateMetricsData = () => {
  const data = [];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  let mrr = 54000;
  let customers = 2845;
  let arpu = mrr / customers;
  let cac = 125;
  let ltv = 1240;
  let churnRate = 2.3;
  
  for (let year = 2025; year <= 2028; year++) {
    for (let month = 0; month < 12; month++) {
      // Apply some randomization for realistic variations
      const mrrGrowth = 1 + (Math.random() * 0.04 + 0.01); // 1-5% growth
      const customerGrowth = 1 + (Math.random() * 0.03 + 0.01); // 1-4% growth
      const churnChange = Math.random() * 0.2 - 0.1; // -0.1 to +0.1 change
      
      mrr = Math.round(mrr * mrrGrowth);
      customers = Math.round(customers * customerGrowth);
      arpu = Math.round(mrr / customers);
      cac = Math.round(cac * (1 + (Math.random() * 0.02 - 0.01))); // -1% to +1% change
      ltv = Math.round(arpu * 12 / (churnRate / 100));
      churnRate = Math.max(0.5, Math.min(5, churnRate + churnChange)); // Keep between 0.5-5%
      
      data.push({
        date: `${months[month]} ${year}`,
        mrr,
        customers,
        arpu,
        cac,
        ltv,
        churnRate,
        ltvCacRatio: Math.round((ltv / cac) * 10) / 10
      });
    }
  }
  
  return data;
};

const metricsData = generateMetricsData();

const unitEconomicsData = [
  { name: 'Basic', cac: 95, initialArpu: 49, ltv: 980, payback: 7 },
  { name: 'Premium', cac: 125, initialArpu: 99, ltv: 1980, payback: 5 },
  { name: 'Enterprise', cac: 350, initialArpu: 299, ltv: 5980, payback: 4 },
];

export default function ProformaMetrics() {
  const [metric, setMetric] = useState('mrr');
  
  // Current month data (latest)
  const currentMonth = metricsData[metricsData.length - 1];
  
  const metricOptions = [
    { value: 'mrr', label: 'Monthly Recurring Revenue', prefix: '$', format: 'currency' },
    { value: 'customers', label: 'Total Customers', prefix: '', format: 'number' },
    { value: 'arpu', label: 'Average Revenue Per User', prefix: '$', format: 'currency' },
    { value: 'cac', label: 'Customer Acquisition Cost', prefix: '$', format: 'currency' },
    { value: 'ltv', label: 'Customer Lifetime Value', prefix: '$', format: 'currency' },
    { value: 'churnRate', label: 'Monthly Churn Rate', prefix: '', suffix: '%', format: 'percent' },
    { value: 'ltvCacRatio', label: 'LTV:CAC Ratio', prefix: '', format: 'ratio' }
  ];
  
  const getCurrentMetric = () => {
    const metricInfo = metricOptions.find(m => m.value === metric);
    if (!metricInfo) return null;
    
    let value = currentMonth[metric];
    let displayValue = value.toLocaleString();
    
    if (metricInfo.prefix) {
      displayValue = `${metricInfo.prefix}${displayValue}`;
    }
    
    if (metricInfo.suffix) {
      displayValue = `${displayValue}${metricInfo.suffix}`;
    }
    
    return {
      label: metricInfo.label,
      value: displayValue
    };
  };
  
  const currentMetric = getCurrentMetric();
  
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Recurring Revenue</p>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-semibold mt-1">${currentMonth.mrr.toLocaleString()}</h3>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">LTV:CAC Ratio</p>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-semibold mt-1">{currentMonth.ltvCacRatio}:1</h3>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Customer Lifetime Value</p>
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-semibold mt-1">${currentMonth.ltv.toLocaleString()}</h3>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Churn Rate</p>
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-semibold mt-1">{currentMonth.churnRate.toFixed(1)}%</h3>
        </motion.div>
      </div>
      
      <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm">
        <div className="mb-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">SaaS Metrics Over Time</h2>
          </div>
          
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {metricOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} interval={3} />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const metricInfo = metricOptions.find(m => m.value === metric);
                  if (!metricInfo) return value;
                  
                  if (metricInfo.format === 'currency') {
                    return `$${(value / 1000).toFixed(0)}k`;
                  } else if (metricInfo.format === 'percent') {
                    return `${value}%`;
                  } else if (metricInfo.format === 'ratio') {
                    return `${value}:1`;
                  }
                  return value;
                }}
              />
              <Tooltip 
                formatter={(value, name) => {
                  const metricInfo = metricOptions.find(m => m.value === metric);
                  if (!metricInfo) return [value, name];
                  
                  if (metricInfo.format === 'currency') {
                    return [`$${value.toLocaleString()}`, metricInfo.label];
                  } else if (metricInfo.format === 'percent') {
                    return [`${value}%`, metricInfo.label];
                  } else if (metricInfo.format === 'ratio') {
                    return [`${value}:1`, metricInfo.label];
                  }
                  return [value.toLocaleString(), metricInfo.label];
                }}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey={metric} 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
                name={currentMetric?.label || ''}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm">
          <div className="mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Customer Segmentation</h2>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={unitEconomicsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" tickFormatter={(value) => `$${(value).toFixed(0)}`} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${(value).toFixed(0)} mo`} />
                <Tooltip formatter={(value, name) => {
                  if (name === 'initialArpu') return [`$${value}`, 'Monthly ARPU'];
                  if (name === 'ltv') return [`$${value}`, 'Lifetime Value'];
                  if (name === 'cac') return [`$${value}`, 'Acquisition Cost'];
                  if (name === 'payback') return [`${value} months`, 'CAC Payback'];
                  return [value, name];
                }} />
                <Legend 
                  formatter={(value) => {
                    if (value === 'initialArpu') return 'Monthly ARPU';
                    if (value === 'ltv') return 'Lifetime Value';
                    if (value === 'cac') return 'Acquisition Cost';
                    if (value === 'payback') return 'CAC Payback (months)';
                    return value;
                  }}
                />
                <Bar yAxisId="left" dataKey="initialArpu" fill="#34D399" name="initialArpu" />
                <Bar yAxisId="left" dataKey="ltv" fill="hsl(var(--chart-1))" name="ltv" />
                <Bar yAxisId="left" dataKey="cac" fill="#6366F1" name="cac" />
                <Bar yAxisId="right" dataKey="payback" fill="#F59E0B" name="payback" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm">
          <div className="mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Projected CAC Payback</h2>
          </div>
          
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">Basic Plan</span>
                <span className="text-gray-700">7 months payback period</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '58.3%' }}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>0</span>
                <span>3 mo</span>
                <span>6 mo</span>
                <span>9 mo</span>
                <span>12 mo</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">Premium Plan</span>
                <span className="text-gray-700">5 months payback period</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '41.7%' }}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>0</span>
                <span>3 mo</span>
                <span>6 mo</span>
                <span>9 mo</span>
                <span>12 mo</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">Enterprise Plan</span>
                <span className="text-gray-700">4 months payback period</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '33.3%' }}></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>0</span>
                <span>3 mo</span>
                <span>6 mo</span>
                <span>9 mo</span>
                <span>12 mo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
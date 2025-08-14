import { Card } from '@/components/ui/card';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import BackButton from '../components/BackButton';
import { usePageTitle } from '../hooks/usePageTitle';

interface BusinessData {
  company_name: string;
  industry: string;
  size: string;
  revenue_model: string;
  billing_cycle: string;
  start_date: string;
  marketing_budget?: number;
  customer_segments: string[];
}

const industries = [
  'SaaS',
  'E-commerce',
  'Healthcare',
  'Financial Services',
  'Education',
  'Manufacturing',
  'Other'
];

const companySizes = [
  'Startup (1-10)',
  'Small (11-50)',
  'Medium (51-200)',
  'Large (201-1000)',
  'Enterprise (1000+)'
];

const revenueModels = [
  'Subscription',
  'Usage-based',
  'One-time purchases',
  'Marketplace',
  'Hybrid'
];

const billingCycles = [
  'Monthly',
  'Annual',
  'Custom'
];

const customerSegments = [
  'Enterprise',
  'SMB',
  'Consumer',
  'Government',
  'Education',
  'Healthcare'
];

export default function BusinessSetup() {
  usePageTitle('Business Setup');
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [businessData, setBusinessData] = useState<BusinessData>({
    company_name: '',
    industry: '',
    size: '',
    revenue_model: '',
    billing_cycle: '',
    start_date: new Date().toISOString().split('T')[0],
    marketing_budget: undefined,
    customer_segments: []
  });

  const handleInputChange = (field: keyof BusinessData, value: any) => {
    setBusinessData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSegmentToggle = (segment: string) => {
    setBusinessData(prev => ({
      ...prev,
      customer_segments: prev.customer_segments.includes(segment)
        ? prev.customer_segments.filter(s => s !== segment)
        : [...prev.customer_segments, segment]
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Create initial business profile
      const { error: profileError } = await supabase
        .from('business_profiles')
        .insert({
          user_id: user.id,
          ...businessData
        });

      if (profileError) throw profileError;

      // Create initial subscription if applicable
      if (businessData.revenue_model === 'Subscription') {
        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: user.id,
            plan_id: 'default',
            amount: 0,
            interval: businessData.billing_cycle.toLowerCase(),
            status: 'pending'
          });

        if (subscriptionError) throw subscriptionError;
      }

      // Log the setup event
      await supabase
        .from('customer_events')
        .insert({
          user_id: user.id,
          event_type: 'business_setup',
          metadata: businessData
        });

      toast.success('Business profile created successfully!');
      navigate('/plans');
    } catch (error: any) {
      console.error('Setup error:', error);
      toast.error('Failed to save business profile');
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return businessData.company_name && businessData.industry && businessData.size;
      case 2:
        return businessData.revenue_model && businessData.billing_cycle;
      case 3:
        return businessData.start_date && businessData.customer_segments.length > 0;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={businessData.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Enter your company name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry
              </label>
              <select
                value={businessData.industry}
                onChange={(e) => handleInputChange('industry', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Select industry</option>
                {industries.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Size
              </label>
              <select
                value={businessData.size}
                onChange={(e) => handleInputChange('size', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Select size</option>
                {companySizes.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Revenue Model
              </label>
              <select
                value={businessData.revenue_model}
                onChange={(e) => handleInputChange('revenue_model', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Select revenue model</option>
                {revenueModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Billing Cycle
              </label>
              <select
                value={businessData.billing_cycle}
                onChange={(e) => handleInputChange('billing_cycle', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Select billing cycle</option>
                {billingCycles.map(cycle => (
                  <option key={cycle} value={cycle}>{cycle}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Marketing Budget (optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  value={businessData.marketing_budget || ''}
                  onChange={(e) => handleInputChange('marketing_budget', parseFloat(e.target.value) || undefined)}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Enter monthly budget"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Start Date
              </label>
              <input
                type="date"
                value={businessData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Segments
              </label>
              <div className="grid grid-cols-2 gap-2">
                {customerSegments.map(segment => (
                  <button
                    key={segment}
                    type="button"
                    onClick={() => handleSegmentToggle(segment)}
                    className={`p-2 rounded-lg border ${
                      businessData.customer_segments.includes(segment)
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'border-gray-300 hover:border-emerald-500'
                    }`}
                  >
                    {segment}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-card/80 backdrop-blur-xl rounded-xl shadow-lg p-8"
      >
        <div className="flex items-center justify-center mb-8">
          <Building2 className="w-8 h-8 text-emerald-600 mr-2" />
          <h1 className="text-2xl font-bold">Business Setup</h1>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center">
            {[1, 2, 3].map((stepNumber) => (
              <div
                key={stepNumber}
                className={`w-1/3 h-2 rounded-full ${
                  stepNumber <= step ? 'bg-emerald-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            Step {step} of 3
          </div>
        </div>

        {renderStep()}

        <div className="mt-8 flex justify-between">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          
          <div className="ml-auto">
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!isStepValid()}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !isStepValid()}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Setting up...' : 'Complete Setup'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
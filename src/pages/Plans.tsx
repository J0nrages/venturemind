import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import BackButton from '../components/BackButton';

const plans = [
  {
    name: 'Starter',
    price: 49,
    interval: 'month',
    features: [
      'Up to 1,000 documents/month',
      'Basic AI processing',
      'Email support',
      'API access'
    ],
    recommended: false
  },
  {
    name: 'Professional',
    price: 99,
    interval: 'month',
    features: [
      'Up to 5,000 documents/month',
      'Advanced AI processing',
      'Priority support',
      'API access with higher limits',
      'Custom templates'
    ],
    recommended: true
  },
  {
    name: 'Enterprise',
    price: 299,
    interval: 'month',
    features: [
      'Unlimited documents',
      'Custom AI models',
      'Dedicated support',
      'Unlimited API access',
      'Custom integrations',
      'SSO & advanced security'
    ],
    recommended: false
  }
];

export default function Plans() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPlan = async (planName: string) => {
    setLoading(planName);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Create subscription record
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_id: planName.toLowerCase(),
          amount: plans.find(p => p.name === planName)?.price || 0,
          interval: 'monthly',
          status: 'active'
        });

      if (subscriptionError) throw subscriptionError;

      // Log the subscription event
      await supabase
        .from('customer_events')
        .insert({
          user_id: user.id,
          event_type: 'subscription_created',
          metadata: {
            plan: planName,
            amount: plans.find(p => p.name === planName)?.price
          }
        });

      toast.success('Subscription activated successfully!');
      navigate('/');
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error('Failed to activate subscription');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8">
          <BackButton />
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-600">
            Select the perfect plan for your business needs
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative bg-white rounded-2xl shadow-lg overflow-hidden ${
                plan.recommended ? 'ring-2 ring-emerald-500' : ''
              }`}
            >
              {plan.recommended && (
                <div className="absolute top-0 right-0 bg-emerald-500 text-white px-3 py-1 text-sm font-medium rounded-bl-lg">
                  Recommended
                </div>
              )}
              
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold tracking-tight text-gray-900">
                    ${plan.price}
                  </span>
                  <span className="ml-1 text-xl font-semibold text-gray-500">
                    /month
                  </span>
                </div>

                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                      <span className="ml-3 text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan.name)}
                  disabled={loading === plan.name}
                  className={`mt-8 w-full py-3 px-4 rounded-lg font-semibold text-white 
                    ${plan.recommended 
                      ? 'bg-emerald-600 hover:bg-emerald-700' 
                      : 'bg-gray-800 hover:bg-gray-900'
                    } transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === plan.name ? 'Activating...' : 'Select Plan'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
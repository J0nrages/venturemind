import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

interface OnboardingCheckProps {
  children: React.ReactNode;
  requiredData: {
    hasBusinessProfile: boolean;
    hasSubscription?: boolean;
    hasSettings?: boolean;
  };
}

export default function OnboardingCheck({ children, requiredData }: OnboardingCheckProps) {
  const navigate = useNavigate();

  if (!requiredData.hasBusinessProfile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-sm"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-50 rounded-full">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Complete Your Profile</h2>
            <p className="mt-2 text-gray-600">
              To access all features and start using the platform, please complete your business profile setup first.
            </p>
            <button
              onClick={() => navigate('/setup')}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Complete Setup
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (requiredData.hasSubscription === false) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-sm"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-50 rounded-full">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Choose a Plan</h2>
            <p className="mt-2 text-gray-600">
              Please select a subscription plan to continue using all features.
            </p>
            <button
              onClick={() => navigate('/plans')}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              View Plans
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return <>{children}</>;
}
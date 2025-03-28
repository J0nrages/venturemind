import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, DollarSign, Users, Coins, Briefcase, Building } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Props {
  scenario: any;
  businessProfile: any;
  onUpdate: () => void;
}

export default function ProformaAssumptions({ scenario, businessProfile, onUpdate }: Props) {
  // Track which category (sidebar nav) is active
  const [activeCategory, setActiveCategory] = useState<'revenue' | 'customers' | 'costs' | 'headcount' | 'capital'>('revenue');
  // Local state of merged assumptions
  const [mergedAssumptions, setMergedAssumptions] = useState<any>({});
  // Show a saving indicator
  const [saving, setSaving] = useState(false);

  // Merge scenario overrides into base assumptions once on load or scenario changes
  useEffect(() => {
    const merged = mergeAssumptions(
      businessProfile?.assumptions || {},
      scenario?.assumptions || {}
    );
    setMergedAssumptions(merged);
  }, [businessProfile, scenario]);

  // Basic merging approach for all categories
  const mergeAssumptions = (base: any, overrides: any) => {
    return {
      ...base,
      ...overrides,
      pricing: { ...base.pricing, ...overrides.pricing },
      growth: { ...base.growth, ...overrides.growth },
      retention: { ...base.retention, ...overrides.retention },
      customers: { ...base.customers, ...overrides.customers },
      cac: { ...base.cac, ...overrides.cac },
      marketing: { ...base.marketing, ...overrides.marketing },
      infrastructure: { ...base.infrastructure, ...overrides.infrastructure },
      scaling: { ...base.scaling, ...overrides.scaling },
      opex: { ...base.opex, ...overrides.opex },
      headcount: { ...base.headcount, ...overrides.headcount },
      capital: { ...base.capital, ...overrides.capital },
    };
  };

  // Helper to update a deeply nested field (like pricing.basic.amount, etc.)
  const handleInputChange = (
    mainKey: string,  // e.g. "pricing"
    subKey: string,   // e.g. "basic"
    field: string,    // e.g. "amount" or "rate"
    value: string
  ) => {
    setMergedAssumptions((prev: any) => ({
      ...prev,
      [mainKey]: {
        ...prev[mainKey],
        [subKey]: {
          ...prev[mainKey]?.[subKey],
          [field]: parseFloat(value) || 0,
        },
      },
    }));
  };

  // Called when user clicks "Save Assumptions"
  const handleSave = async () => {
    if (!scenario?.id) {
      toast.error('No active scenario selected');
      return;
    }

    setSaving(true);
    try {
      // You could do a “diff” if you only want changed fields; here we store entire merged for simplicity
      const { error } = await supabase
        .from('proforma_scenarios')
        .update({
          assumptions: mergedAssumptions, // store entire merged object
          updated_at: new Date().toISOString(),
        })
        .eq('id', scenario.id);

      if (error) throw error;

      toast.success('Assumptions saved successfully');
      onUpdate();
    } catch (error: any) {
      console.error('Error saving assumptions:', error);
      toast.error('Failed to save assumptions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-8">
      {/* Sidebar for categories */}
      <div className="col-span-3">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-4">Assumption Categories</h3>
          <nav className="space-y-1">
            <button
              onClick={() => setActiveCategory('revenue')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                activeCategory === 'revenue'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Revenue Drivers</span>
            </button>
            <button
              onClick={() => setActiveCategory('customers')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                activeCategory === 'customers'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Customer Acquisition</span>
            </button>
            <button
              onClick={() => setActiveCategory('costs')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                activeCategory === 'costs'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>Cost Structure</span>
            </button>
            <button
              onClick={() => setActiveCategory('headcount')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                activeCategory === 'headcount'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Headcount Plan</span>
            </button>
            <button
              onClick={() => setActiveCategory('capital')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                activeCategory === 'capital'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>Capital Requirements</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content / Form */}
      <div className="col-span-9">
        <div className="bg-white rounded-xl shadow-sm p-6">
          {/* Save Button Row */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {activeCategory === 'revenue' && 'Revenue Drivers'}
              {activeCategory === 'customers' && 'Customer Acquisition'}
              {activeCategory === 'costs' && 'Cost Structure'}
              {activeCategory === 'headcount' && 'Headcount Plan'}
              {activeCategory === 'capital' && 'Capital Requirements'}
            </h2>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Assumptions'}</span>
            </button>
          </div>

          {/* REVENUE */}
          {activeCategory === 'revenue' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <div className="space-y-6">
                {/* Pricing Tiers */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Pricing Tiers</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Basic Plan</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={mergedAssumptions?.pricing?.basic?.amount ?? 49}
                          onChange={(e) => handleInputChange('pricing', 'basic', 'amount', e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Premium Plan</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={mergedAssumptions?.pricing?.premium?.amount ?? 99}
                          onChange={(e) => handleInputChange('pricing', 'premium', 'amount', e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Enterprise Plan</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={mergedAssumptions?.pricing?.enterprise?.amount ?? 299}
                          onChange={(e) => handleInputChange('pricing', 'enterprise', 'amount', e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Growth Rates */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Growth Rates</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Startups (%)</label>
                      <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                        <input
                          type="number"
                          value={mergedAssumptions?.growth?.startups?.rate ?? 12}
                          onChange={(e) => handleInputChange('growth', 'startups', 'rate', e.target.value)}
                          className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Mid-Market (%)</label>
                      <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                        <input
                          type="number"
                          value={mergedAssumptions?.growth?.midMarket?.rate ?? 8}
                          onChange={(e) => handleInputChange('growth', 'midMarket', 'rate', e.target.value)}
                          className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Enterprise (%)</label>
                      <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                        <input
                          type="number"
                          value={mergedAssumptions?.growth?.enterprise?.rate ?? 5}
                          onChange={(e) => handleInputChange('growth', 'enterprise', 'rate', e.target.value)}
                          className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Retention Metrics */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Retention Metrics</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Monthly Churn</label>
                      <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                        <input
                          type="number"
                          step="0.1"
                          value={mergedAssumptions?.retention?.monthlyChurn?.rate ?? 2.3}
                          onChange={(e) => handleInputChange('retention', 'monthlyChurn', 'rate', e.target.value)}
                          className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Annual Retention</label>
                      <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                        <input
                          type="number"
                          value={mergedAssumptions?.retention?.annual?.rate ?? 72}
                          onChange={(e) => handleInputChange('retention', 'annual', 'rate', e.target.value)}
                          className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Expansion Revenue</label>
                      <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                        <input
                          type="number"
                          value={mergedAssumptions?.retention?.expansion?.rate ?? 8}
                          onChange={(e) => handleInputChange('retention', 'expansion', 'rate', e.target.value)}
                          className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* CUSTOMERS */}
          {activeCategory === 'customers' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {/* Same structure as original for Customer Acquisition,
                  the below is just sample. Fill in your real fields. */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Initial Customer Base</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Current Customers</label>
                      <input
                        type="number"
                        value={mergedAssumptions?.customers?.current?.count ?? 2845}
                        onChange={(e) => handleInputChange('customers', 'current', 'count', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    {/* more fields... */}
                  </div>
                </div>
                {/* Customer Acquisition Costs, etc... */}
              </div>
            </motion.div>
          )}

          {/* COSTS */}
          {activeCategory === 'costs' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {/* Tech infra, cost scaling, operating expenses, etc. */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Technology Infrastructure</h3>
                  <div className="grid grid-cols-3 gap-6">
                    {/* e.g. supabase costs */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Supabase Costs</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={mergedAssumptions?.infrastructure?.supabase?.amount ?? 600}
                          onChange={(e) => handleInputChange('infrastructure', 'supabase', 'amount', e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    {/* more fields... */}
                  </div>
                </div>
                {/* scaling, OPEX, etc. */}
              </div>
            </motion.div>
          )}

          {/* HEADCOUNT */}
          {activeCategory === 'headcount' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {/* Example structure for headcount planning fields */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Headcount Plan</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Engineers</label>
                      <input
                        type="number"
                        value={mergedAssumptions?.headcount?.engineers?.count ?? 5}
                        onChange={(e) => handleInputChange('headcount', 'engineers', 'count', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    {/* etc. */}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* CAPITAL */}
          {activeCategory === 'capital' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              {/* Example structure for capital requirements */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Capital Requirements</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Seed Round ($)</label>
                      <input
                        type="number"
                        value={mergedAssumptions?.capital?.seed?.amount ?? 500000}
                        onChange={(e) => handleInputChange('capital', 'seed', 'amount', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    {/* etc. */}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

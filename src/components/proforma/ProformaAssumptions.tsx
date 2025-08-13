import { Card } from '@/components/ui/card';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, BarChart3, Users, DollarSign, Building, Coins, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Props {
  scenario: any;
  businessProfile: any;
  onUpdate: () => void;
}

export default function ProformaAssumptions({ scenario, businessProfile, onUpdate }: Props) {
  const [activeCategory, setActiveCategory] = useState('revenue');
  const [assumptions, setAssumptions] = useState(scenario?.assumptions || {});
  const [saving, setSaving] = useState(false);

  const handleInputChange = (category: string, field: string, subfield: string, value: string) => {
    setAssumptions(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: {
          ...prev[category]?.[field],
          [subfield]: parseFloat(value) || 0
        }
      }
    }));
  };

  const handleSave = async () => {
    if (!scenario?.id) {
      toast.error('No active scenario selected');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('proforma_scenarios')
        .update({
          assumptions,
          updated_at: new Date().toISOString()
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
      <div className="col-span-3">
        <div className="bg-card/80 backdrop-blur-xl rounded-xl shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-4">Assumption Categories</h3>
          <nav className="space-y-1">
            <button
              onClick={() => setActiveCategory('revenue')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                activeCategory === 'revenue' ? 'bg-emerald-50 text-emerald-700' : 'text-muted-foreground hover:bg-accent/30'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Revenue Drivers</span>
            </button>
            <button
              onClick={() => setActiveCategory('customers')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                activeCategory === 'customers' ? 'bg-emerald-50 text-emerald-700' : 'text-muted-foreground hover:bg-accent/30'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Customer Acquisition</span>
            </button>
            <button
              onClick={() => setActiveCategory('costs')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                activeCategory === 'costs' ? 'bg-emerald-50 text-emerald-700' : 'text-muted-foreground hover:bg-accent/30'
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>Cost Structure</span>
            </button>
            <button
              onClick={() => setActiveCategory('headcount')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                activeCategory === 'headcount' ? 'bg-emerald-50 text-emerald-700' : 'text-muted-foreground hover:bg-accent/30'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Headcount Plan</span>
            </button>
            <button
              onClick={() => setActiveCategory('capital')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
                activeCategory === 'capital' ? 'bg-emerald-50 text-emerald-700' : 'text-muted-foreground hover:bg-accent/30'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>Capital Requirements</span>
            </button>
          </nav>
        </div>
      </div>

      <div className="col-span-9">
        <div className="bg-card/80 backdrop-blur-xl rounded-xl shadow-sm p-6">
          {activeCategory === 'revenue' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Revenue Drivers</h2>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Assumptions'}</span>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Pricing Tiers</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-foreground">Basic Plan</label>
                      <div className="relative">
                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <input
                          type="number"
                          value={assumptions?.pricing?.basic || 49}
                          onChange={(e) => handleInputChange('pricing', 'basic', 'amount', e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Premium Plan</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                        <input
                          type="number"
                          value={assumptions?.pricing?.premium || 99}
                          onChange={(e) => handleInputChange('pricing', 'premium', 'amount', e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Enterprise Plan</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                        <input
                          type="number"
                          value={assumptions?.pricing?.enterprise || 299}
                          onChange={(e) => handleInputChange('pricing', 'enterprise', 'amount', e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Growth Rates</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Startups</label>
                      <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                        <input
                          type="number"
                          value={assumptions?.growth?.startups || 12}
                          onChange={(e) => handleInputChange('growth', 'startups', 'rate', e.target.value)}
                          className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Mid-Market</label>
                      <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                        <input
                          type="number"
                          value={assumptions?.growth?.midMarket || 8}
                          onChange={(e) => handleInputChange('growth', 'midMarket', 'rate', e.target.value)}
                          className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Enterprise</label>
                      <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                        <input
                          type="number"
                          value={assumptions?.growth?.enterprise || 5}
                          onChange={(e) => handleInputChange('growth', 'enterprise', 'rate', e.target.value)}
                          className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Retention Metrics</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Monthly Churn Rate</label>
                      <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                        <input
                          type="number"
                          value={assumptions?.retention?.monthlyChurn || 2.3}
                          onChange={(e) => handleInputChange('retention', 'monthlyChurn', 'rate', e.target.value)}
                          step="0.1"
                          className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Annual Retention</label>
                      <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                        <input
                          type="number"
                          value={assumptions?.retention?.annual || 72}
                          onChange={(e) => handleInputChange('retention', 'annual', 'rate', e.target.value)}
                          className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Expansion Revenue</label>
                      <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                        <input
                          type="number"
                          value={assumptions?.retention?.expansion || 8}
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

          {activeCategory === 'customers' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Customer Acquisition</h2>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Assumptions'}</span>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Initial Customer Base</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Current Customers</label>
                      <input
                        type="number"
                        value={assumptions?.customers?.current || 2845}
                        onChange={(e) => handleInputChange('customers', 'current', 'count', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Basic Tier %</label>
                      <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                        <input
                          type="number"
                          value={assumptions?.customers?.basicPercent || 60}
                          onChange={(e) => handleInputChange('customers', 'basicPercent', 'rate', e.target.value)}
                          className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Premium Tier %</label>
                      <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                        <input
                          type="number"
                          value={assumptions?.customers?.premiumPercent || 30}
                          onChange={(e) => handleInputChange('customers', 'premiumPercent', 'rate', e.target.value)}
                          className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Customer Acquisition Costs</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">CAC - Search Marketing</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                        <input
                          type="number"
                          value={assumptions?.cac?.search || 125}
                          onChange={(e) => handleInputChange('cac', 'search', 'amount', e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">CAC - Social Media</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                        <input
                          type="number"
                          value={assumptions?.cac?.social || 95}
                          onChange={(e) => handleInputChange('cac', 'social', 'amount', e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">CAC - Direct Sales</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                        <input
                          type="number"
                          value={assumptions?.cac?.direct || 350}
                          onChange={(e) => handleInputChange('cac', 'direct', 'amount', e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Marketing Channel Mix</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Search Marketing %</label>
                      <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                        <input
                          type="number"
                          value={assumptions?.marketing?.searchPercent || 40}
                          onChange={(e) => handleInputChange('marketing', 'searchPercent', 'rate', e.target.value)}
                          className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Social Media %</label>
                      <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                        <input
                          type="number"
                          value={assumptions?.marketing?.socialPercent || 35}
                          onChange={(e) => handleInputChange('marketing', 'socialPercent', 'rate', e.target.value)}
                          className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Direct Sales %</label>
                      <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                        <input
                          type="number"
                          value={assumptions?.marketing?.directPercent || 25}
                          onChange={(e) => handleInputChange('marketing', 'directPercent', 'rate', e.target.value)}
                          className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeCategory === 'costs' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Cost Structure</h2>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Assumptions'}</span>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Technology Infrastructure</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Supabase Costs</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                        <input
                          type="number"
                          value={assumptions?.infrastructure?.supabase || 600}
                          onChange={(e) => handleInputChange('infrastructure', 'supabase', 'amount', e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">AI API Costs</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                        <input
                          type="number"
                          value={assumptions?.infrastructure?.ai || 2500}
                          onChange={(e) => handleInputChange('infrastructure', 'ai', 'amount', e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Hosting/CDN</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                        <input
                          type="number"
                          value={assumptions?.infrastructure?.hosting || 1200}
                          onChange={(e) => handleInputChange('infrastructure', 'hosting', 'amount', e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Technology Cost Scaling</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Cost per 1000 Users</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                        <input
                          type="number"
                          value={assumptions?.scaling?.userCost || 150}
                          onChange={(e) => handleInputChange('scaling', 'userCost', 'amount', e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Cost per 1000 API Calls</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                        <input
                          type="number"
                          value={assumptions?.scaling?.apiCost || 45}
                          onChange={(e) => handleInputChange('scaling', 'apiCost', 'amount', e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">AI Processing per Doc</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                        <input
                          type="number"
                          value={assumptions?.scaling?.aiCost || 0.08}
                          onChange={(e) => handleInputChange('scaling', 'aiCost', 'amount', e.target.value)}
                          step="0.01"
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Operating Expenses</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Office Space</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                        <input
                          type="number"
                          value={assumptions?.opex?.office || 8500}
                          onChange={(e) => handleInputChange('opex', 'office', 'amount', e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Tools & Software</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                        <input
                          type="number"
                          value={assumptions?.opex?.tools || 3500}
                          onChange={(e) => handleInputChange('opex', 'tools', 'amount', e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Admin & Legal</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                        <input
                          type="number"
                          value={assumptions?.opex?.admin || 4200}
                          onChange={(e) => handleInputChange('opex', 'admin', 'amount', e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeCategory === 'headcount' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Headcount Plan</h2>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Assumptions'}</span>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Engineering Team</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-border/50">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Role</th>
                          <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Current</th>
                          <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Q1</th>
                          <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Q2</th>
                          <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Q3</th>
                          <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Q4</th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Avg. Salary</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        <tr>
                          <td className="px-4 py-2 text-sm text-gray-700">Senior Engineers</td>
                          <td className="px-4 py-2 text-center text-sm text-gray-700">
                            <input
                              type="number"
                              value={assumptions?.headcount?.senior?.[0] || 3}
                              onChange={(e) => handleInputChange('headcount', 'senior', '0', e.target.value)}
                              className="w-12 text-center border border-gray-300 rounded-md"
                            />
                          </td>
                          <td className="px-4 py-2 text-center text-sm text-gray-700">
                            <input
                              type="number"
                              value={assumptions?.headcount?.senior?.[1] || 4}
                              onChange={(e) => handleInputChange('headcount', 'senior', '1', e.target.value)}
                              className="w-12 text-center border border-gray-300 rounded-md"
                            />
                          </td>
                          <td className="px-4 py-2 text-center text-sm text-gray-700">
                            <input
                              type="number"
                              value={assumptions?.headcount?.senior?.[2] || 5}
                              onChange={(e) => handleInputChange('headcount', 'senior', '2', e.target.value)}
                              className="w-12 text-center border border-gray-300 rounded-md"
                            />
                          </td>
                          <td className="px-4 py-2 text-center text-sm text-gray-700">
                            <input
                              type="number"
                              value={assumptions?.headcount?.senior?.[3] || 6}
                              onChange={(e) => handleInputChange('headcount', 'senior', '3', e.target.value)}
                              className="w-12 text-center border border-gray-300 rounded-md"
                            />
                          </td>
                          <td className="px-4 py-2 text-center text-sm text-gray-700">
                            <input
                              type="number"
                              value={assumptions?.headcount?.senior?.[4] || 8}
                              onChange={(e) => handleInputChange('headcount', 'senior', '4', e.target.value)}
                              className="w-12 text-center border border-gray-300 rounded-md"
                            />
                          </td>
                          <td className="px-4 py-2 text-right text-sm text-gray-700">
                            <div className="flex justify-end items-center">
                              <span className="mr-1">$</span>
                              <input
                                type="number"
                                value={assumptions?.headcount?.seniorSalary || 150000}
                                onChange={(e) => handleInputChange('headcount', 'seniorSalary', 'amount', e.target.value)}
                                className="w-24 text-right border border-gray-300 rounded-md"
                              />
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeCategory === 'capital' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Capital Requirements</h2>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Assumptions'}</span>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Current Funding</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Cash on Hand</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                        <input
                          type="number"
                          value={assumptions?.capital?.cash || 2500000}
                          onChange={(e) => handleInputChange('capital', 'cash', 'amount', e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Monthly Burn Rate</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                        <input
                          type="number"
                          value={assumptions?.capital?.burn || 180000}
                          onChange={(e) => handleInputChange('capital', 'burn', 'amount', e.target.value)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Current Runway (months)</label>
                      <input
                        type="number"
                        value={assumptions?.capital?.runway || 14}
                        onChange={(e) => handleInputChange('capital', 'runway', 'months', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
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
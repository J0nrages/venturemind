import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { DollarSign, Users, TrendingUp, Clock, Wallet, Save, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ProductType {
  id: string;
  name: string;
  price: number;
  costOfSales: number;
  customerCount: number;
}

interface Assumptions {
  initialBalance: number;
  products: ProductType[];
  customerMix: {
    basicPercent: number;
    premiumPercent: number;
    enterprisePercent: number;
  };
  growth: {
    monthlyGrowthRate: number;
    churnRate: number;
    expansionRevenue: number;
  };
  costs: {
    cac: number;
    grossMargin: number;
    opexPerCustomer: number;
  };
}

const defaultAssumptions: Assumptions = {
  initialBalance: 250000,
  products: [
    { id: 'basic', name: 'Basic Plan', price: 50, costOfSales: 10, customerCount: 60 },
    { id: 'premium', name: 'Premium Plan', price: 100, costOfSales: 20, customerCount: 30 },
    { id: 'enterprise', name: 'Enterprise Plan', price: 500, costOfSales: 100, customerCount: 10 }
  ],
  customerMix: {
    basicPercent: 60,
    premiumPercent: 30,
    enterprisePercent: 10
  },
  growth: {
    monthlyGrowthRate: 10,
    churnRate: 2,
    expansionRevenue: 5
  },
  costs: {
    cac: 500,
    grossMargin: 80,
    opexPerCustomer: 20
  }
};

export default function ProformaPage() {
  const [assumptions, setAssumptions] = useState<Assumptions>(defaultAssumptions);
  const [projections, setProjections] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scenarioId, setScenarioId] = useState<string | null>(null);

  useEffect(() => {
    loadSavedAssumptions();
  }, []);

  useEffect(() => {
    if (!loading) {
      calculateProjections();
    }
  }, [assumptions, loading]);

  const loadSavedAssumptions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      let { data: scenarios, error } = await supabase
        .from('proforma_scenarios')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);

      if (error) throw error;

      if (!scenarios?.length) {
        const { data: recentScenarios, error: recentError } = await supabase
          .from('proforma_scenarios')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (recentError) throw recentError;
        scenarios = recentScenarios;
      }

      if (scenarios?.length) {
        const scenario = scenarios[0];
        setScenarioId(scenario.id);
        
        const mergedAssumptions = {
          ...defaultAssumptions,
          ...scenario.assumptions,
          products: scenario.assumptions?.products || defaultAssumptions.products,
          customerMix: {
            ...defaultAssumptions.customerMix,
            ...scenario.assumptions?.customerMix
          },
          growth: {
            ...defaultAssumptions.growth,
            ...scenario.assumptions?.growth
          },
          costs: {
            ...defaultAssumptions.costs,
            ...scenario.assumptions?.costs
          }
        };
        
        setAssumptions(mergedAssumptions);

        if (!scenario.is_active) {
          await supabase
            .from('proforma_scenarios')
            .update({ is_active: true })
            .eq('id', scenario.id);
        }
      } else {
        const { data: newScenario, error: createError } = await supabase
          .from('proforma_scenarios')
          .insert({
            user_id: user.id,
            name: 'Default Scenario',
            assumptions: defaultAssumptions,
            is_active: true
          })
          .select()
          .single();

        if (createError) throw createError;
        if (newScenario) {
          setScenarioId(newScenario.id);
        }
      }
    } catch (error) {
      console.error('Error loading assumptions:', error);
      toast.error('Failed to load saved assumptions');
    } finally {
      setLoading(false);
    }
  };

  const saveAssumptions = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      await supabase
        .from('proforma_scenarios')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .neq('id', scenarioId || '');

      const { error } = await supabase
        .from('proforma_scenarios')
        .upsert({
          id: scenarioId || undefined,
          user_id: user.id,
          name: 'Default Scenario',
          assumptions,
          is_active: true,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      if (!scenarioId) {
        const { data: newScenario } = await supabase
          .from('proforma_scenarios')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (newScenario) {
          setScenarioId(newScenario.id);
        }
      }

      toast.success('Assumptions saved successfully');
    } catch (error) {
      console.error('Error saving assumptions:', error);
      toast.error('Failed to save assumptions');
    } finally {
      setSaving(false);
    }
  };

  const calculateProjections = () => {
    const months = 24;
    const projectionData = [];
    const startDate = new Date();
    
    let bankBalance = assumptions.initialBalance;
    let totalCustomers = assumptions.products.reduce((sum, p) => sum + p.customerCount, 0);
    let products = [...assumptions.products];
    
    for (let i = 0; i < months; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      
      products = products.map(product => {
        const churnedCustomers = Math.round(product.customerCount * (assumptions.growth.churnRate / 100));
        const newCustomers = Math.round(product.customerCount * (assumptions.growth.monthlyGrowthRate / 100));
        return {
          ...product,
          customerCount: product.customerCount - churnedCustomers + newCustomers
        };
      });
      
      const mrr = products.reduce((sum, p) => sum + (p.price * p.customerCount), 0);
      const cogs = products.reduce((sum, p) => sum + (p.costOfSales * p.customerCount), 0);
      const totalCustomers = products.reduce((sum, p) => sum + p.customerCount, 0);
      
      const newCustomers = totalCustomers - (projectionData[i-1]?.customers || assumptions.products.reduce((sum, p) => sum + p.customerCount, 0));
      const cacExpense = Math.max(0, newCustomers) * assumptions.costs.cac;
      const opexExpense = totalCustomers * assumptions.costs.opexPerCustomer;
      
      const revenue = mrr;
      const expenses = cogs + cacExpense + opexExpense;
      const profit = revenue - expenses;
      
      bankBalance += profit;
      
      const arr = mrr * 12;
      const ltv = calculateLTV(mrr / totalCustomers);
      const ltvCacRatio = ltv / assumptions.costs.cac;
      
      projectionData.push({
        date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        customers: totalCustomers,
        mrr,
        arr,
        expenses,
        profit,
        bankBalance,
        ltv,
        ltvCacRatio
      });
    }
    
    setProjections(projectionData);
    setMetrics({
      currentMRR: projectionData[0].mrr,
      customers: projectionData[0].customers,
      ltv: projectionData[0].ltv,
      ltvCacRatio: projectionData[0].ltvCacRatio,
      bankBalance: projectionData[0].bankBalance
    });
  };

  const calculateLTV = (arpu: number) => {
    const monthlyChurnRate = assumptions.growth.churnRate / 100;
    const avgCustomerLifetime = 1 / monthlyChurnRate;
    return arpu * avgCustomerLifetime;
  };

  const handleProductChange = (index: number, field: keyof ProductType, value: number) => {
    setAssumptions(prev => ({
      ...prev,
      products: prev.products.map((product, i) => 
        i === index ? { ...product, [field]: value } : product
      )
    }));
  };

  const handleInputChange = (category: keyof Assumptions, subcategory: string, field: string, value: number) => {
    setAssumptions(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [subcategory]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">SaaS Financial Model</h1>
          <p className="text-gray-500 mt-1">Model your SaaS metrics and financial projections</p>
        </div>
        <button
          onClick={saveAssumptions}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Model'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Bank Balance</p>
            <Building2 className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-semibold">${metrics?.bankBalance.toLocaleString()}</h3>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Monthly Recurring Revenue</p>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-semibold">${metrics?.currentMRR.toLocaleString()}</h3>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Total Customers</p>
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-semibold">{metrics?.customers.toLocaleString()}</h3>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Customer LTV</p>
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-semibold">${metrics?.ltv.toLocaleString()}</h3>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">LTV:CAC Ratio</p>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-semibold">{metrics?.ltvCacRatio.toFixed(1)}x</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold mb-6">Revenue Growth</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projections}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis 
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: any) => [`$${value.toLocaleString()}`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="mrr"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.2}
                  name="MRR"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="#EF4444"
                  fill="#EF4444"
                  fillOpacity={0.2}
                  name="Expenses"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold mb-6">Bank Balance Projection</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projections}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis 
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any) => [`$${value.toLocaleString()}`, '']}
                />
                <Line
                  type="monotone"
                  dataKey="bankBalance"
                  stroke="#6366F1"
                  strokeWidth={2}
                  name="Bank Balance"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold mb-6">Model Assumptions</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-md font-medium mb-4">Initial Setup</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Starting Bank Balance</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={assumptions.initialBalance}
                    onChange={(e) => setAssumptions(prev => ({ ...prev, initialBalance: parseFloat(e.target.value) }))}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <h3 className="text-md font-medium mb-4 mt-8">Products</h3>
            <div className="space-y-6">
              {assumptions.products.map((product, index) => (
                <div key={product.id} className="space-y-4">
                  <h4 className="font-medium">{product.name}</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={product.price}
                          onChange={(e) => handleProductChange(index, 'price', parseFloat(e.target.value))}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Cost of Sales</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={product.costOfSales}
                          onChange={(e) => handleProductChange(index, 'costOfSales', parseFloat(e.target.value))}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Current Customers</label>
                      <input
                        type="number"
                        value={product.customerCount}
                        onChange={(e) => handleProductChange(index, 'customerCount', parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-4">Growth Metrics</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Monthly Growth Rate</label>
                <div className="relative">
                  <input
                    type="number"
                    value={assumptions.growth.monthlyGrowthRate}
                    onChange={(e) => handleInputChange('growth', 'monthlyGrowthRate', 'rate', parseFloat(e.target.value))}
                    className="w-full pr-8 pl-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Monthly Churn Rate</label>
                <div className="relative">
                  <input
                    type="number"
                    value={assumptions.growth.churnRate}
                    onChange={(e) => handleInputChange('growth', 'churnRate', 'rate', parseFloat(e.target.value))}
                    className="w-full pr-8 pl-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Net Revenue Expansion</label>
                <div className="relative">
                  <input
                    type="number"
                    value={assumptions.growth.expansionRevenue}
                    onChange={(e) => handleInputChange('growth', 'expansionRevenue', 'rate', parseFloat(e.target.value))}
                    className="w-full pr-8 pl-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>
            </div>

            <h3 className="text-md font-medium mb-4 mt-8">Cost Structure</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Customer Acquisition Cost</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={assumptions.costs.cac}
                    onChange={(e) => handleInputChange('costs', 'cac', 'amount', parseFloat(e.target.value))}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Gross Margin</label>
                <div className="relative">
                  <input
                    type="number"
                    value={assumptions.costs.grossMargin}
                    onChange={(e) => handleInputChange('costs', 'grossMargin', 'rate', parseFloat(e.target.value))}
                    className="w-full pr-8 pl-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Monthly OpEx per Customer</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={assumptions.costs.opexPerCustomer}
                    onChange={(e) => handleInputChange('costs', 'opexPerCustomer', 'amount', parseFloat(e.target.value))}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
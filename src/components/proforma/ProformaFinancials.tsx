import { Card } from '@/components/ui/card';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface Props {
  scenario: any;
  businessProfile: any;
}

interface LoadingState {
  status: 'idle' | 'loading' | 'error' | 'success';
  error?: string;
}

interface Assumptions {
  pricing: {
    basic: number;
    premium: number;
    enterprise: number;
  };
  customers: {
    current: number;
    basicTierPercent: number;
    premiumTierPercent: number;
  };
  growthRates: {
    startups: number;
    midMarket: number;
    enterprise: number;
  };
  retention: {
    monthlyChurnRate: number;
    annualRetention: number;
    expansionRevenue: number;
  };
  costs: {
    infrastructure: {
      supabase: number;
      aiApi: number;
      hostingCdn: number;
    };
    costScaling: {
      costPer1000Users: number;
      costPer1000ApiCalls: number;
      aiProcessingPerDoc: number;
    };
    operatingExpenses: {
      officeSpace: number;
      toolsAndSoftware: number;
      adminAndLegal: number;
    };
  };
}

const defaultAssumptions: Assumptions = {
  pricing: {
    basic: 49,
    premium: 99,
    enterprise: 299
  },
  customers: {
    current: 100,
    basicTierPercent: 60,
    premiumTierPercent: 30
  },
  growthRates: {
    startups: 12,
    midMarket: 8,
    enterprise: 5
  },
  retention: {
    monthlyChurnRate: 2.3,
    annualRetention: 72,
    expansionRevenue: 8
  },
  costs: {
    infrastructure: {
      supabase: 600,
      aiApi: 2500,
      hostingCdn: 1200
    },
    costScaling: {
      costPer1000Users: 150,
      costPer1000ApiCalls: 45,
      aiProcessingPerDoc: 0.08
    },
    operatingExpenses: {
      officeSpace: 8500,
      toolsAndSoftware: 3500,
      adminAndLegal: 4200
    }
  }
};

export default function ProformaFinancials({ scenario, businessProfile }: Props) {
  const [loadingState, setLoadingState] = useState<LoadingState>({ status: 'idle' });
  const [financials, setFinancials] = useState<any>(null);
  const [timeframe, setTimeframe] = useState('monthly');
  const [statement, setStatement] = useState('income');

  useEffect(() => {
    if (scenario) {
      validateAndGenerateFinancials();
    } else {
      setLoadingState({
        status: 'error',
        error: 'No active scenario found. Please create or activate a scenario first.'
      });
    }
  }, [scenario]);

  const validateAssumptions = (assumptions: any): Assumptions => {
    if (!assumptions || typeof assumptions !== 'object') {
      return defaultAssumptions;
    }

    // Deep merge with default assumptions to ensure all required properties exist
    return {
      pricing: {
        basic: assumptions.pricing?.basic ?? defaultAssumptions.pricing.basic,
        premium: assumptions.pricing?.premium ?? defaultAssumptions.pricing.premium,
        enterprise: assumptions.pricing?.enterprise ?? defaultAssumptions.pricing.enterprise
      },
      customers: {
        current: assumptions.customers?.current ?? defaultAssumptions.customers.current,
        basicTierPercent: assumptions.customers?.basicTierPercent ?? defaultAssumptions.customers.basicTierPercent,
        premiumTierPercent: assumptions.customers?.premiumTierPercent ?? defaultAssumptions.customers.premiumTierPercent
      },
      growthRates: {
        startups: assumptions.growthRates?.startups ?? defaultAssumptions.growthRates.startups,
        midMarket: assumptions.growthRates?.midMarket ?? defaultAssumptions.growthRates.midMarket,
        enterprise: assumptions.growthRates?.enterprise ?? defaultAssumptions.growthRates.enterprise
      },
      retention: {
        monthlyChurnRate: assumptions.retention?.monthlyChurnRate ?? defaultAssumptions.retention.monthlyChurnRate,
        annualRetention: assumptions.retention?.annualRetention ?? defaultAssumptions.retention.annualRetention,
        expansionRevenue: assumptions.retention?.expansionRevenue ?? defaultAssumptions.retention.expansionRevenue
      },
      costs: {
        infrastructure: {
          supabase: assumptions.costs?.infrastructure?.supabase ?? defaultAssumptions.costs.infrastructure.supabase,
          aiApi: assumptions.costs?.infrastructure?.aiApi ?? defaultAssumptions.costs.infrastructure.aiApi,
          hostingCdn: assumptions.costs?.infrastructure?.hostingCdn ?? defaultAssumptions.costs.infrastructure.hostingCdn
        },
        costScaling: {
          costPer1000Users: assumptions.costs?.costScaling?.costPer1000Users ?? defaultAssumptions.costs.costScaling.costPer1000Users,
          costPer1000ApiCalls: assumptions.costs?.costScaling?.costPer1000ApiCalls ?? defaultAssumptions.costs.costScaling.costPer1000ApiCalls,
          aiProcessingPerDoc: assumptions.costs?.costScaling?.aiProcessingPerDoc ?? defaultAssumptions.costs.costScaling.aiProcessingPerDoc
        },
        operatingExpenses: {
          officeSpace: assumptions.costs?.operatingExpenses?.officeSpace ?? defaultAssumptions.costs.operatingExpenses.officeSpace,
          toolsAndSoftware: assumptions.costs?.operatingExpenses?.toolsAndSoftware ?? defaultAssumptions.costs.operatingExpenses.toolsAndSoftware,
          adminAndLegal: assumptions.costs?.operatingExpenses?.adminAndLegal ?? defaultAssumptions.costs.operatingExpenses.adminAndLegal
        }
      }
    };
  };

  const validateAndGenerateFinancials = async () => {
    try {
      setLoadingState({ status: 'loading' });

      if (!scenario?.id) {
        throw new Error('Invalid scenario: Missing scenario ID');
      }

      // Validate and merge assumptions with defaults
      const validatedAssumptions = validateAssumptions(scenario.assumptions);

      // Update scenario with validated assumptions if they were incomplete
      if (JSON.stringify(validatedAssumptions) !== JSON.stringify(scenario.assumptions)) {
        const { error: updateError } = await supabase
          .from('proforma_scenarios')
          .update({ assumptions: validatedAssumptions })
          .eq('id', scenario.id);

        if (updateError) {
          console.warn('Failed to update scenario assumptions:', updateError);
        }
      }

      // Generate projections for 36 months (3 years)
      const projections = [];
      let currentCustomers = validatedAssumptions.customers.current;
      let monthlyRevenue = calculateInitialRevenue(currentCustomers, validatedAssumptions.pricing, validatedAssumptions.customers);
      let monthlyExpenses = calculateInitialExpenses(validatedAssumptions.costs, currentCustomers);
      
      for (let i = 0; i < 36; i++) {
        // Calculate customer growth and churn
        const churnedCustomers = Math.round(currentCustomers * (validatedAssumptions.retention.monthlyChurnRate / 100));
        const newCustomers = Math.round(currentCustomers * (getWeightedGrowthRate(validatedAssumptions.growthRates) / 100));
        currentCustomers = currentCustomers - churnedCustomers + newCustomers;

        // Calculate revenue with expansion
        monthlyRevenue *= (1 + (validatedAssumptions.retention.expansionRevenue / 100 / 12));
        monthlyRevenue += calculateNewCustomerRevenue(newCustomers, validatedAssumptions.pricing, validatedAssumptions.customers);

        // Calculate expenses with scaling
        monthlyExpenses = calculateMonthlyExpenses(validatedAssumptions.costs, currentCustomers, monthlyRevenue);

        const profit = monthlyRevenue - monthlyExpenses;

        projections.push({
          date: new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short' 
          }),
          revenue: Math.round(monthlyRevenue),
          expenses: Math.round(monthlyExpenses),
          profit: Math.round(profit),
          customers: currentCustomers
        });
      }

      // Generate quarterly statements
      const statements = generateQuarterlyStatements(projections);

      // Save generated financials
      const { data, error } = await supabase
        .from('proforma_financials')
        .upsert({
          scenario_id: scenario.id,
          revenue: projections[0].revenue,
          profit: projections[0].profit,
          expenses: projections[0].expenses,
          revenue_change: ((projections[1].revenue - projections[0].revenue) / projections[0].revenue) * 100,
          profit_change: ((projections[1].profit - projections[0].profit) / projections[0].profit) * 100,
          expenses_change: ((projections[1].expenses - projections[0].expenses) / projections[0].expenses) * 100,
          projections,
          statements
        })
        .select()
        .single();

      if (error) throw error;

      setFinancials(data);
      setLoadingState({ status: 'success' });
    } catch (error: any) {
      console.error('Error generating financials:', error);
      
      setLoadingState({
        status: 'error',
        error: error.message || 'Failed to generate financial projections'
      });
      
      toast.error(error.message || 'Failed to generate financial projections', {
        duration: 5000,
        icon: '⚠️'
      });
    }
  };

  const calculateInitialRevenue = (customers: number, pricing: any, distribution: any) => {
    const basicCustomers = Math.round(customers * (distribution.basicTierPercent / 100));
    const premiumCustomers = Math.round(customers * (distribution.premiumTierPercent / 100));
    const enterpriseCustomers = customers - basicCustomers - premiumCustomers;

    return (
      basicCustomers * pricing.basic +
      premiumCustomers * pricing.premium +
      enterpriseCustomers * pricing.enterprise
    );
  };

  const calculateNewCustomerRevenue = (newCustomers: number, pricing: any, distribution: any) => {
    return calculateInitialRevenue(newCustomers, pricing, distribution);
  };

  const calculateInitialExpenses = (costs: any, customers: number) => {
    const { infrastructure, operatingExpenses, costScaling } = costs;
    
    // Fixed costs
    const fixedCosts = 
      infrastructure.supabase +
      infrastructure.aiApi +
      infrastructure.hostingCdn +
      operatingExpenses.officeSpace +
      operatingExpenses.toolsAndSoftware +
      operatingExpenses.adminAndLegal;

    // Variable costs based on customer count
    const variableCosts = 
      (customers / 1000) * costScaling.costPer1000Users +
      (customers * 100 / 1000) * costScaling.costPer1000ApiCalls + // Assume 100 API calls per customer
      (customers * 10) * costScaling.aiProcessingPerDoc; // Assume 10 docs per customer

    return fixedCosts + variableCosts;
  };

  const calculateMonthlyExpenses = (costs: any, customers: number, revenue: number) => {
    const baseExpenses = calculateInitialExpenses(costs, customers);
    // Add 30% of revenue growth to expenses to account for scaling costs
    return baseExpenses * (1 + (revenue * 0.3));
  };

  const getWeightedGrowthRate = (growthRates: any) => {
    return (
      (growthRates.startups * 0.2) +
      (growthRates.midMarket * 0.5) +
      (growthRates.enterprise * 0.3)
    ) / 12; // Convert annual rate to monthly
  };

  const generateQuarterlyStatements = (projections: any[]) => {
    const quarters = [];
    for (let i = 0; i < projections.length; i += 3) {
      if (projections[i + 2]) {
        quarters.push({
          revenue: projections.slice(i, i + 3).reduce((sum, p) => sum + p.revenue, 0),
          expenses: projections.slice(i, i + 3).reduce((sum, p) => sum + p.expenses, 0),
          profit: projections.slice(i, i + 3).reduce((sum, p) => sum + p.profit, 0)
        });
      }
    }

    return {
      income: {
        periods: quarters.slice(0, 4).map((_, i) => `Q${i + 1} ${new Date().getFullYear()}`),
        items: {
          'Revenue': quarters.slice(0, 4).map(q => q.revenue),
          'Cost of Revenue': quarters.slice(0, 4).map(q => Math.round(q.expenses * 0.7)),
          'Gross Profit': quarters.slice(0, 4).map(q => Math.round(q.revenue - (q.expenses * 0.7))),
          'Operating Expenses': quarters.slice(0, 4).map(q => Math.round(q.expenses * 0.3)),
          'Operating Income': quarters.slice(0, 4).map(q => q.profit)
        }
      },
      balance: {
        periods: quarters.slice(0, 4).map((_, i) => `Q${i + 1} ${new Date().getFullYear()}`),
        items: {
          'Cash': quarters.slice(0, 4).map((q, i) => Math.round(2500000 + quarters.slice(0, i + 1).reduce((sum, q) => sum + q.profit, 0))),
          'Accounts Receivable': quarters.slice(0, 4).map(q => Math.round(q.revenue * 0.1)),
          'Total Assets': quarters.slice(0, 4).map((q, i) => {
            const cash = Math.round(2500000 + quarters.slice(0, i + 1).reduce((sum, q) => sum + q.profit, 0));
            const ar = Math.round(q.revenue * 0.1);
            return cash + ar;
          }),
          'Accounts Payable': quarters.slice(0, 4).map(q => Math.round(q.expenses * 0.15)),
          'Total Liabilities': quarters.slice(0, 4).map(q => Math.round(q.expenses * 0.15)),
          'Equity': quarters.slice(0, 4).map((q, i) => {
            const assets = Math.round(2500000 + quarters.slice(0, i + 1).reduce((sum, q) => sum + q.profit, 0)) + Math.round(q.revenue * 0.1);
            const liabilities = Math.round(q.expenses * 0.15);
            return assets - liabilities;
          })
        }
      },
      cash: {
        periods: quarters.slice(0, 4).map((_, i) => `Q${i + 1} ${new Date().getFullYear()}`),
        items: {
          'Operating Cash Flow': quarters.slice(0, 4).map(q => q.profit),
          'Investing Cash Flow': quarters.slice(0, 4).map(() => 0),
          'Financing Cash Flow': quarters.slice(0, 4).map(() => 0),
          'Net Cash Flow': quarters.slice(0, 4).map(q => q.profit),
          'Beginning Cash': quarters.slice(0, 4).map((q, i) => {
            if (i === 0) return 2500000;
            return Math.round(2500000 + quarters.slice(0, i).reduce((sum, q) => sum + q.profit, 0));
          }),
          'Ending Cash': quarters.slice(0, 4).map((q, i) => Math.round(2500000 + quarters.slice(0, i + 1).reduce((sum, q) => sum + q.profit, 0)))
        }
      }
    };
  };

  const calculateMetrics = () => {
    if (!financials?.projections?.length) return null;

    try {
      const currentMonth = financials.projections[0];
      const previousMonth = {
        revenue: currentMonth.revenue / (1 + (scenario.assumptions?.growthRates?.monthly || 0.05)),
        profit: currentMonth.profit / (1 + (scenario.assumptions?.growthRates?.monthly || 0.05)),
        expenses: currentMonth.expenses / (1 + (scenario.assumptions?.costs?.monthlyIncrease || 0.03))
      };

      const revenueChange = ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100;
      const profitChange = ((currentMonth.profit - previousMonth.profit) / previousMonth.profit) * 100;
      const expensesChange = ((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100;

      return {
        revenue: currentMonth.revenue,
        profit: currentMonth.profit,
        expenses: currentMonth.expenses,
        revenueChange: isFinite(revenueChange) ? revenueChange : 0,
        profitChange: isFinite(profitChange) ? profitChange : 0,
        expensesChange: isFinite(expensesChange) ? expensesChange : 0
      };
    } catch (error) {
      console.error('Error calculating metrics:', error);
      toast.error('Error calculating financial metrics');
      return null;
    }
  };

  const metrics = calculateMetrics();

  if (loadingState.status === 'loading') {
    return (
      <div className="bg-card/80 backdrop-blur-xl rounded-xl shadow-sm p-8">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          <p className="text-sm text-muted-foreground">Generating financial projections...</p>
        </div>
      </div>
    );
  }

  if (loadingState.status === 'error') {
    return (
      <div className="bg-card/80 backdrop-blur-xl rounded-xl shadow-sm p-8">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-center max-w-md">
            <div className="inline-flex h-14 w-14 rounded-full bg-red-50 p-4 mb-6">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Financial Data</h3>
            <p className="text-muted-foreground mb-6">{loadingState.error}</p>
            <button
              onClick={validateAndGenerateFinancials}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Loading</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!scenario || !financials) {
    return (
      <div className="bg-card/80 backdrop-blur-xl rounded-xl shadow-sm p-8">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-center max-w-md">
            <div className="inline-flex h-14 w-14 rounded-full bg-amber-50 p-4 mb-6">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Active Scenario</h3>
            <p className="text-muted-foreground mb-6">
              To view financial projections, you need to create or activate a scenario first. 
              Switch to the "Scenarios" tab to manage your scenarios.
            </p>
            <button
              onClick={() => window.location.hash = '#scenarios'}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Layers className="w-4 h-4" />
              <span>Go to Scenarios</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayData = timeframe === 'monthly' 
    ? financials.projections 
    : financials.projections.filter((_: any, i: number) => i % 3 === 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm"
        >
          <p className="text-sm text-muted-foreground">Projected Monthly Revenue</p>
          <h3 className="text-2xl font-semibold mt-1">${metrics?.revenue.toLocaleString()}</h3>
          <div className="flex items-center mt-2">
            <span className={`flex items-center text-sm ${metrics?.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics?.revenueChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {Math.abs(metrics?.revenueChange).toFixed(1)}%
            </span>
            <span className="text-muted-foreground text-sm ml-2">vs last month</span>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm"
        >
          <p className="text-sm text-muted-foreground">Projected Net Profit</p>
          <h3 className="text-2xl font-semibold mt-1">${metrics?.profit.toLocaleString()}</h3>
          <div className="flex items-center mt-2">
            <span className={`flex items-center text-sm ${metrics?.profitChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics?.profitChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {Math.abs(metrics?.profitChange).toFixed(1)}%
            </span>
            <span className="text-muted-foreground text-sm ml-2">vs last month</span>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm"
        >
          <p className="text-sm text-muted-foreground">Projected Expenses</p>
          <h3 className="text-2xl font-semibold mt-1">${metrics?.expenses.toLocaleString()}</h3>
          <div className="flex items-center mt-2">
            <span className={`flex items-center text-sm ${metrics?.expensesChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics?.expensesChange <= 0 ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
              {Math.abs(metrics?.expensesChange).toFixed(1)}%
            </span>
            <span className="text-muted-foreground text-sm ml-2">vs last month</span>
          </div>
        </motion.div>
      </div>

      <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-semibold text-foreground">Financial Projections</h2>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setTimeframe('monthly')}
              className={`px-3 py-1 text-sm rounded-lg ${
                timeframe === 'monthly' 
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setTimeframe('quarterly')}
              className={`px-3 py-1 text-sm rounded-lg ${
                timeframe === 'quarterly' 
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              Quarterly
            </button>
          </div>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }} 
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value) => [`$${value.toLocaleString()}`, '']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stackId="1" 
                stroke="hsl(var(--chart-1))" 
                fill="hsl(var(--chart-1))" 
                fillOpacity={0.2} 
                name="Revenue"
              />
              <Area 
                type="monotone" 
                dataKey="expenses" 
                stackId="2" 
                stroke="hsl(var(--chart-5))" 
                fill="hsl(var(--chart-5))" 
                fillOpacity={0.2}
                name="Expenses"
              />
              <Area 
                type="monotone" 
                dataKey="profit" 
                stackId="3" 
                stroke="#6366F1" 
                fill="#6366F1" 
                fillOpacity={0.2}
                name="Profit"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card/80 backdrop-blur-xl rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-foreground">Financial Statements</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setStatement('income')}
                className={`px-3 py-1 text-sm rounded-lg ${
                  statement === 'income'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                Income Statement
              </button>
              <button
                onClick={() => setStatement('balance')}
                className={`px-3 py-1 text-sm rounded-lg ${
                  statement === 'balance'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                Balance Sheet
              </button>
              <button
                onClick={() => setStatement('cash')}
                className={`px-3 py-1 text-sm rounded-lg ${
                  statement === 'cash'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                Cash Flow
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-accent/30">
                <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Line Item</th>
                {financials.statements[statement].periods.map((period: string) => (
                  <th key={period} className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                    {period}
                  </th>
                ))}
              </tr>
            </thead>
              <tbody className="divide-y divide-border/50">
              {Object.entries(financials.statements[statement].items).map(([item, values]: [string, any]) => (
                <tr key={item}>
                  <td className="px-6 py-4 text-sm text-foreground">{item}</td>
                  {values.map((value: number, index: number) => (
                    <td key={index} className="px-6 py-4 text-right text-sm text-muted-foreground">
                      ${value.toLocaleString()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
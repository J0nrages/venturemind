import { Card } from '@/components/ui/card';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { DollarSign, Users, TrendingUp, Clock, Wallet, Save, Building2, BarChart3, FileText, Calculator } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

// --- Helper Function for Formatting ---
const formatCurrency = (value, isPercentage = false) => {
  if (isPercentage) {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (typeof value !== 'number') return value;
  const options = { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 };
  if (value < 0) {
    return `($${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})`;
  }
  return value.toLocaleString('en-US', options);
};

// --- Reusable Components ---
const SectionHeader = ({ title }: { title: string }) => (
  <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">{title}</h2>
);

const SubHeader = ({ title }: { title: string }) => (
  <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">{title}</h3>
);

const DataTable = ({ headers, rows }: { headers: string[], rows: any[] }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full bg-card/80 backdrop-blur-xl border border-border/50 rounded-lg shadow-sm">
      <thead className="bg-accent/30">
        <tr>
          {headers.map((header, index) => (
            <th key={index} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border/50">
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className={`hover:bg-accent/30 ${row.isSubtotal ? 'bg-muted' : ''}`}>
            {headers.map((header, colIndex) => {
              const value = row[header];
              const cellClasses = [
                "px-4 py-3 whitespace-nowrap text-sm",
                colIndex === 0 ? "text-foreground font-medium" : "text-muted-foreground text-right font-mono",
                row.isBold ? "font-bold" : "",
                row.isHeader ? "font-bold text-foreground bg-accent/30" : "",
                row.isTopBorder ? "border-t border-border/50" : "",
                row.isDoubleTopBorder ? "border-t-2 border-border" : "",
                row.isSpacer ? "pt-6" : ""
              ].join(" ");

              if (row.isHeader && colIndex > 0) return null;

              return (
                <td key={colIndex} colSpan={row.isHeader ? headers.length : 1} className={cellClasses}>
                  {formatCurrency(value, row.isPercentage)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

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
  headcount: {
    seniorEngineers: number[];
    midLevelEngineers: number[];
    juniorEngineers: number[];
    seniorSalary: number;
    midLevelSalary: number;
    juniorSalary: number;
    salesReps: number[];
    marketingSpecialists: number[];
    salesRepSalary: number;
    marketingSpecialistSalary: number;
  };
  infrastructure: {
    supabase: number;
    aiApi: number;
    hostingCdn: number;
  };
  operatingExpenses: {
    officeSpace: number;
    toolsAndSoftware: number;
    adminAndLegal: number;
    salesMarketing: number;
  };
}

const defaultAssumptions: Assumptions = {
  initialBalance: 1500000, // $1.5M seed funding
  products: [
    { id: 'basic', name: 'Basic Job Posting', price: 150, costOfSales: 15, customerCount: 100 },
    { id: 'premium', name: 'Premium Job Posting', price: 250, costOfSales: 25, customerCount: 150 },
    { id: 'enterprise', name: 'Enterprise Package', price: 500, costOfSales: 50, customerCount: 50 }
  ],
  customerMix: {
    basicPercent: 33,
    premiumPercent: 50,
    enterprisePercent: 17
  },
  growth: {
    monthlyGrowthRate: 15, // High growth for AI recruitment startup
    churnRate: 3,
    expansionRevenue: 10
  },
  costs: {
    cac: 200,
    grossMargin: 95,
    opexPerCustomer: 5
  },
  headcount: {
    seniorEngineers: [2, 2, 3, 4, 5],
    midLevelEngineers: [1, 2, 3, 4, 5],
    juniorEngineers: [0, 1, 1, 2, 3],
    seniorSalary: 180000,
    midLevelSalary: 140000,
    juniorSalary: 100000,
    salesReps: [0, 1, 2, 3, 4],
    marketingSpecialists: [0, 1, 1, 2, 3],
    salesRepSalary: 120000,
    marketingSpecialistSalary: 110000
  },
  infrastructure: {
    supabase: 800,
    aiApi: 3500,
    hostingCdn: 1500
  },
  operatingExpenses: {
    officeSpace: 5000, // Remote-first
    toolsAndSoftware: 2500,
    adminAndLegal: 4000,
    salesMarketing: 8000
  }
};

export default function ProformaPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [assumptions, setAssumptions] = useState<Assumptions>(defaultAssumptions);
  const [projections, setProjections] = useState<any[]>([]);
  const [structuredFinancials, setStructuredFinancials] = useState<any>(null);
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
      generateStructuredFinancials();
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
          },
          headcount: {
            ...defaultAssumptions.headcount,
            ...scenario.assumptions?.headcount
          },
          infrastructure: {
            ...defaultAssumptions.infrastructure,
            ...scenario.assumptions?.infrastructure
          },
          operatingExpenses: {
            ...defaultAssumptions.operatingExpenses,
            ...scenario.assumptions?.operatingExpenses
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
            name: 'AI Recruitment Startup Model',
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
          name: 'AI Recruitment Startup Model',
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

      toast.success('Financial model saved successfully');
    } catch (error) {
      console.error('Error saving assumptions:', error);
      toast.error('Failed to save financial model');
    } finally {
      setSaving(false);
    }
  };

  const calculateProjections = () => {
    const months = 36; // 3 years
    const projectionData = [];
    const startDate = new Date();
    
    let bankBalance = assumptions.initialBalance;
    let totalCustomers = assumptions.products.reduce((sum, p) => sum + p.customerCount, 0);
    let products = [...assumptions.products];
    
    for (let i = 0; i < months; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      
      // Apply growth and churn
      products = products.map(product => {
        const churnedCustomers = Math.round(product.customerCount * (assumptions.growth.churnRate / 100));
        const newCustomers = Math.round(product.customerCount * (assumptions.growth.monthlyGrowthRate / 100));
        return {
          ...product,
          customerCount: Math.max(0, product.customerCount - churnedCustomers + newCustomers)
        };
      });
      
      const mrr = products.reduce((sum, p) => sum + (p.price * p.customerCount), 0);
      const cogs = products.reduce((sum, p) => sum + (p.costOfSales * p.customerCount), 0);
      const totalCustomersNow = products.reduce((sum, p) => sum + p.customerCount, 0);
      
      // Calculate operating expenses based on headcount and other assumptions
      const yearIndex = Math.floor(i / 12);
      const headcountCosts = calculateHeadcountCosts(yearIndex);
      const infrastructureCosts = assumptions.infrastructure.supabase + assumptions.infrastructure.aiApi + assumptions.infrastructure.hostingCdn;
      const opexCosts = assumptions.operatingExpenses.officeSpace + assumptions.operatingExpenses.toolsAndSoftware + assumptions.operatingExpenses.adminAndLegal + assumptions.operatingExpenses.salesMarketing;
      
      const totalExpenses = cogs + headcountCosts + infrastructureCosts + opexCosts;
      const profit = mrr - totalExpenses;
      
      bankBalance += profit;
      
      const arr = mrr * 12;
      const ltv = calculateLTV(mrr / Math.max(totalCustomersNow, 1));
      const ltvCacRatio = ltv / assumptions.costs.cac;
      
      projectionData.push({
        date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        customers: totalCustomersNow,
        mrr,
        arr,
        expenses: totalExpenses,
        profit,
        bankBalance,
        ltv,
        ltvCacRatio,
        headcountCosts,
        infrastructureCosts,
        opexCosts,
        cogs
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

  const calculateHeadcountCosts = (yearIndex: number) => {
    const year = Math.min(yearIndex, 4); // Cap at 5 years of data
    
    const engineerCosts = 
      (assumptions.headcount.seniorEngineers[year] || 0) * (assumptions.headcount.seniorSalary / 12) * 1.4 + // 40% benefits load
      (assumptions.headcount.midLevelEngineers[year] || 0) * (assumptions.headcount.midLevelSalary / 12) * 1.4 +
      (assumptions.headcount.juniorEngineers[year] || 0) * (assumptions.headcount.juniorSalary / 12) * 1.4;
    
    const salesMarketingCosts = 
      (assumptions.headcount.salesReps[year] || 0) * (assumptions.headcount.salesRepSalary / 12) * 1.4 +
      (assumptions.headcount.marketingSpecialists[year] || 0) * (assumptions.headcount.marketingSpecialistSalary / 12) * 1.4;
    
    return engineerCosts + salesMarketingCosts;
  };

  const calculateLTV = (arpu: number) => {
    const monthlyChurnRate = assumptions.growth.churnRate / 100;
    const avgCustomerLifetime = 1 / monthlyChurnRate;
    return arpu * avgCustomerLifetime;
  };

  const generateStructuredFinancials = () => {
    if (projections.length === 0) return;

    // Generate 3-year annual data
    const yearlyData = [];
    for (let year = 0; year < 3; year++) {
      const startMonth = year * 12;
      const endMonth = Math.min((year + 1) * 12, projections.length);
      const yearData = projections.slice(startMonth, endMonth);
      
      if (yearData.length === 0) continue;
      
      const totalRevenue = yearData.reduce((sum, month) => sum + month.mrr, 0);
      const totalCOGS = yearData.reduce((sum, month) => sum + month.cogs, 0);
      const totalHeadcount = yearData.reduce((sum, month) => sum + month.headcountCosts, 0);
      const totalInfrastructure = yearData.reduce((sum, month) => sum + month.infrastructureCosts, 0);
      const totalOpEx = yearData.reduce((sum, month) => sum + month.opexCosts, 0);
      const totalExpenses = totalCOGS + totalHeadcount + totalInfrastructure + totalOpEx;
      const grossProfit = totalRevenue - totalCOGS;
      const netIncome = totalRevenue - totalExpenses;
      
      yearlyData.push({
        year: year + 1,
        revenue: totalRevenue,
        cogs: totalCOGS,
        grossProfit,
        headcountCosts: totalHeadcount,
        infrastructureCosts: totalInfrastructure,
        opexCosts: totalOpEx,
        totalExpenses,
        netIncome,
        customers: yearData[yearData.length - 1]?.customers || 0,
        endingCash: yearData[yearData.length - 1]?.bankBalance || 0
      });
    }

    // Generate structured financial statements
    const financialStatements = {
      revenue: {
        title: "Revenue Projections",
        headers: ["Metric", "Year 1", "Year 2", "Year 3"],
        rows: [
          { 
            "Metric": "Total Active Customers", 
            "Year 1": yearlyData[0]?.customers || 0, 
            "Year 2": yearlyData[1]?.customers || 0, 
            "Year 3": yearlyData[2]?.customers || 0 
          },
          { 
            "Metric": "Average Monthly Revenue per Customer", 
            "Year 1": yearlyData[0] ? Math.round((yearlyData[0].revenue / 12) / yearlyData[0].customers) : 0, 
            "Year 2": yearlyData[1] ? Math.round((yearlyData[1].revenue / 12) / yearlyData[1].customers) : 0, 
            "Year 3": yearlyData[2] ? Math.round((yearlyData[2].revenue / 12) / yearlyData[2].customers) : 0
          },
          { 
            "Metric": "Annual Revenue", 
            "Year 1": yearlyData[0]?.revenue || 0, 
            "Year 2": yearlyData[1]?.revenue || 0, 
            "Year 3": yearlyData[2]?.revenue || 0, 
            isBold: true 
          },
        ]
      },
      cogs: {
        title: "Cost of Goods Sold (COGS)",
        headers: ["Cost Category", "Year 1", "Year 2", "Year 3"],
        rows: [
          { 
            "Cost Category": "Direct Costs", 
            "Year 1": yearlyData[0]?.cogs || 0, 
            "Year 2": yearlyData[1]?.cogs || 0, 
            "Year 3": yearlyData[2]?.cogs || 0 
          },
          { 
            "Cost Category": "Infrastructure Costs", 
            "Year 1": yearlyData[0]?.infrastructureCosts || 0, 
            "Year 2": yearlyData[1]?.infrastructureCosts || 0, 
            "Year 3": yearlyData[2]?.infrastructureCosts || 0 
          },
          { 
            "Cost Category": "Total COGS", 
            "Year 1": (yearlyData[0]?.cogs || 0) + (yearlyData[0]?.infrastructureCosts || 0), 
            "Year 2": (yearlyData[1]?.cogs || 0) + (yearlyData[1]?.infrastructureCosts || 0), 
            "Year 3": (yearlyData[2]?.cogs || 0) + (yearlyData[2]?.infrastructureCosts || 0), 
            isBold: true 
          },
          { 
            "Cost Category": "Gross Profit", 
            "Year 1": yearlyData[0]?.grossProfit || 0, 
            "Year 2": yearlyData[1]?.grossProfit || 0, 
            "Year 3": yearlyData[2]?.grossProfit || 0, 
            isBold: true 
          },
          { 
            "Cost Category": "Gross Margin %", 
            "Year 1": yearlyData[0] ? (yearlyData[0].grossProfit / yearlyData[0].revenue) : 0, 
            "Year 2": yearlyData[1] ? (yearlyData[1].grossProfit / yearlyData[1].revenue) : 0, 
            "Year 3": yearlyData[2] ? (yearlyData[2].grossProfit / yearlyData[2].revenue) : 0, 
            isBold: true, 
            isPercentage: true 
          },
        ]
      },
      incomeStatement: {
        title: "Proforma Income Statement (3-Year Projection)",
        headers: ["Line Item", "Year 1", "Year 2", "Year 3"],
        rows: [
          { 
            "Line Item": "Revenue", 
            "Year 1": yearlyData[0]?.revenue || 0, 
            "Year 2": yearlyData[1]?.revenue || 0, 
            "Year 3": yearlyData[2]?.revenue || 0, 
            isBold: true 
          },
          { 
            "Line Item": "Cost of Goods Sold (COGS)", 
            "Year 1": -((yearlyData[0]?.cogs || 0) + (yearlyData[0]?.infrastructureCosts || 0)), 
            "Year 2": -((yearlyData[1]?.cogs || 0) + (yearlyData[1]?.infrastructureCosts || 0)), 
            "Year 3": -((yearlyData[2]?.cogs || 0) + (yearlyData[2]?.infrastructureCosts || 0))
          },
          { 
            "Line Item": "Gross Profit", 
            "Year 1": yearlyData[0]?.grossProfit || 0, 
            "Year 2": yearlyData[1]?.grossProfit || 0, 
            "Year 3": yearlyData[2]?.grossProfit || 0, 
            isBold: true, 
            isTopBorder: true 
          },
          { "Line Item": "Operating Expenses", isHeader: true, isSpacer: true },
          { 
            "Line Item": "  Salaries & Benefits", 
            "Year 1": -(yearlyData[0]?.headcountCosts || 0), 
            "Year 2": -(yearlyData[1]?.headcountCosts || 0), 
            "Year 3": -(yearlyData[2]?.headcountCosts || 0) 
          },
          { 
            "Line Item": "  General & Administrative", 
            "Year 1": -(yearlyData[0]?.opexCosts || 0), 
            "Year 2": -(yearlyData[1]?.opexCosts || 0), 
            "Year 3": -(yearlyData[2]?.opexCosts || 0) 
          },
          { 
            "Line Item": "Total Operating Expenses", 
            "Year 1": -((yearlyData[0]?.headcountCosts || 0) + (yearlyData[0]?.opexCosts || 0)), 
            "Year 2": -((yearlyData[1]?.headcountCosts || 0) + (yearlyData[1]?.opexCosts || 0)), 
            "Year 3": -((yearlyData[2]?.headcountCosts || 0) + (yearlyData[2]?.opexCosts || 0)), 
            isBold: true, 
            isTopBorder: true 
          },
          { 
            "Line Item": "Net Income / (Loss)", 
            "Year 1": yearlyData[0]?.netIncome || 0, 
            "Year 2": yearlyData[1]?.netIncome || 0, 
            "Year 3": yearlyData[2]?.netIncome || 0, 
            isBold: true, 
            isDoubleTopBorder: true 
          },
        ]
      },
      cashFlow: {
        title: "Key Metrics & Cash Flow Summary",
        headers: ["Metric", "Year 1", "Year 2", "Year 3"],
        rows: [
          { 
            "Metric": "Beginning Cash Balance", 
            "Year 1": assumptions.initialBalance, 
            "Year 2": yearlyData[0]?.endingCash || 0, 
            "Year 3": yearlyData[1]?.endingCash || 0, 
            isBold: true 
          },
          { 
            "Metric": "Net Income / (Loss)", 
            "Year 1": yearlyData[0]?.netIncome || 0, 
            "Year 2": yearlyData[1]?.netIncome || 0, 
            "Year 3": yearlyData[2]?.netIncome || 0 
          },
          { 
            "Metric": "Ending Cash Balance", 
            "Year 1": yearlyData[0]?.endingCash || 0, 
            "Year 2": yearlyData[1]?.endingCash || 0, 
            "Year 3": yearlyData[2]?.endingCash || 0, 
            isBold: true, 
            isDoubleTopBorder: true 
          },
          { 
            "Metric": "Monthly Burn Rate (Avg)", 
            "Year 1": yearlyData[0] ? Math.round((yearlyData[0].totalExpenses - yearlyData[0].revenue) / 12) : 0, 
            "Year 2": yearlyData[1] ? Math.round((yearlyData[1].totalExpenses - yearlyData[1].revenue) / 12) : 0, 
            "Year 3": yearlyData[2] ? Math.round((yearlyData[2].totalExpenses - yearlyData[2].revenue) / 12) : 0, 
            isSpacer: true 
          },
          { 
            "Metric": "Runway (Months)", 
            "Year 1": yearlyData[0] && yearlyData[0].netIncome < 0 ? Math.round(assumptions.initialBalance / Math.abs(yearlyData[0].netIncome / 12)) : "Profitable", 
            "Year 2": "-", 
            "Year 3": "-" 
          },
        ]
      }
    };

    setStructuredFinancials(financialStatements);
  };

  const handleProductChange = (index: number, field: keyof ProductType, value: number) => {
    setAssumptions(prev => ({
      ...prev,
      products: prev.products.map((product, i) => 
        i === index ? { ...product, [field]: value } : product
      )
    }));
  };

  const handleInputChange = (category: keyof Assumptions, field: string, value: number) => {
    setAssumptions(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof Assumptions],
        [field]: value
      }
    }));
  };

  const handleNestedInputChange = (category: keyof Assumptions, subcategory: string, field: string, value: number) => {
    setAssumptions(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof Assumptions],
        [subcategory]: {
          ...(prev[category as keyof Assumptions] as any)[subcategory],
          [field]: value
        }
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
    <div className="space-y-8 pt-14">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Financial Proforma Model</h1>
           <p className="text-muted-foreground mt-1">Comprehensive financial modeling and projections</p>
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

      {/* Tab Navigation */}
      <div className="border-b border-border/50">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview & Metrics
            </div>
          </button>
          <button
            onClick={() => setActiveTab('statements')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'statements'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Financial Statements
            </div>
          </button>
          <button
            onClick={() => setActiveTab('assumptions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'assumptions'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Model Assumptions
            </div>
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Cash Balance</p>
                <Building2 className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-semibold">${metrics?.bankBalance?.toLocaleString() || '0'}</h3>
            </div>

            <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Monthly Recurring Revenue</p>
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-semibold">${metrics?.currentMRR?.toLocaleString() || '0'}</h3>
            </div>

            <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-semibold">{metrics?.customers?.toLocaleString() || '0'}</h3>
            </div>

            <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Customer LTV</p>
                <Wallet className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-semibold">${metrics?.ltv?.toLocaleString() || '0'}</h3>
            </div>

            <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">LTV:CAC Ratio</p>
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-semibold">{metrics?.ltvCacRatio?.toFixed(1) || '0'}x</h3>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-6">Revenue Growth</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projections}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, '']} />
                    <Area
                      type="monotone"
                      dataKey="mrr"
                      stackId="1"
                      stroke="hsl(var(--chart-1))"
                      fill="hsl(var(--chart-1))"
                      fillOpacity={0.2}
                      name="MRR"
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
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-6">Cash Flow Projection</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={projections}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, '']} />
                    <Line
                      type="monotone"
                      dataKey="bankBalance"
                      stroke="#6366F1"
                      strokeWidth={2}
                      name="Cash Balance"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'statements' && structuredFinancials && (
        <div className="space-y-8">
          <div className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">Executive Summary</h2>
              <div className="mt-4 prose prose-lg text-muted-foreground max-w-none">
                <p>This document presents a 3-year financial projection for our AI-powered business platform. The model is based on our comprehensive business intelligence and document management capabilities.</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Funding:</strong> Starting with ${(assumptions.initialBalance / 1000000).toFixed(1)}M in initial funding</li>
                  <li><strong>Business Model:</strong> B2B SaaS with multiple pricing tiers and comprehensive AI features</li>
                  <li><strong>Growth Strategy:</strong> {assumptions.growth.monthlyGrowthRate}% monthly growth with focus on enterprise customers</li>
                  <li><strong>Technology:</strong> Advanced AI processing, real-time analytics, and scalable cloud infrastructure</li>
                </ul>
              </div>
            </div>

            <SectionHeader title={structuredFinancials.revenue.title} />
            <DataTable headers={structuredFinancials.revenue.headers} rows={structuredFinancials.revenue.rows} />

            <SectionHeader title={structuredFinancials.cogs.title} />
            <DataTable headers={structuredFinancials.cogs.headers} rows={structuredFinancials.cogs.rows} />

            <SectionHeader title={structuredFinancials.incomeStatement.title} />
            <DataTable headers={structuredFinancials.incomeStatement.headers} rows={structuredFinancials.incomeStatement.rows} />

            <SectionHeader title={structuredFinancials.cashFlow.title} />
            <DataTable headers={structuredFinancials.cashFlow.headers} rows={structuredFinancials.cashFlow.rows} />
          </div>
        </div>
      )}

      {activeTab === 'assumptions' && (
        <div className="bg-card/80 backdrop-blur-xl rounded-xl shadow-sm p-6 space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-6">Model Assumptions</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-md font-medium mb-4">Initial Setup</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Starting Funding</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <input
                        type="number"
                        value={assumptions.initialBalance}
                        onChange={(e) => setAssumptions(prev => ({ ...prev, initialBalance: parseFloat(e.target.value) }))}
                        className="w-full pl-8 pr-4 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md"
                      />
                    </div>
                  </div>
                </div>

                <h3 className="text-md font-medium mb-4 mt-8">Product Pricing</h3>
                <div className="space-y-6">
                  {assumptions.products.map((product, index) => (
                    <div key={product.id} className="space-y-4">
                      <h4 className="font-medium">{product.name}</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm text-muted-foreground mb-1">Price</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <input
                              type="number"
                              value={product.price}
                              onChange={(e) => handleProductChange(index, 'price', parseFloat(e.target.value))}
                              className="w-full pl-8 pr-4 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-muted-foreground mb-1">Cost of Sales</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <input
                              type="number"
                              value={product.costOfSales}
                              onChange={(e) => handleProductChange(index, 'costOfSales', parseFloat(e.target.value))}
                              className="w-full pl-8 pr-4 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-muted-foreground mb-1">Current Customers</label>
                          <input
                            type="number"
                            value={product.customerCount}
                            onChange={(e) => handleProductChange(index, 'customerCount', parseInt(e.target.value))}
                             className="w-full px-4 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md"
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
                    <label className="block text-sm text-muted-foreground mb-1">Monthly Growth Rate</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={assumptions.growth.monthlyGrowthRate}
                        onChange={(e) => handleNestedInputChange('growth', 'monthlyGrowthRate', 'rate', parseFloat(e.target.value))}
                       className="w-full pr-8 pl-4 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Monthly Churn Rate</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={assumptions.growth.churnRate}
                        onChange={(e) => handleNestedInputChange('growth', 'churnRate', 'rate', parseFloat(e.target.value))}
                       className="w-full pr-8 pl-4 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Net Revenue Expansion</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={assumptions.growth.expansionRevenue}
                        onChange={(e) => handleNestedInputChange('growth', 'expansionRevenue', 'rate', parseFloat(e.target.value))}
                       className="w-full pr-8 pl-4 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>

                <h3 className="text-md font-medium mb-4 mt-8">Cost Structure</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Customer Acquisition Cost</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <input
                        type="number"
                        value={assumptions.costs.cac}
                        onChange={(e) => handleNestedInputChange('costs', 'cac', 'amount', parseFloat(e.target.value))}
                        className="w-full pl-8 pr-4 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Gross Margin Target</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={assumptions.costs.grossMargin}
                        onChange={(e) => handleNestedInputChange('costs', 'grossMargin', 'rate', parseFloat(e.target.value))}
                       className="w-full pr-8 pl-4 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Monthly OpEx per Customer</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <input
                        type="number"
                        value={assumptions.costs.opexPerCustomer}
                        onChange={(e) => handleNestedInputChange('costs', 'opexPerCustomer', 'amount', parseFloat(e.target.value))}
                        className="w-full pl-8 pr-4 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
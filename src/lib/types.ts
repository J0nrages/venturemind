export interface FinancialMetrics {
  revenue: number;
  profit: number;
  expenses: number;
  revenueChange: number;
  profitChange: number;
  expensesChange: number;
}

export interface Scenario {
  id: string;
  user_id: string;
  name: string;
  description: string;
  assumptions: ScenarioAssumptions;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScenarioAssumptions {
  revenue: {
    basicPlan: number;
    premiumPlan: number;
    enterprisePlan: number;
    startupGrowth: number;
    midMarketGrowth: number;
    enterpriseGrowth: number;
    monthlyChurn: number;
    annualRetention: number;
    expansionRevenue: number;
  };
  customers: {
    currentCustomers: number;
    basicTierPercent: number;
    premiumTierPercent: number;
    searchMarketingCAC: number;
    socialMediaCAC: number;
    directSalesCAC: number;
    searchMarketingPercent: number;
    socialMediaPercent: number;
    directSalesPercent: number;
  };
  costs: {
    supabaseCost: number;
    aiApiCost: number;
    hostingCdnCost: number;
    costPer1000Users: number;
    costPer1000ApiCalls: number;
    aiProcessingPerDoc: number;
    officeSpace: number;
    toolsAndSoftware: number;
    adminAndLegal: number;
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
  capital: {
    cashOnHand: number;
    monthlyBurnRate: number;
    runwayMonths: number;
    seriesATarget: number;
    expectedDilution: number;
    targetCloseDate: string;
    productDevelopmentPercent: number;
    salesMarketingPercent: number;
    operationsPercent: number;
  };
}
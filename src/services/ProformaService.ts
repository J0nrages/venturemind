import { supabase } from '../lib/supabase';

export interface ProformaScenario {
  id: string;
  name: string;
  description: string;
  assumptions: ProformaAssumptions;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProformaAssumptions {
  // Revenue Drivers
  pricing: {
    basic: number;
    premium: number;
    enterprise: number;
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
  
  // Customer Acquisition
  customers: {
    current: number;
    basicTierPercent: number;
    premiumTierPercent: number;
  };
  cac: {
    searchMarketing: number;
    socialMedia: number;
    directSales: number;
  };
  marketingMix: {
    searchMarketingPercent: number;
    socialMediaPercent: number;
    directSalesPercent: number;
  };
  
  // Cost Structure
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
  
  // Headcount
  engineering: {
    senior: number[];
    midLevel: number[];
    junior: number[];
    seniorSalary: number;
    midLevelSalary: number;
    juniorSalary: number;
  };
  salesMarketing: {
    salesReps: number[];
    marketingSpecialists: number[];
    salesRepSalary: number;
    marketingSpecialistSalary: number;
  };
  
  // Capital
  funding: {
    cashOnHand: number;
    monthlyBurnRate: number;
    runwayMonths: number;
  };
  futureFunding: {
    seriesATarget: number;
    expectedDilution: number;
    targetCloseDate: string;
  };
  capitalAllocation: {
    productDevelopmentPercent: number;
    salesMarketingPercent: number;
    operationsPercent: number;
  };
}

export class ProformaService {
  // Get all scenarios for a user
  async getScenarios(userId: string): Promise<ProformaScenario[]> {
    try {
      const { data, error } = await supabase
        .from('proforma_scenarios')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching scenarios:', error);
      return [];
    }
  }
  
  // Get a specific scenario
  async getScenario(scenarioId: string): Promise<ProformaScenario | null> {
    try {
      const { data, error } = await supabase
        .from('proforma_scenarios')
        .select('*')
        .eq('id', scenarioId)
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching scenario:', error);
      return null;
    }
  }
  
  // Create a new scenario
  async createScenario(userId: string, scenario: Partial<ProformaScenario>): Promise<ProformaScenario | null> {
    try {
      const { data, error } = await supabase
        .from('proforma_scenarios')
        .insert({
          user_id: userId,
          name: scenario.name,
          description: scenario.description,
          assumptions: scenario.assumptions,
          is_active: scenario.isActive || false
        })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating scenario:', error);
      return null;
    }
  }
  
  // Update a scenario
  async updateScenario(scenarioId: string, updates: Partial<ProformaScenario>): Promise<ProformaScenario | null> {
    try {
      const { data, error } = await supabase
        .from('proforma_scenarios')
        .update({
          name: updates.name,
          description: updates.description,
          assumptions: updates.assumptions,
          is_active: updates.isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', scenarioId)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating scenario:', error);
      return null;
    }
  }
  
  // Delete a scenario
  async deleteScenario(scenarioId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('proforma_scenarios')
        .delete()
        .eq('id', scenarioId);
        
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting scenario:', error);
      return false;
    }
  }
  
  // Generate financial projections based on assumptions
  generateFinancials(assumptions: ProformaAssumptions) {
    // This would contain the actual financial modeling logic
    // For a real implementation, this would be a complex calculation engine
    // that generates income statements, balance sheets, and cash flow projections
    
    // For this demo, we'll return mock data
    return {
      incomeStatement: {},
      balanceSheet: {},
      cashFlow: {},
      metrics: {}
    };
  }
  
  // Get default assumptions for a new scenario
  getDefaultAssumptions(): ProformaAssumptions {
    return {
      // Revenue Drivers
      pricing: {
        basic: 49,
        premium: 99,
        enterprise: 299
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
      
      // Customer Acquisition
      customers: {
        current: 2845,
        basicTierPercent: 60,
        premiumTierPercent: 30
      },
      cac: {
        searchMarketing: 125,
        socialMedia: 95,
        directSales: 350
      },
      marketingMix: {
        searchMarketingPercent: 40,
        socialMediaPercent: 35,
        directSalesPercent: 25
      },
      
      // Cost Structure
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
      },
      
      // Headcount
      engineering: {
        senior: [3, 4, 5, 6, 8],
        midLevel: [5, 6, 8, 10, 12],
        junior: [2, 3, 4, 5, 6],
        seniorSalary: 150000,
        midLevelSalary: 120000,
        juniorSalary: 90000
      },
      salesMarketing: {
        salesReps: [2, 3, 4, 5, 6],
        marketingSpecialists: [2, 3, 3, 4, 5],
        salesRepSalary: 80000,
        marketingSpecialistSalary: 90000
      },
      
      // Capital
      funding: {
        cashOnHand: 2500000,
        monthlyBurnRate: 180000,
        runwayMonths: 14
      },
      futureFunding: {
        seriesATarget: 8000000,
        expectedDilution: 20,
        targetCloseDate: '2025-12-15'
      },
      capitalAllocation: {
        productDevelopmentPercent: 40,
        salesMarketingPercent: 35,
        operationsPercent: 25
      }
    };
  }
}

export const proformaService = new ProformaService();
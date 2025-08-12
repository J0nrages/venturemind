import { supabase } from '../lib/supabase';

export interface BusinessProfile {
  id: string;
  user_id: string;
  company_name: string;
  industry: string;
  size: string;
  revenue_model: string;
  billing_cycle: string;
  start_date: string;
  marketing_budget?: number;
  customer_segments: string[];
  created_at: string;
  updated_at: string;
}

export interface BusinessDimension {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  dimension_type: 'customer_segment' | 'product_line' | 'revenue_stream' | 'geographic' | 'temporal' | 'custom';
  is_system_default: boolean;
  created_at: string;
}

export interface DimensionValue {
  id: string;
  dimension_id: string;
  value: string;
  description?: string;
  metadata: any;
  is_active: boolean;
  created_at: string;
}

export interface BusinessMetric {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  metric_type: 'revenue' | 'customer' | 'operational' | 'financial' | 'growth' | 'custom';
  unit?: string;
  calculation_method?: string;
  target_value?: number;
  dimensions: string[];
  is_active: boolean;
  created_at: string;
}

export interface MetricDataPoint {
  id: string;
  metric_id: string;
  value: number;
  dimension_breakdown: any;
  period_start: string;
  period_end: string;
  notes?: string;
  created_at: string;
}

export class BusinessService {
  // Business Profile Management
  static async getBusinessProfile(userId: string): Promise<BusinessProfile | null> {
    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async createBusinessProfile(profile: Omit<BusinessProfile, 'id' | 'created_at' | 'updated_at'>): Promise<BusinessProfile> {
    const { data, error } = await supabase
      .from('business_profiles')
      .insert(profile)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateBusinessProfile(userId: string, updates: Partial<BusinessProfile>): Promise<BusinessProfile> {
    const { data, error } = await supabase
      .from('business_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Business Dimensions Management
  static async getBusinessDimensions(userId: string): Promise<BusinessDimension[]> {
    const { data, error } = await supabase
      .from('business_dimensions')
      .select('*')
      .or(`user_id.eq.${userId},is_system_default.eq.true`)
      .order('dimension_type', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async createBusinessDimension(dimension: Omit<BusinessDimension, 'id' | 'created_at'>): Promise<BusinessDimension> {
    const { data, error } = await supabase
      .from('business_dimensions')
      .insert(dimension)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getDimensionValues(dimensionId: string): Promise<DimensionValue[]> {
    const { data, error } = await supabase
      .from('dimension_values')
      .select('*')
      .eq('dimension_id', dimensionId)
      .eq('is_active', true)
      .order('value', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async createDimensionValue(value: Omit<DimensionValue, 'id' | 'created_at'>): Promise<DimensionValue> {
    const { data, error } = await supabase
      .from('dimension_values')
      .insert(value)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Business Metrics Management
  static async getBusinessMetrics(userId: string): Promise<BusinessMetric[]> {
    const { data, error } = await supabase
      .from('business_metrics')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('metric_type', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async createBusinessMetric(metric: Omit<BusinessMetric, 'id' | 'created_at'>): Promise<BusinessMetric> {
    const { data, error } = await supabase
      .from('business_metrics')
      .insert(metric)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getMetricDataPoints(metricId: string, startDate?: string, endDate?: string): Promise<MetricDataPoint[]> {
    let query = supabase
      .from('metric_data_points')
      .select('*')
      .eq('metric_id', metricId)
      .order('period_start', { ascending: true });

    if (startDate) {
      query = query.gte('period_start', startDate);
    }
    if (endDate) {
      query = query.lte('period_end', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async addMetricDataPoint(dataPoint: Omit<MetricDataPoint, 'id' | 'created_at'>): Promise<MetricDataPoint> {
    const { data, error } = await supabase
      .from('metric_data_points')
      .insert(dataPoint)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Dashboard Analytics - NO MOCK FALLBACKS
  static async getDashboardMetrics(userId: string): Promise<{
    mrr: number;
    arr: number;
    customers: number;
    churnRate: number;
    revenueChange: number;
    customerChange: number;
    hasData: boolean;
    dataStatus: {
      subscriptions: boolean;
      transactions: boolean;
      revenueEvents: boolean;
    };
  }> {
    try {
      // Get active subscriptions for MRR calculation
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('amount, interval, created_at')
        .eq('user_id', userId)
        .eq('status', 'active');

      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, created_at, type')
        .eq('user_id', userId);

      const { data: revenueEvents } = await supabase
        .from('revenue_events')
        .select('amount, created_at, event_type')
        .eq('user_id', userId);

      const mrr = subscriptions?.reduce((sum, sub) => {
        return sum + (sub.interval === 'annual' ? sub.amount / 12 : sub.amount);
      }, 0) || 0;

      // Calculate customer count from actual subscriptions
      const customerCount = subscriptions?.length || 0;

      // Calculate revenue change from transactions in last 30 days vs previous 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

      const recentTransactions = transactions?.filter(t => new Date(t.created_at) > thirtyDaysAgo) || [];
      const previousTransactions = transactions?.filter(t => {
        const date = new Date(t.created_at);
        return date > sixtyDaysAgo && date <= thirtyDaysAgo;
      }) || [];

      const recentRevenue = recentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      const previousRevenue = previousTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      
      const revenueChange = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      // Calculate churn rate from subscription cancellations
      const { data: cancelledSubs } = await supabase
        .from('subscriptions')
        .select('id, ended_at')
        .eq('user_id', userId)
        .eq('status', 'cancelled')
        .gte('ended_at', thirtyDaysAgo.toISOString());

      const totalSubsEver = (subscriptions?.length || 0) + (cancelledSubs?.length || 0);
      const churnRate = totalSubsEver > 0 ? (cancelledSubs?.length || 0) / totalSubsEver * 100 : 0;

      // Calculate customer change
      const recentCustomers = subscriptions?.filter(s => new Date(s.created_at) > thirtyDaysAgo).length || 0;
      const customerChange = customerCount > 0 && recentCustomers > 0 ? (recentCustomers / customerCount) * 100 : 0;

      const hasData = customerCount > 0 || mrr > 0 || (transactions?.length || 0) > 0;

      return {
        mrr: Math.round(mrr),
        arr: Math.round(mrr * 12),
        customers: customerCount,
        churnRate: Math.round(churnRate * 10) / 10,
        revenueChange: Math.round(revenueChange * 10) / 10,
        customerChange: Math.round(customerChange * 10) / 10,
        hasData,
        dataStatus: {
          subscriptions: (subscriptions?.length || 0) > 0,
          transactions: (transactions?.length || 0) > 0,
          revenueEvents: (revenueEvents?.length || 0) > 0
        }
      };
    } catch (error) {
      console.error('Error calculating dashboard metrics:', error);
      // Return zero values on error, no mock data
      return {
        mrr: 0,
        arr: 0,
        customers: 0,
        churnRate: 0,
        revenueChange: 0,
        customerChange: 0,
        hasData: false,
        dataStatus: {
          subscriptions: false,
          transactions: false,
          revenueEvents: false
        }
      };
    }
  }

  // Customer Analytics - NO MOCK FALLBACKS
  static async getCustomerMetrics(userId: string): Promise<{
    totalCustomers: number;
    newCustomers: number;
    churned: number;
    activeUsers: number;
    segmentBreakdown: { [key: string]: number };
    hasData: boolean;
  }> {
    try {
      // Get actual subscription data
      const { data: activeSubscriptions } = await supabase
        .from('subscriptions')
        .select('created_at, status, plan_id')
        .eq('user_id', userId)
        .eq('status', 'active');

      const { data: cancelledSubscriptions } = await supabase
        .from('subscriptions')
        .select('ended_at, plan_id')
        .eq('user_id', userId)
        .eq('status', 'cancelled')
        .gte('ended_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const newThisMonth = activeSubscriptions?.filter(sub => 
        new Date(sub.created_at) > thirtyDaysAgo
      ).length || 0;

      const totalCustomers = activeSubscriptions?.length || 0;
      const churned = cancelledSubscriptions?.length || 0;

      // Calculate segments based on plan_id from actual data
      const segmentBreakdown: { [key: string]: number } = {};
      if (activeSubscriptions && activeSubscriptions.length > 0) {
        activeSubscriptions.forEach(sub => {
          const segment = this.getSegmentFromPlanId(sub.plan_id);
          segmentBreakdown[segment] = (segmentBreakdown[segment] || 0) + 1;
        });
      }

      // Active users estimate (could be improved with actual usage data)
      const activeUsers = Math.round(totalCustomers * 0.8); // Conservative estimate

      const hasData = totalCustomers > 0;

      return {
        totalCustomers,
        newCustomers: newThisMonth,
        churned,
        activeUsers,
        segmentBreakdown,
        hasData
      };
    } catch (error) {
      console.error('Error calculating customer metrics:', error);
      return {
        totalCustomers: 0,
        newCustomers: 0,
        churned: 0,
        activeUsers: 0,
        segmentBreakdown: {},
        hasData: false
      };
    }
  }

  // Helper method to map plan IDs to segments
  private static getSegmentFromPlanId(planId: string): string {
    const plan = planId?.toLowerCase() || '';
    if (plan.includes('enterprise') || plan.includes('business')) {
      return 'Enterprise';
    } else if (plan.includes('professional') || plan.includes('premium')) {
      return 'Mid-Market';
    } else {
      return 'Small Business';
    }
  }

  // Initialize default business setup
  static async initializeBusinessDefaults(userId: string, profile: BusinessProfile): Promise<void> {
    try {
      // Create default business metrics for SaaS
      const defaultMetrics = [
        {
          user_id: userId,
          name: 'Monthly Recurring Revenue',
          description: 'Total MRR from all subscriptions',
          metric_type: 'revenue' as const,
          unit: 'dollars',
          calculation_method: 'sum',
          target_value: 100000,
          dimensions: [],
          is_active: true
        },
        {
          user_id: userId,
          name: 'Customer Acquisition Cost',
          description: 'Cost to acquire a new customer',
          metric_type: 'customer' as const,
          unit: 'dollars',
          calculation_method: 'average',
          target_value: 125,
          dimensions: [],
          is_active: true
        },
        {
          user_id: userId,
          name: 'Monthly Churn Rate',
          description: 'Percentage of customers who cancelled this month',
          metric_type: 'customer' as const,
          unit: 'percentage',
          calculation_method: 'latest',
          target_value: 2,
          dimensions: [],
          is_active: true
        }
      ];

      // Insert metrics
      await Promise.all(
        defaultMetrics.map(metric => this.createBusinessMetric(metric))
      );

      // Create dimension values for existing dimensions
      const dimensions = await this.getBusinessDimensions(userId);
      
      for (const dimension of dimensions) {
        if (dimension.dimension_type === 'customer_segment') {
          const defaultSegments = ['Enterprise', 'Mid-Market', 'SMB'];
          await Promise.all(
            defaultSegments.map(segment => 
              this.createDimensionValue({
                dimension_id: dimension.id,
                value: segment,
                description: `${segment} customer segment`,
                metadata: {},
                is_active: true
              })
            )
          );
        } else if (dimension.dimension_type === 'product_line') {
          await this.createDimensionValue({
            dimension_id: dimension.id,
            value: 'Core Product',
            description: 'Main product offering',
            metadata: {},
            is_active: true
          });
        }
      }

    } catch (error) {
      console.error('Error initializing business defaults:', error);
    }
  }
}
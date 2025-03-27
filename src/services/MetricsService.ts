import { supabase } from '../lib/supabase';

export interface Metrics {
  mrr: number;
  arr: number;
  ltv: number;
  cac: number;
  churnRate: number;
  activeSubscriptions: number;
  revenueChurn: number;
  netRevenue: number;
}

export class MetricsService {
  // Calculate Monthly Recurring Revenue
  async calculateMRR(userId: string): Promise<number> {
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('amount, interval')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (!subscriptions) return 0;

    return subscriptions.reduce((mrr, sub) => {
      return mrr + (sub.interval === 'annual' 
        ? sub.amount / 12 
        : sub.amount);
    }, 0);
  }

  // Calculate Customer Lifetime Value
  async calculateLTV(userId: string): Promise<number> {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (!transactions) return 0;

    const totalRevenue = transactions.reduce((total, tx) => {
      return total + (tx.type === 'refund' ? -tx.amount : tx.amount);
    }, 0);

    const { data: customerSince } = await supabase
      .from('customer_events')
      .select('created_at')
      .eq('user_id', userId)
      .eq('event_type', 'signup')
      .order('created_at')
      .limit(1)
      .single();

    if (!customerSince) return 0;

    const monthsAsCustomer = Math.max(1, 
      Math.ceil((Date.now() - new Date(customerSince.created_at).getTime()) / 
      (1000 * 60 * 60 * 24 * 30)));

    return totalRevenue / monthsAsCustomer;
  }

  // Calculate Churn Rate
  async calculateChurnRate(timeframe: 'month' | 'year' = 'month'): Promise<number> {
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('status, ended_at')
      .filter('ended_at', 'gte', 
        new Date(Date.now() - (timeframe === 'month' ? 30 : 365) * 24 * 60 * 60 * 1000)
        .toISOString()
      );

    if (!subscriptions) return 0;

    const { data: totalSubs } = await supabase
      .from('subscriptions')
      .select('id', { count: 'exact' });

    const churned = subscriptions.filter(sub => 
      sub.status === 'cancelled' || sub.status === 'expired'
    ).length;

    return totalSubs ? (churned / totalSubs.length) * 100 : 0;
  }

  // Get all metrics for a user
  async getAllMetrics(userId: string): Promise<Metrics> {
    const mrr = await this.calculateMRR(userId);
    const ltv = await this.calculateLTV(userId);
    const churnRate = await this.calculateChurnRate();

    return {
      mrr,
      arr: mrr * 12,
      ltv,
      cac: 0, // Requires marketing spend data
      churnRate,
      activeSubscriptions: 0, // Implement based on needs
      revenueChurn: 0, // Implement based on needs
      netRevenue: 0, // Implement based on needs
    };
  }
}

export const metricsService = new MetricsService();
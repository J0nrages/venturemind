export interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  icon: React.ComponentType;
}

export interface RevenueData {
  date: string;
  revenue: number;
}

export interface CustomerData {
  date: string;
  customers: number;
}

export interface ExpenseData {
  category: string;
  amount: number;
}
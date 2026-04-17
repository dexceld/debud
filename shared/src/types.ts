export interface User {
  id: string;
  name: string;
  email: string;
  currency: string;
  defaultMonthStart: number;
}

export interface AccountSnapshot {
  id: string;
  userId: string;
  month: string;
  openingBalance: number;
}

export interface CategoryGroup {
  id: string;
  userId: string;
  name: string;
  color: string;
}

export interface Category {
  id: string;
  groupId: string;
  name: string;
  type: 'expense' | 'income';
}

export interface BudgetLine {
  id: string;
  categoryId: string;
  amount: number;
  startMonth: string;
  endMonth: string | null;
}

export interface Transaction {
  id: string;
  categoryId: string;
  month: string;
  actualAmount: number;
  notes?: string;
  attachment?: string;
  date: string;
}

export interface MonthData {
  month: string;
  openingBalance: number;
  groups: CategoryGroupData[];
  totalBudgeted: number;
  totalActual: number;
  remaining: number;
}

export interface CategoryGroupData {
  group: CategoryGroup;
  categories: CategoryData[];
  groupBudgeted: number;
  groupActual: number;
}

export interface CategoryData {
  category: Category;
  budget: number;
  actual: number;
  transactions: Transaction[];
  variance: number;
  status: 'good' | 'warning' | 'danger';
}

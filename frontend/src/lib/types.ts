export type AccountType = "savings" | "daily" | "investment" | "other";
export type TransactionType = "income" | "expense";

export interface Account {
  id: number;
  name: string;
  account_type: AccountType;
  balance: number;
  monthly_limit: number | null;
  color: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  monthly_budget: number | null;
  created_at: string;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  description: string;
  party: string | null;
  account_id: number;
  category_id: number | null;
  date: string;
  notes: string | null;
  bill_path: string | null;
  bill_ocr_text: string | null;
  ai_processed: boolean;
  created_at: string;
  account: Account | null;
  category: Category | null;
}

export interface MonthlySummary {
  year: number;
  month: number;
  total_income: number;
  total_expense: number;
  net: number;
}

export interface CategoryStat {
  id: number;
  name: string;
  color: string;
  icon: string;
  monthly_budget: number | null;
  total: number;
  percent_used: number | null;
}

export interface MonthlyTrend {
  year: number;
  month: number;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface AccountLimit {
  id: number;
  name: string;
  account_type: AccountType;
  color: string;
  balance: number;
  monthly_limit: number | null;
  spent_this_month: number;
  remaining: number | null;
  percent_used: number | null;
}

export interface DailySpending {
  date: string;
  amount: number;
}

export interface NLPResult {
  type: TransactionType;
  amount: number;
  description: string;
  party: string | null;
  category_name: string | null;
  confidence: number;
  raw_text: string;
  notes: string | null;
}

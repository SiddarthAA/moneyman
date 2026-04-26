import axios from "axios";
import type {
  Account,
  Category,
  Transaction,
  MonthlySummary,
  CategoryStat,
  MonthlyTrend,
  AccountLimit,
  DailySpending,
  NLPResult,
} from "./types";

const api = axios.create({
  // In dev/production the browser hits /backend/* which Next.js proxies to the
  // backend server — no CORS issues, works over Tailscale without any IP config.
  // Set NEXT_PUBLIC_API_URL to override with a direct URL (e.g. for mobile apps).
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/backend",
});

// ── Accounts ───────────────────────────────────────────────────────────────
export const getAccounts = () => api.get<Account[]>("/accounts/").then((r) => r.data);

export const createAccount = (data: Partial<Account>) =>
  api.post<Account>("/accounts/", data).then((r) => r.data);

export const updateAccount = (id: number, data: Partial<Account>) =>
  api.patch<Account>(`/accounts/${id}`, data).then((r) => r.data);

export const deleteAccount = (id: number) =>
  api.delete(`/accounts/${id}`).then((r) => r.data);

export const depositToAccount = (id: number, amount: number, description?: string, notes?: string) =>
  api.post<Account>(`/accounts/${id}/deposit`, { amount, description, notes }).then((r) => r.data);

export const transferFunds = (fromId: number, toAccountId: number, amount: number, description?: string, notes?: string) =>
  api.post<Account>(`/accounts/${fromId}/transfer`, { to_account_id: toAccountId, amount, description, notes }).then((r) => r.data);

// ── Categories ─────────────────────────────────────────────────────────────
export const getCategories = () =>
  api.get<Category[]>("/categories/").then((r) => r.data);

export const createCategory = (data: Partial<Category>) =>
  api.post<Category>("/categories/", data).then((r) => r.data);

export const updateCategory = (id: number, data: Partial<Category>) =>
  api.patch<Category>(`/categories/${id}`, data).then((r) => r.data);

export const deleteCategory = (id: number) =>
  api.delete(`/categories/${id}`).then((r) => r.data);

// ── Transactions ───────────────────────────────────────────────────────────
export interface TransactionFilters {
  type?: string;
  account_id?: number;
  category_id?: number;
  search?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export const getTransactions = (filters?: TransactionFilters) =>
  api.get<Transaction[]>("/transactions/", { params: filters }).then((r) => r.data);

export const createTransaction = (data: Partial<Transaction>) =>
  api.post<Transaction>("/transactions/", data).then((r) => r.data);

export const updateTransaction = (id: number, data: Partial<Transaction>) =>
  api.patch<Transaction>(`/transactions/${id}`, data).then((r) => r.data);

export const deleteTransaction = (id: number) =>
  api.delete(`/transactions/${id}`).then((r) => r.data);

export const uploadBill = (txId: number, file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  return api
    .post<Transaction>(`/transactions/${txId}/bill`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

// ── AI ─────────────────────────────────────────────────────────────────────
export const parseNLP = (text: string, account_id?: number) =>
  api
    .post<NLPResult>("/ai/parse", { text, account_id })
    .then((r) => r.data);

export const parseAndSave = (text: string, account_id?: number) =>
  api
    .post<Transaction>("/ai/parse-and-save", { text, account_id })
    .then((r) => r.data);

export const scanBill = (file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  return api
    .post<NLPResult>("/ai/scan-bill", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

// ── Analytics ──────────────────────────────────────────────────────────────
export const getSummary = (year?: number, month?: number) =>
  api
    .get<MonthlySummary>("/analytics/summary", { params: { year, month } })
    .then((r) => r.data);

export const getByCategory = (year?: number, month?: number) =>
  api
    .get<CategoryStat[]>("/analytics/by-category", { params: { year, month } })
    .then((r) => r.data);

export const getMonthlyTrend = (months?: number) =>
  api
    .get<MonthlyTrend[]>("/analytics/monthly-trend", { params: { months } })
    .then((r) => r.data);

export const getAccountLimits = () =>
  api.get<AccountLimit[]>("/analytics/account-limits").then((r) => r.data);

export const getDailySpending = (days?: number) =>
  api
    .get<DailySpending[]>("/analytics/daily-spending", { params: { days } })
    .then((r) => r.data);

"use client";

import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getSummary,
  getAccountLimits,
  getByCategory,
  getTransactions,
  getDailySpending,
} from "@/lib/api";
import type {
  MonthlySummary,
  AccountLimit,
  CategoryStat,
  Transaction,
  DailySpending,
} from "@/lib/types";
import { SpendingTrendChart } from "@/components/dashboard/SpendingTrendChart";
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart";
import { AccountLimitBars } from "@/components/dashboard/AccountLimitBars";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { format } from "date-fns";

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  sub,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <div
      className="rounded-sm border border-border p-4 flex flex-col gap-2 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, hsl(var(--card)) 60%, ${color}10 100%)`,
        borderColor: `${color}20`,
      }}
    >
      <div
        className="absolute -top-6 -right-6 h-20 w-20 rounded-full opacity-[0.08] blur-sm"
        style={{ background: color }}
      />
      <div className="flex items-center justify-between">
        <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-medium">{title}</p>
        <div className="p-1.5 rounded-sm" style={{ background: color + "18" }}>
          <Icon className="h-3.5 w-3.5" style={{ color }} strokeWidth={1.5} />
        </div>
      </div>
      <p className="text-2xl font-light tracking-tight">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground font-light">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const now = new Date();
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [daily, setDaily] = useState<DailySpending[]>([]);
  const [limits, setLimits] = useState<AccountLimit[]>([]);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getSummary(now.getFullYear(), now.getMonth() + 1),
      getDailySpending(31),
      getAccountLimits(),
      getByCategory(now.getFullYear(), now.getMonth() + 1),
      getTransactions({ limit: 8 }),
    ]).then(([s, d, l, c, r]) => {
      setSummary(s);
      setDaily(d);
      setLimits(l);
      setCategories(c.filter((cat) => cat.total > 0));
      setRecent(r);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="px-4 py-5 space-y-4 lg:px-6 lg:py-6">
      {/* Header */}
      <div>
        <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Overview</p>
        <h1 className="text-xl font-light tracking-tight">{format(now, "MMMM yyyy")}</h1>
      </div>

      {/* Stat cards — 2 col always, 4 col on xl */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-sm" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <StatCard title="Expenses" value={fmt(summary?.total_expense ?? 0)} icon={ArrowUpRight} color="#f43f5e" sub="This month" />
          <StatCard title="Net Income" value={fmt(summary?.total_income ?? 0)} icon={ArrowDownLeft} color="#10b981" sub="This month" />
          <StatCard
            title="Net Savings"
            value={fmt(limits.filter((l) => l.account_type === "savings").reduce((s, l) => s + l.balance, 0))}
            icon={PiggyBank}
            color="#6366f1"
            sub="In savings accounts"
          />
          <StatCard
            title="Total Balance"
            value={fmt(limits.reduce((a, l) => a + l.balance, 0))}
            icon={Wallet}
            color="#8b5cf6"
            sub={`${limits.length} account${limits.length !== 1 ? "s" : ""}`}
          />
        </div>
      )}

      <SpendingTrendChart data={daily} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CategoryPieChart data={categories} loading={loading} />
        <AccountLimitBars data={limits} loading={loading} />
      </div>

      <RecentTransactions data={recent} loading={loading} />
    </div>
  );
}

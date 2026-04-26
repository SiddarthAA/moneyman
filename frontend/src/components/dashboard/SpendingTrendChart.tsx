"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { DailySpending } from "@/lib/types";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { format } from "date-fns";

interface Props {
  data: DailySpending[];
  loading: boolean;
}

export function SpendingTrendChart({ data, loading }: Props) {
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentMonthData = data.filter((d) => d.date.startsWith(monthStr));

  if (loading) {
    return (
      <div className="rounded-sm border border-border bg-card p-4">
        <Skeleton className="h-3 w-32 mb-4 rounded-sm" />
        <Skeleton className="h-40 w-full rounded-sm" />
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
          Daily Expenses · {format(now, "MMMM yyyy")}
        </p>
        {currentMonthData.length > 0 && (
          <p className="text-[10px] text-muted-foreground font-light">
            avg ₹{Math.round(currentMonthData.reduce((s, d) => s + d.amount, 0) / currentMonthData.length).toLocaleString("en-IN")}/day
          </p>
        )}
      </div>
      {currentMonthData.length === 0 ? (
        <p className="text-[11px] text-muted-foreground py-8 text-center font-light">
          No spending this month yet
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={currentMonthData} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(d) => format(new Date(d + "T12:00:00"), "d")}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 2, fontSize: 11 }}
              labelFormatter={(d) => format(new Date(d + "T12:00:00"), "EEEE, MMM d")}
              formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, "Spent"]}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#f43f5e"
              strokeWidth={1.5}
              fill="url(#spendGrad)"
              dot={false}
              activeDot={{ r: 3, fill: "#f43f5e", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

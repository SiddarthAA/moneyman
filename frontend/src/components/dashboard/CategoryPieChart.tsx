"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { CategoryStat } from "@/lib/types";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface Props {
  data: CategoryStat[];
  loading: boolean;
}

export function CategoryPieChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-sm border border-border bg-card p-4">
        <Skeleton className="h-3 w-24 mb-4 rounded-sm" />
        <Skeleton className="h-36 w-full rounded-sm" />
      </div>
    );
  }

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-medium mb-3">By Category</p>
      {data.length === 0 ? (
        <div className="h-36 flex items-center justify-center text-[11px] text-muted-foreground font-light">
          No expenses this month
        </div>
      ) : (
        <div className="flex gap-4 items-center">
          <div className="flex-shrink-0">
            <ResponsiveContainer width={110} height={110}>
              <PieChart>
                <Pie data={data} dataKey="total" nameKey="name" cx="50%" cy="50%" innerRadius={28} outerRadius={52} paddingAngle={2} strokeWidth={0}>
                  {data.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 2, fontSize: 11 }}
                  formatter={(val) => [fmt(Number(val ?? 0)), ""]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2 min-w-0">
            {data.slice(0, 5).map((cat) => (
              <div key={cat.id} className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                <span className="text-[11px] text-muted-foreground font-light truncate flex-1 capitalize">{cat.name}</span>
                <span className="text-[11px] font-light flex-shrink-0">{fmt(cat.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

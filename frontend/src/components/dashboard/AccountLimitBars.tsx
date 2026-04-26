"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { AccountLimit } from "@/lib/types";

interface Props {
  data: AccountLimit[];
  loading: boolean;
}

export function AccountLimitBars({ data, loading }: Props) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-medium mb-4">Account Limits</p>
      {loading ? (
        <div className="space-y-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-sm" />)}</div>
      ) : data.length === 0 ? (
        <p className="text-[11px] text-muted-foreground py-4 text-center font-light">No accounts yet</p>
      ) : (
        <div className="space-y-4">
          {data.map((acc) => {
            const pct = acc.percent_used ?? 0;
            const over = pct > 100;
            return (
              <div key={acc.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ background: acc.color }} />
                    <span className="text-[12px] font-light">{acc.name}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-light">{fmt(acc.balance)}</span>
                </div>
                {acc.monthly_limit ? (
                  <>
                    <div className="relative h-px rounded-full overflow-hidden bg-border">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(pct, 100)}%`, background: over ? "#f43f5e" : acc.color }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span className="font-light">{fmt(acc.spent_this_month)} spent</span>
                      <span className={over ? "text-rose-400 font-medium" : "font-light"}>
                        {over ? `over ${fmt(Math.abs(acc.remaining ?? 0))}` : `${fmt(acc.remaining ?? 0)} left`}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-[10px] text-muted-foreground font-light">{fmt(acc.spent_this_month)} spent · no limit</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

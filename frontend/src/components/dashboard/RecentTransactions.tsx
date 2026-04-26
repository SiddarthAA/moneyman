"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Transaction } from "@/lib/types";
import { format } from "date-fns";

interface Props {
  data: Transaction[];
  loading: boolean;
}

export function RecentTransactions({ data, loading }: Props) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="rounded-sm border border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-medium">Recent Transactions</p>
        <Link href="/transactions" className="text-[10px] text-primary hover:underline tracking-wide">View all</Link>
      </div>
      <div>
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-sm" />)}
          </div>
        ) : data.length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-8 text-center font-light">No transactions yet</p>
        ) : (
          data.map((tx, idx) => (
            <div key={tx.id} className={`flex items-center gap-3 px-4 py-3 ${idx < data.length - 1 ? "border-b border-border/50" : ""}`}>
              <div className={`p-1.5 rounded-sm flex-shrink-0 ${tx.type === "income" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                {tx.type === "income"
                  ? <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
                  : <ArrowUpRight className="h-3.5 w-3.5 text-rose-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-light truncate">{tx.description}</p>
                <p className="text-[10px] text-muted-foreground font-light truncate">
                  {tx.party || tx.account?.name} · {format(new Date(tx.date), "MMM d")}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-[12px] font-medium ${tx.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                  {tx.type === "income" ? "+" : "-"}{fmt(tx.amount)}
                </p>
                {tx.category && (
                  <p className="text-[9px] text-muted-foreground mt-0.5 font-light capitalize">{tx.category.name}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

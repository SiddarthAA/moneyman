"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { href: "/utilities", icon: SlidersHorizontal, label: "Utilities" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* ── Desktop sidebar (lg+) ─────────────────────────── */}
      <aside className="hidden lg:flex w-52 flex-shrink-0 flex-col border-r border-border bg-sidebar fixed top-0 left-0 h-full z-50">
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div
              className="h-7 w-7 rounded-sm flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, oklch(0.68 0.22 264 / 0.25), oklch(0.70 0.17 162 / 0.15))", border: "1px solid oklch(0.68 0.22 264 / 0.3)" }}
            >
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <span className="text-foreground" style={{ fontFamily: "RasterForge, sans-serif", fontSize: "15px", letterSpacing: "0.05em" }}>MoneyMan</span>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5 font-light">Finance Tracker</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground px-3 mb-3 font-medium">Navigation</p>
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-all duration-150 relative",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-primary" />
                )}
                <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={active ? 2 : 1.5} />
                <span className="font-light text-[13px]">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-border">
          <p className="text-[10px] text-muted-foreground font-light tracking-wide">Personal Finance</p>
        </div>
      </aside>

      {/* ── Mobile bottom nav (< lg) ──────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-2xl border-t border-border">
        <div className="flex items-stretch" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className={cn("p-1.5 rounded-sm transition-all", active && "bg-primary/10")}>
                  <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.5} />
                </div>
                <span className={cn(
                  "text-[9px] tracking-[0.08em] font-medium",
                  active ? "text-primary" : "text-muted-foreground"
                )}>{label.toUpperCase()}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

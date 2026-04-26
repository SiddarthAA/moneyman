"use client";

import { useEffect, useState, useRef } from "react";
import {
  Plus, Search, ScanLine, Trash2, Upload,
  ArrowDownLeft, ArrowUpRight, Sparkles, X, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getTransactions, getAccounts, getCategories, createTransaction,
  deleteTransaction, parseNLP, parseAndSave, scanBill, uploadBill
} from "@/lib/api";
import type { Transaction, Account, Category, NLPResult } from "@/lib/types";
import { format } from "date-fns";
import { toast } from "sonner";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [nlpText, setNlpText] = useState("");
  const [nlpParsing, setNlpParsing] = useState(false);
  const [nlpPreview, setNlpPreview] = useState<NLPResult | null>(null);
  const [mode, setMode] = useState<"manual" | "nlp">("nlp");
  const [form, setForm] = useState({
    type: "expense",
    amount: "",
    description: "",
    party: "",
    account_id: "",
    category_id: "",
    notes: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });
  const [saving, setSaving] = useState(false);
  const [billFile, setBillFile] = useState<File | null>(null);
  const [billScanning, setBillScanning] = useState(false);
  const [mounted, setMounted] = useState(false);
  const billRef = useRef<HTMLInputElement>(null);
  const billUploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const load = (q?: string, t?: string) => {
    setLoading(true);
    getTransactions({
      search: q || undefined,
      type: t === "all" ? undefined : t || undefined,
      limit: 100,
    }).then((txs) => {
      setTransactions(txs);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    if (!mounted) return;
    Promise.all([getAccounts(), getCategories()]).then(([a, c]) => {
      setAccounts(a);
      setCategories(c);
      if (a.length > 0) setForm((f) => ({ ...f, account_id: String(a[0].id) }));
    });
    load();
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const t = setTimeout(() => load(search, typeFilter), 300);
    return () => clearTimeout(t);
  }, [search, typeFilter, mounted]);

  const handleNLPParse = async () => {
    if (!nlpText.trim()) return;
    setNlpParsing(true);
    try {
      const result = await parseNLP(nlpText, form.account_id ? Number(form.account_id) : undefined);
      setNlpPreview(result);
      setForm((f) => ({
        ...f,
        type: result.type,
        amount: String(result.amount),
        description: result.description,
        party: result.party ?? "",
        category_id: result.category_name
          ? String(categories.find((c) => c.name === result.category_name)?.id ?? "")
          : f.category_id,
      }));
    } catch {
      toast.error("AI parsing failed. Check your Groq API key.");
    }
    setNlpParsing(false);
  };

  const handleNLPSave = async () => {
    if (!nlpText.trim()) return;
    setSaving(true);
    try {
      const tx = await parseAndSave(nlpText, form.account_id ? Number(form.account_id) : undefined);
      setTransactions((prev) => [tx, ...prev]);
      setNlpText("");
      setNlpPreview(null);
      setShowForm(false);
      toast.success("Transaction saved with AI");
    } catch {
      toast.error("Failed to save transaction");
    }
    setSaving(false);
  };

  const handleBillScan = async (file: File) => {
    setBillScanning(true);
    try {
      const result = await scanBill(file);
      setNlpPreview(result);
      setForm((f) => ({
        ...f,
        type: "expense",
        amount: String(result.amount),
        description: result.description,
        party: result.party ?? "",
        category_id: result.category_name
          ? String(categories.find((c) => c.name === result.category_name)?.id ?? "")
          : f.category_id,
      }));
      setBillFile(file);
      toast.success("Bill scanned with OCR + AI");
    } catch {
      toast.error("Bill scan failed");
    }
    setBillScanning(false);
  };

  const handleManualSave = async () => {
    if (!form.amount || !form.description || !form.account_id) {
      toast.error("Fill in amount, description, and account");
      return;
    }
    setSaving(true);
    try {
      const tx = await createTransaction({
        type: form.type as "income" | "expense",
        amount: Number(form.amount),
        description: form.description,
        party: form.party || undefined,
        account_id: Number(form.account_id),
        category_id: form.category_id ? Number(form.category_id) : undefined,
        notes: form.notes || undefined,
        date: new Date(form.date).toISOString(),
      } as Parameters<typeof createTransaction>[0]);

      // upload bill if present
      if (billFile) {
        await uploadBill(tx.id, billFile);
      }

      setTransactions((prev) => [tx, ...prev]);
      setShowForm(false);
      setBillFile(null);
      setNlpPreview(null);
      toast.success("Transaction saved");
    } catch {
      toast.error("Failed to save transaction");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const resetForm = () => {
    setForm({
      type: "expense",
      amount: "",
      description: "",
      party: "",
      account_id: accounts.length > 0 ? String(accounts[0].id) : "",
      category_id: "",
      notes: "",
      date: format(new Date(), "yyyy-MM-dd"),
    });
    setNlpText("");
    setNlpPreview(null);
    setBillFile(null);
  };

  if (!mounted) return <div className="min-h-screen" />;

  return (
    <div className="px-4 py-5 space-y-4 lg:px-6 lg:py-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Ledger</p>
          <h1 className="text-xl font-light tracking-tight">Transactions</h1>
          <p className="text-[11px] text-muted-foreground font-light">{transactions.length} records</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm" className="gap-1.5 h-8 rounded-sm text-xs">
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-9 h-9 rounded-sm text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList className="h-9 rounded-sm">
            <TabsTrigger value="all" className="text-xs px-3 rounded-sm">All</TabsTrigger>
            <TabsTrigger value="income" className="text-xs px-3 rounded-sm">In</TabsTrigger>
            <TabsTrigger value="expense" className="text-xs px-3 rounded-sm">Out</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Transaction list */}
      <div className="rounded-sm border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-sm" />)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center text-[11px] text-muted-foreground font-light">
            No transactions found. Add your first one!
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] group transition-colors relative">
                <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${tx.type === "income" ? "bg-emerald-500/50" : "bg-rose-500/50"}`} />
                <div className={`p-2 rounded-sm flex-shrink-0 ${tx.type === "income" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                  {tx.type === "income"
                    ? <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
                    : <ArrowUpRight className="h-3.5 w-3.5 text-rose-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-light truncate">{tx.description}</p>
                    {tx.ai_processed && <Sparkles className="h-3 w-3 text-primary flex-shrink-0" />}
                    {tx.bill_path && <ScanLine className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-light truncate">
                    {tx.party && `${tx.party} · `}
                    {tx.account?.name} · {format(new Date(tx.date), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {tx.category && (
                    <span className="hidden sm:inline text-[9px] font-medium px-1.5 py-0.5 rounded-sm capitalize" style={{ background: tx.category.color + "20", color: tx.category.color }}>
                      {tx.category.name}
                    </span>
                  )}
                  <span className={`text-[13px] font-medium ${tx.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                    {tx.type === "income" ? "+" : "-"}{fmt(tx.amount)}
                  </span>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 rounded-sm"
                    onClick={() => handleDelete(tx.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Transaction Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90svh] overflow-y-auto rounded-sm p-0">
          {/* Colored accent bar */}
          <div className={`h-0.5 w-full rounded-t-sm transition-colors ${form.type === "income" ? "bg-gradient-to-r from-emerald-500 to-teal-400" : "bg-gradient-to-r from-rose-500 to-pink-500"}`} />

          <div className="p-5 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-medium tracking-wide">New Transaction</DialogTitle>
            </DialogHeader>

            {/* Mode switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-sm">
              <button
                onClick={() => setMode("nlp")}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-[2px] text-xs font-medium transition-all ${mode === "nlp" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                <Sparkles className="h-3.5 w-3.5" /> AI / NLP
              </button>
              <button
                onClick={() => setMode("manual")}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-[2px] text-xs font-medium transition-all ${mode === "manual" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                <Filter className="h-3.5 w-3.5" /> Manual
              </button>
            </div>

            {mode === "nlp" ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Describe your transaction</label>
                  <Textarea
                    placeholder={"e.g. \"paid 450 at Zomato from daily funds\" or \"received 50000 salary\""}
                    value={nlpText}
                    onChange={(e) => setNlpText(e.target.value)}
                    className="resize-none text-sm"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 gap-1.5" onClick={handleNLPParse} disabled={nlpParsing || !nlpText.trim()} variant="outline" size="sm">
                    <Sparkles className="h-3.5 w-3.5" />
                    {nlpParsing ? "Parsing..." : "Preview"}
                  </Button>
                  <Button
                    variant="outline" size="icon" className="h-9 w-9 flex-shrink-0"
                    onClick={() => billRef.current?.click()}
                    title="Scan a bill" disabled={billScanning}
                  >
                    {billScanning ? "..." : <ScanLine className="h-4 w-4" />}
                  </Button>
                  <input ref={billRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleBillScan(e.target.files[0])} />
                </div>

                {nlpPreview && (
                  <div className={`rounded-sm border p-3 space-y-2.5 ${nlpPreview.type === "income" ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-primary" />
                        <span className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">AI Preview</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{Math.round(nlpPreview.confidence * 100)}% confident</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className={`font-semibold text-sm ${nlpPreview.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                          {nlpPreview.type === "income" ? "+" : "-"}{fmt(nlpPreview.amount)}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground capitalize">{nlpPreview.type}</span>
                      </div>
                      <p className="text-[12px] font-light">{nlpPreview.description}</p>
                      {nlpPreview.party && <p className="text-[11px] text-muted-foreground">{nlpPreview.party}</p>}
                      {nlpPreview.category_name && (
                        <p className="text-[10px] text-primary capitalize">{nlpPreview.category_name}</p>
                      )}
                      {nlpPreview.notes && (
                        <p className="text-[11px] text-muted-foreground italic">{nlpPreview.notes}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Account</label>
                  <Select value={form.account_id} onValueChange={(v) => setForm((f) => ({ ...f, account_id: v ?? "" }))}>
                    <SelectTrigger>
                      <span className="text-sm font-light">
                        {accounts.find((a) => String(a.id) === form.account_id)?.name ?? "Select account"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleNLPSave} disabled={saving || !nlpText.trim()} className="w-full">
                  {saving ? "Saving..." : "Save with AI"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Expense / Income toggle */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setForm((f) => ({ ...f, type: "expense" }))}
                    className={`py-2.5 rounded-sm text-[13px] font-medium flex items-center justify-center gap-1.5 transition-all border ${
                      form.type === "expense"
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" /> Expense
                  </button>
                  <button
                    onClick={() => setForm((f) => ({ ...f, type: "income" }))}
                    className={`py-2.5 rounded-sm text-[13px] font-medium flex items-center justify-center gap-1.5 transition-all border ${
                      form.type === "income"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ArrowDownLeft className="h-3.5 w-3.5" /> Income
                  </button>
                </div>

                {/* Amount — large prominent input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-muted-foreground font-light pointer-events-none">₹</span>
                    <Input
                      type="number" placeholder="0" value={form.amount}
                      className={`pl-8 text-xl font-light h-12 rounded-sm transition-colors ${
                        form.type === "expense" ? "border-rose-500/20 focus-visible:ring-rose-500/20" : "border-emerald-500/20 focus-visible:ring-emerald-500/20"
                      }`}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Date</label>
                    <Input type="date" value={form.date}
                      onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Account</label>
                    <Select value={form.account_id} onValueChange={(v) => setForm((f) => ({ ...f, account_id: v ?? "" }))}>
                      <SelectTrigger>
                        <span className="text-sm font-light">
                          {accounts.find((a) => String(a.id) === form.account_id)?.name ?? "Select"}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Description</label>
                  <Input placeholder="e.g. Lunch at Zomato" value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{form.type === "income" ? "From" : "To"}</label>
                    <Input placeholder={form.type === "income" ? "Source / person" : "Payee / store"}
                      value={form.party} onChange={(e) => setForm((f) => ({ ...f, party: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Category</label>
                    <Select value={form.category_id} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v ?? "" }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Notes</label>
                  <Textarea placeholder="Optional notes..." value={form.notes} rows={2}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="resize-none text-sm" />
                </div>

                {/* Bill upload */}
                <div
                  className="border border-dashed border-border rounded-sm p-3 text-center cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => billUploadRef.current?.click()}
                >
                  {billFile ? (
                    <div className="flex items-center justify-center gap-2 text-xs text-foreground">
                      <ScanLine className="h-3.5 w-3.5 text-primary" />
                      <span>{billFile.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); setBillFile(null); }} className="text-muted-foreground hover:text-foreground ml-1">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs">
                      <Upload className="h-3.5 w-3.5" />
                      <span>Attach bill (optional)</span>
                    </div>
                  )}
                </div>
                <input ref={billUploadRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setBillFile(f); handleBillScan(f); }
                  }} />

                <Button
                  onClick={handleManualSave} disabled={saving}
                  className={`w-full font-medium ${form.type === "expense" ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
                >
                  {saving ? "Saving..." : "Save Transaction"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  Wallet, Tag, Plus, Pencil, Trash2, PlusCircle, ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  getAccounts, createAccount, updateAccount, deleteAccount,
  depositToAccount, transferFunds,
  getCategories, createCategory, updateCategory, deleteCategory,
} from "@/lib/api";
import type { Account, Category } from "@/lib/types";
import { toast } from "sonner";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const ACC_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4", "#ec4899"];
const CAT_COLORS = ["#f97316", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#e11d48", "#6b7280", "#10b981", "#06b6d4", "#6366f1"];

export default function UtilitiesPage() {
  // ── Accounts state ────────────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accLoading, setAccLoading] = useState(true);
  const [showAccForm, setShowAccForm] = useState(false);
  const [editingAcc, setEditingAcc] = useState<Account | null>(null);
  const [accForm, setAccForm] = useState({
    name: "", account_type: "daily", balance: "", monthly_limit: "", color: ACC_COLORS[0],
  });
  const [savingAcc, setSavingAcc] = useState(false);

  // Deposit
  const [depositAccount, setDepositAccount] = useState<Account | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositDesc, setDepositDesc] = useState("Direct deposit");
  const [depositNote, setDepositNote] = useState("");
  const [depositing, setDepositing] = useState(false);

  // Transfer
  const [transferFrom, setTransferFrom] = useState<Account | null>(null);
  const [transferToId, setTransferToId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDesc, setTransferDesc] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [transferring, setTransferring] = useState(false);

  // ── Categories state ──────────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({
    name: "", color: CAT_COLORS[0], icon: "tag", monthly_budget: "",
  });
  const [savingCat, setSavingCat] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    getAccounts().then((a) => { setAccounts(a); setAccLoading(false); }).catch(() => setAccLoading(false));
    getCategories().then((c) => { setCategories(c); setCatLoading(false); }).catch(() => setCatLoading(false));
  }, [mounted]);

  // ── Account handlers ──────────────────────────────────────────────────────
  const openCreateAcc = () => {
    setEditingAcc(null);
    setAccForm({ name: "", account_type: "daily", balance: "", monthly_limit: "", color: ACC_COLORS[0] });
    setShowAccForm(true);
  };

  const openEditAcc = (acc: Account) => {
    setEditingAcc(acc);
    setAccForm({
      name: acc.name,
      account_type: acc.account_type ?? "daily",
      balance: String(acc.balance),
      monthly_limit: acc.monthly_limit ? String(acc.monthly_limit) : "",
      color: acc.color,
    });
    setShowAccForm(true);
  };

  const handleSaveAcc = async () => {
    if (!accForm.name) { toast.error("Name is required"); return; }
    setSavingAcc(true);
    try {
      const payload = {
        name: accForm.name,
        account_type: accForm.account_type as Account["account_type"],
        balance: Number(accForm.balance) || 0,
        monthly_limit: accForm.monthly_limit ? Number(accForm.monthly_limit) : undefined,
        color: accForm.color,
      };
      if (editingAcc) {
        const updated = await updateAccount(editingAcc.id, payload);
        setAccounts((prev) => prev.map((a) => (a.id === editingAcc.id ? updated : a)));
        toast.success("Account updated");
      } else {
        const created = await createAccount(payload);
        setAccounts((prev) => [...prev, created]);
        toast.success("Account created");
      }
      setShowAccForm(false);
    } catch { toast.error("Failed to save account"); }
    setSavingAcc(false);
  };

  const handleDeleteAcc = async (id: number) => {
    try {
      await deleteAccount(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      toast.success("Account deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const handleDeposit = async () => {
    if (!depositAccount || !depositAmount || Number(depositAmount) <= 0) return;
    setDepositing(true);
    try {
      const updated = await depositToAccount(depositAccount.id, Number(depositAmount), depositDesc || "Direct deposit", depositNote || undefined);
      setAccounts((prev) => prev.map((a) => (a.id === depositAccount.id ? updated : a)));
      toast.success(`${fmt(Number(depositAmount))} added to ${depositAccount.name}`);
      setDepositAccount(null); setDepositAmount(""); setDepositNote(""); setDepositDesc("Direct deposit");
    } catch { toast.error("Failed to add money"); }
    setDepositing(false);
  };

  const handleTransfer = async () => {
    if (!transferFrom || !transferToId || !transferAmount || Number(transferAmount) <= 0) return;
    setTransferring(true);
    try {
      await transferFunds(transferFrom.id, Number(transferToId), Number(transferAmount), transferDesc || undefined, transferNote || undefined);
      const fresh = await import("@/lib/api").then((m) => m.getAccounts());
      setAccounts(fresh);
      const toAcc = accounts.find((a) => a.id === Number(transferToId));
      toast.success(`${fmt(Number(transferAmount))} transferred to ${toAcc?.name ?? "account"}`);
      setTransferFrom(null); setTransferToId(""); setTransferAmount(""); setTransferDesc(""); setTransferNote("");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? "Transfer failed");
    }
    setTransferring(false);
  };

  // ── Category handlers ─────────────────────────────────────────────────────
  const openCreateCat = () => {
    setEditingCat(null);
    setCatForm({ name: "", color: CAT_COLORS[0], icon: "tag", monthly_budget: "" });
    setShowCatForm(true);
  };

  const openEditCat = (cat: Category) => {
    setEditingCat(cat);
    setCatForm({ name: cat.name, color: cat.color, icon: cat.icon, monthly_budget: cat.monthly_budget ? String(cat.monthly_budget) : "" });
    setShowCatForm(true);
  };

  const handleSaveCat = async () => {
    if (!catForm.name.trim()) { toast.error("Name is required"); return; }
    setSavingCat(true);
    try {
      const payload = {
        name: catForm.name.toLowerCase().trim(),
        color: catForm.color, icon: catForm.icon,
        monthly_budget: catForm.monthly_budget ? Number(catForm.monthly_budget) : undefined,
      };
      if (editingCat) {
        const updated = await updateCategory(editingCat.id, payload);
        setCategories((prev) => prev.map((c) => (c.id === editingCat.id ? updated : c)));
        toast.success("Category updated");
      } else {
        const created = await createCategory(payload);
        setCategories((prev) => [...prev, created]);
        toast.success("Category created");
      }
      setShowCatForm(false);
    } catch { toast.error("Failed to save category"); }
    setSavingCat(false);
  };

  const handleDeleteCat = async (id: number) => {
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast.success("Deleted");
    } catch { toast.error("Cannot delete — category has transactions attached"); }
  };

  if (!mounted) return <div className="min-h-screen" />;

  return (
    <div className="px-4 py-5 space-y-4 lg:px-6 lg:py-6">
      <div>
        <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-medium">Manage</p>
        <h1 className="text-xl font-light tracking-tight">Utilities</h1>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList className="rounded-sm">
          <TabsTrigger value="accounts" className="rounded-sm gap-1.5 text-xs">
            <Wallet className="h-3.5 w-3.5" /> Accounts
          </TabsTrigger>
          <TabsTrigger value="categories" className="rounded-sm gap-1.5 text-xs">
            <Tag className="h-3.5 w-3.5" /> Categories
          </TabsTrigger>
        </TabsList>

        {/* ── Accounts tab ──────────────────────────────────────────────── */}
        <TabsContent value="accounts" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground font-light">
              {accounts.length} wallet{accounts.length !== 1 ? "s" : ""}
            </p>
            <Button onClick={openCreateAcc} size="sm" className="gap-1.5 h-8 rounded-sm text-xs">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>

          {accLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-sm" />)}</div>
          ) : accounts.length === 0 ? (
            <div className="py-16 text-center text-[11px] text-muted-foreground font-light">No accounts yet. Create one to get started.</div>
          ) : (
            <div className="space-y-2">
              {accounts.map((acc) => (
                <div key={acc.id} className="flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-3 sm:py-4 rounded-sm border border-border bg-card group hover:bg-white/[0.02] transition-colors">
                  <div className="h-9 w-9 rounded-sm flex items-center justify-center flex-shrink-0" style={{ background: acc.color + "18", border: `1px solid ${acc.color}30` }}>
                    <Wallet className="h-4 w-4" style={{ color: acc.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-light">{acc.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-sm uppercase tracking-wide font-medium" style={{ background: acc.color + "18", color: acc.color }}>{acc.account_type}</span>
                    </div>
                    <p className="text-[15px] font-light mt-0.5" style={{ color: acc.color }}>{fmt(acc.balance)}</p>
                    {acc.monthly_limit && (
                      <p className="text-[10px] text-muted-foreground font-light">Limit: {fmt(acc.monthly_limit)}/mo</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-sm" title="Add money"
                      onClick={() => { setDepositAccount(acc); setDepositAmount(""); setDepositNote(""); setDepositDesc("Direct deposit"); }}>
                      <PlusCircle className="h-3.5 w-3.5 text-emerald-400" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-sm" title="Transfer funds"
                      onClick={() => { setTransferFrom(acc); setTransferToId(""); setTransferAmount(""); setTransferDesc(""); setTransferNote(""); }}>
                      <ArrowLeftRight className="h-3.5 w-3.5 text-blue-400" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-sm" onClick={() => openEditAcc(acc)}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-sm" onClick={() => handleDeleteAcc(acc.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Categories tab ────────────────────────────────────────────── */}
        <TabsContent value="categories" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground font-light">Expense categories with monthly budgets</p>
            <Button onClick={openCreateCat} size="sm" variant="outline" className="gap-1.5 h-8 rounded-sm text-xs">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>

          {catLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : categories.length === 0 ? (
            <div className="py-12 text-center text-[11px] text-muted-foreground font-light">No categories yet.</div>
          ) : (
            <div className="space-y-1">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-3 px-3 py-3 rounded-sm border border-border bg-card group hover:bg-white/[0.02] transition-colors">
                  <div className="h-7 w-7 rounded-sm flex items-center justify-center flex-shrink-0" style={{ background: cat.color + "18", border: `1px solid ${cat.color}30` }}>
                    <Tag className="h-3.5 w-3.5" style={{ color: cat.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-light capitalize">{cat.name}</span>
                      <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                    </div>
                    {cat.monthly_budget && (
                      <p className="text-[10px] text-muted-foreground font-light">{fmt(cat.monthly_budget)}/mo</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm" onClick={() => openEditCat(cat)}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm" onClick={() => handleDeleteCat(cat.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Account create / edit dialog ─────────────────────────────────── */}
      <Dialog open={showAccForm} onOpenChange={setShowAccForm}>
        <DialogContent className="max-w-sm rounded-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">{editingAcc ? "Edit Account" : "New Account"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="e.g. Daily Funds" value={accForm.name}
                onChange={(e) => setAccForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={accForm.account_type} onValueChange={(v) => setAccForm((f) => ({ ...f, account_type: v ?? "daily" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Balance (₹)</Label>
                <Input type="number" placeholder="0" value={accForm.balance}
                  onChange={(e) => setAccForm((f) => ({ ...f, balance: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Monthly Limit</Label>
                <Input type="number" placeholder="Optional" value={accForm.monthly_limit}
                  onChange={(e) => setAccForm((f) => ({ ...f, monthly_limit: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {ACC_COLORS.map((c) => (
                  <button key={c} type="button"
                    className="h-6 w-6 rounded-sm border-2 transition-all"
                    style={{ background: c, borderColor: accForm.color === c ? "white" : "transparent" }}
                    onClick={() => setAccForm((f) => ({ ...f, color: c }))} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveAcc} disabled={savingAcc} className="w-full">
              {savingAcc ? "Saving..." : (editingAcc ? "Update Account" : "Create Account")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Deposit dialog ───────────────────────────────────────────────── */}
      <Dialog open={!!depositAccount} onOpenChange={(o) => { if (!o) setDepositAccount(null); }}>
        <DialogContent className="max-w-sm rounded-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">Add Money</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[11px] text-muted-foreground">
              Adding to: <span className="font-medium text-foreground">{depositAccount?.name}</span>
            </p>
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input type="number" placeholder="e.g. 50000" value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="e.g. Monthly salary" value={depositDesc}
                onChange={(e) => setDepositDesc(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input placeholder="Any extra details..." value={depositNote}
                onChange={(e) => setDepositNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleDeposit} disabled={depositing || !depositAmount || Number(depositAmount) <= 0} className="w-full">
              {depositing ? "Adding..." : `Add ${depositAmount ? fmt(Number(depositAmount)) : "Money"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Transfer dialog ──────────────────────────────────────────────── */}
      <Dialog open={!!transferFrom} onOpenChange={(o) => { if (!o) setTransferFrom(null); }}>
        <DialogContent className="max-w-sm rounded-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">Transfer Funds</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[11px] text-muted-foreground">
              From: <span className="font-medium text-foreground">{transferFrom?.name}</span>
              {transferFrom && <span className="ml-2">({fmt(transferFrom.balance)} available)</span>}
            </p>
            <div className="space-y-1.5">
              <Label>To Account</Label>
              <Select value={transferToId} onValueChange={(v) => setTransferToId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                <SelectContent>
                  {accounts.filter((a) => a.id !== transferFrom?.id).map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input type="number" placeholder="e.g. 5000" value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Input placeholder="e.g. Saving up" value={transferDesc}
                onChange={(e) => setTransferDesc(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input placeholder="Any details..." value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleTransfer}
              disabled={transferring || !transferToId || !transferAmount || Number(transferAmount) <= 0}
              className="w-full">
              {transferring ? "Transferring..." : "Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Category create / edit dialog ────────────────────────────────── */}
      <Dialog open={showCatForm} onOpenChange={setShowCatForm}>
        <DialogContent className="max-w-sm rounded-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">{editingCat ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="e.g. food, transport" value={catForm.name}
                onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Monthly Budget (₹) — optional</Label>
              <Input type="number" placeholder="Leave blank for no limit" value={catForm.monthly_budget}
                onChange={(e) => setCatForm((f) => ({ ...f, monthly_budget: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {CAT_COLORS.map((c) => (
                  <button key={c} type="button"
                    className="h-6 w-6 rounded-sm border-2 transition-all"
                    style={{ background: c, borderColor: catForm.color === c ? "white" : "transparent" }}
                    onClick={() => setCatForm((f) => ({ ...f, color: c }))} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveCat} disabled={savingCat} className="w-full">
              {savingCat ? "Saving..." : (editingCat ? "Update Category" : "Create Category")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

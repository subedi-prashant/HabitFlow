"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  Edit3,
  Landmark,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  BS_MONTHS,
  CATEGORIES,
  ENTRY_TYPES,
  PAYMENT_METHODS,
  bsDateToJsDate,
  formatBsDate,
  formatBsDateLong,
  getCurrentBsDate,
  isValidBsDate,
  toNpr,
  type BSEntryDate,
  type EntryType,
  type PaymentMethod,
  type WalletCategory,
} from "@/lib/wallet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type WalletEntry = {
  id: string;
  entryType: EntryType;
  amount: number;
  category: WalletCategory;
  paymentMethod: PaymentMethod;
  description: string;
  bsDate: BSEntryDate;
  adDateIso: string;
  createdAt: string;
};

type WalletFormState = {
  entryType: EntryType;
  amount: string;
  category: WalletCategory;
  paymentMethod: PaymentMethod;
  description: string;
  bsDate: BSEntryDate;
};

const STORAGE_KEY = "wallet.entries.v1";

function createInitialForm(): WalletFormState {
  return {
    entryType: "Expense",
    amount: "",
    category: "Food",
    paymentMethod: "Cash",
    description: "",
    bsDate: getCurrentBsDate(),
  };
}

export default function WalletPage() {
  const [entries, setEntries] = useState<WalletEntry[]>([]);
  const [form, setForm] = useState<WalletFormState>(() => createInitialForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"All" | EntryType>("All");
  const [search, setSearch] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as WalletEntry[];
        if (Array.isArray(parsed)) {
          setEntries(parsed);
        }
      }
    } catch {
      toast.error("Could not load saved wallet entries.");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, hydrated]);

  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(b.adDateIso).getTime() - new Date(a.adDateIso).getTime()
      ),
    [entries]
  );

  const visibleEntries = useMemo(() => {
    return sortedEntries.filter((entry) => {
      const matchesFilter = filter === "All" || entry.entryType === filter;
      const haystack = [
        entry.description,
        entry.category,
        entry.paymentMethod,
        formatBsDate(entry.bsDate),
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [filter, search, sortedEntries]);

  const stats = useMemo(() => {
    const income = entries
      .filter((entry) => entry.entryType === "Income")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const expense = entries
      .filter((entry) => entry.entryType === "Expense")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const balance = income - expense;

    const currentBsDate = getCurrentBsDate();
    const monthEntries = entries.filter(
      (entry) =>
        entry.bsDate.year === currentBsDate.year && entry.bsDate.month === currentBsDate.month
    );
    const monthIncome = monthEntries
      .filter((entry) => entry.entryType === "Income")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const monthExpense = monthEntries
      .filter((entry) => entry.entryType === "Expense")
      .reduce((sum, entry) => sum + entry.amount, 0);

    const categoryTotals = CATEGORIES.map((category) => {
      const total = entries
        .filter((entry) => entry.entryType === "Expense" && entry.category === category)
        .reduce((sum, entry) => sum + entry.amount, 0);
      return { category, total };
    }).sort((a, b) => b.total - a.total);

    const paymentTotals = PAYMENT_METHODS.map((paymentMethod) => {
      const total = entries
        .filter((entry) => entry.paymentMethod === paymentMethod)
        .reduce((sum, entry) => sum + entry.amount, 0);
      return { paymentMethod, total };
    }).sort((a, b) => b.total - a.total);

    return {
      income,
      expense,
      balance,
      monthIncome,
      monthExpense,
      categoryTotals,
      paymentTotals,
      currentBsDate,
    };
  }, [entries]);

  const totalEntries = entries.length;
  const latestEntry = sortedEntries[0] ?? null;
  const topCategory = stats.categoryTotals.find((item) => item.total > 0);
  const preferredPayment = stats.paymentTotals.find((item) => item.total > 0);

  const resetForm = () => {
    setForm(createInitialForm());
    setEditingId(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    if (!isValidBsDate(form.bsDate)) {
      toast.error("Enter a valid Bikram Samvat date.");
      return;
    }

    const adDate = bsDateToJsDate(form.bsDate);
    const entry: WalletEntry = {
      id: editingId ?? crypto.randomUUID(),
      entryType: form.entryType,
      amount,
      category: form.category,
      paymentMethod: form.paymentMethod,
      description: form.description.trim(),
      bsDate: form.bsDate,
      adDateIso: adDate.toISOString(),
      createdAt: editingId ? new Date().toISOString() : adDate.toISOString(),
    };

    setEntries((current) =>
      editingId
        ? current.map((item) => (item.id === editingId ? entry : item))
        : [entry, ...current]
    );

    toast.success(editingId ? "Entry updated." : "Entry saved.");
    resetForm();
  };

  const handleEdit = (entry: WalletEntry) => {
    setEditingId(entry.id);
    setForm({
      entryType: entry.entryType,
      amount: String(entry.amount),
      category: entry.category,
      paymentMethod: entry.paymentMethod,
      description: entry.description,
      bsDate: entry.bsDate,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
    if (editingId === id) {
      resetForm();
    }
    toast.success("Entry removed.");
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-[-5rem] top-24 h-80 w-80 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
      </div>

      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-6"
        >
          <div className="flex flex-col gap-5 rounded-3xl border bg-card/85 p-6 shadow-xl shadow-black/5 backdrop-blur md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Wallet
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                  Track every rupee with Bikram Samvat dates.
                </h1>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Log daily expenses and income in BS, keep your cashflow visible, and review the month at a glance.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatBsDateLong(stats.currentBsDate)}
                </Badge>
                <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                  <Wallet className="h-3.5 w-3.5" />
                  {totalEntries} entries
                </Badge>
                {latestEntry && (
                  <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
                    Latest: {formatBsDate(latestEntry.bsDate)}
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[26rem]">
              <StatCard
                label="Balance"
                value={toNpr(stats.balance)}
                description="Income minus expense"
                icon={<Landmark className="h-5 w-5" />}
                tone={stats.balance >= 0 ? "positive" : "negative"}
              />
              <StatCard
                label="This BS Month"
                value={toNpr(stats.monthExpense)}
                description={`${BS_MONTHS[stats.currentBsDate.month - 1]} spending`}
                icon={<CalendarDays className="h-5 w-5" />}
                tone="neutral"
              />
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <SummaryCard
                  label="Income"
                  value={toNpr(stats.income)}
                  delta={`${entries.filter((entry) => entry.entryType === "Income").length} items`}
                  icon={<ArrowUpRight className="h-5 w-5" />}
                />
                <SummaryCard
                  label="Expense"
                  value={toNpr(stats.expense)}
                  delta={`${entries.filter((entry) => entry.entryType === "Expense").length} items`}
                  icon={<ArrowDownRight className="h-5 w-5" />}
                />
                <SummaryCard
                  label="This BS Month Net"
                  value={toNpr(stats.monthIncome - stats.monthExpense)}
                  delta={`Income ${toNpr(stats.monthIncome)} · Expense ${toNpr(stats.monthExpense)}`}
                  icon={<CreditCard className="h-5 w-5" />}
                />
              </div>

              <Card className="overflow-hidden border-0 bg-card/90 shadow-xl shadow-black/5 backdrop-blur">
                <CardHeader className="space-y-3 border-b bg-muted/30">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl">Add a new entry</CardTitle>
                      <CardDescription>
                        Record an income or expense in Bikram Samvat.
                      </CardDescription>
                    </div>
                    {editingId && (
                      <Button variant="ghost" onClick={resetForm} type="button">
                        Cancel edit
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label>Entry type</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {ENTRY_TYPES.map((entryType) => (
                          <button
                            key={entryType}
                            type="button"
                            onClick={() => setForm((current) => ({ ...current, entryType }))}
                            className={cn(
                              "rounded-2xl border px-4 py-3 text-left transition-all",
                              form.entryType === entryType
                                ? "border-primary bg-primary/10 text-primary shadow-sm"
                                : "border-border bg-background/60 hover:border-primary/40"
                            )}
                          >
                            <div className="text-sm font-semibold">{entryType}</div>
                            <div className="text-xs text-muted-foreground">
                              {entryType === "Expense" ? "Money leaving your wallet" : "Money coming in"}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount (NPR)</Label>
                        <Input
                          id="amount"
                          inputMode="decimal"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={form.amount}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, amount: event.target.value }))
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={form.category}
                          onValueChange={(value) =>
                            setForm((current) => ({ ...current, category: value as WalletCategory }))
                          }
                        >
                          <SelectTrigger id="category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[1fr_0.8fr_0.8fr]">
                      <div className="space-y-2">
                        <Label htmlFor="bs-year">BS year</Label>
                        <Input
                          id="bs-year"
                          type="number"
                          min="2000"
                          max="3000"
                          value={form.bsDate.year}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              bsDate: { ...current.bsDate, year: Number(event.target.value) },
                            }))
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>BS month</Label>
                        <Select
                          value={String(form.bsDate.month)}
                          onValueChange={(value) =>
                            setForm((current) => ({
                              ...current,
                              bsDate: { ...current.bsDate, month: Number(value) },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select month" />
                          </SelectTrigger>
                          <SelectContent>
                            {BS_MONTHS.map((month, index) => (
                              <SelectItem key={month} value={String(index + 1)}>
                                {month}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bs-day">BS day</Label>
                        <Input
                          id="bs-day"
                          type="number"
                          min="1"
                          max="32"
                          value={form.bsDate.day}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              bsDate: { ...current.bsDate, day: Number(event.target.value) },
                            }))
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="payment">Payment method</Label>
                        <Select
                          value={form.paymentMethod}
                          onValueChange={(value) =>
                            setForm((current) => ({
                              ...current,
                              paymentMethod: value as PaymentMethod,
                            }))
                          }
                        >
                          <SelectTrigger id="payment">
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map((method) => (
                              <SelectItem key={method} value={method}>
                                {method}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          placeholder="Optional short note"
                          value={form.description}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, description: event.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-muted-foreground">
                        {editingId
                          ? `Editing ${form.entryType.toLowerCase()} dated ${formatBsDate(form.bsDate)}`
                          : "Use the current BS date or enter a past/future BS date manually."}
                      </p>
                      <Button type="submit" className="gap-2 sm:min-w-40">
                        <Plus className="h-4 w-4" />
                        {editingId ? "Update entry" : "Save entry"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-0 bg-card/90 shadow-xl shadow-black/5 backdrop-blur">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="text-lg">Overview</CardTitle>
                  <CardDescription>Current month breakdown and useful totals.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 p-6">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <MiniMetric label="Current balance" value={toNpr(stats.balance)} />
                    <MiniMetric label="This BS month income" value={toNpr(stats.monthIncome)} />
                    <MiniMetric label="This BS month expense" value={toNpr(stats.monthExpense)} />
                    <MiniMetric
                      label="Top category"
                      value={topCategory ? topCategory.category : "None yet"}
                      detail={topCategory ? toNpr(topCategory.total) : "Add your first expense"}
                    />
                    <MiniMetric
                      label="Favored payment method"
                      value={preferredPayment ? preferredPayment.paymentMethod : "None yet"}
                      detail={preferredPayment ? toNpr(preferredPayment.total) : "Add an entry to see trends"}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-card/90 shadow-xl shadow-black/5 backdrop-blur">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="text-lg">Ledger</CardTitle>
                  <CardDescription>Search, filter, and manage recent entries.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder="Search description, category, payment, BS date"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                      />
                    </div>
                  </div>

                  <Tabs value={filter} onValueChange={(value) => setFilter(value as "All" | EntryType)}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="All">All</TabsTrigger>
                      <TabsTrigger value="Expense">Expense</TabsTrigger>
                      <TabsTrigger value="Income">Income</TabsTrigger>
                    </TabsList>

                    <TabsContent value={filter} className="mt-4">
                      <div className="space-y-3">
                        {visibleEntries.length > 0 ? (
                          visibleEntries.map((entry) => (
                            <article
                              key={entry.id}
                              className="rounded-2xl border bg-background/70 p-4 shadow-sm transition-shadow hover:shadow-md"
                            >
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="space-y-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge
                                      variant={entry.entryType === "Income" ? "default" : "destructive"}
                                      className="gap-1.5"
                                    >
                                      {entry.entryType === "Income" ? (
                                        <ArrowUpRight className="h-3.5 w-3.5" />
                                      ) : (
                                        <ArrowDownRight className="h-3.5 w-3.5" />
                                      )}
                                      {entry.entryType}
                                    </Badge>
                                    <Badge variant="secondary">{entry.category}</Badge>
                                    <Badge variant="outline">{entry.paymentMethod}</Badge>
                                  </div>

                                  <div className="space-y-1">
                                    <h3 className="text-lg font-semibold">{toNpr(entry.amount)}</h3>
                                    <p className="text-sm text-muted-foreground">
                                      {entry.description || "No description provided"}
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    <span>{formatBsDateLong(entry.bsDate)}</span>
                                    <span>•</span>
                                    <span>{format(bsDateToJsDate(entry.bsDate), "PPP")}</span>
                                  </div>
                                </div>

                                <div className="flex shrink-0 gap-2 self-start sm:self-center">
                                  <Button variant="outline" size="sm" onClick={() => handleEdit(entry)}>
                                    <Edit3 className="mr-2 h-4 w-4" />
                                    Edit
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleDelete(entry.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </article>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed p-8 text-center">
                            <Wallet className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
                            <h3 className="text-lg font-semibold">No entries yet</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Add your first BS-dated income or expense to start tracking.
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  description,
  icon,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  tone: "positive" | "negative" | "neutral";
}) {
  const toneClasses =
    tone === "positive"
      ? "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400"
        : "from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400";

  return (
    <Card className={cn("border-0 bg-gradient-to-br shadow-lg shadow-black/5", toneClasses)}>
      <CardContent className="flex items-start gap-4 p-5">
        <div className="rounded-2xl bg-background/80 p-3 shadow-sm">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  label,
  value,
  delta,
  icon,
}: {
  label: string;
  value: string;
  delta: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-0 bg-card/90 shadow-xl shadow-black/5 backdrop-blur">
      <CardContent className="flex items-start gap-4 p-5">
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{delta}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border bg-background/70 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      {detail ? <p className="mt-1 text-sm text-muted-foreground">{detail}</p> : null}
    </div>
  );
}
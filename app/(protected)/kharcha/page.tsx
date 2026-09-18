"use client";

import { useMemo, useState } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Inbox,
  Plus,
  ReceiptText,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpenseDialog } from "@/components/kharcha/ExpenseDialog";
import { SpendingChart } from "@/components/kharcha/SpendingChart";
import { TransactionLedger } from "@/components/kharcha/TransactionLedger";
import {
  useDeleteManualKharcha,
  useKharchaReviewEvents,
  useKharchaSyncState,
  useKharchaTransactions,
  useUpdateKharchaDetails,
  type KharchaIngestionEvent,
  type KharchaSyncState,
  type KharchaTransaction,
} from "@/hooks/useKharcha";
import {
  FormatBsDate,
  FormatNpr,
  GetBsDate,
  GetKathmanduDateKey,
  KHARCHA_CATEGORIES,
  KHARCHA_SOURCE_LABELS,
  type KharchaCategory,
  type KharchaStatus,
} from "@/lib/kharcha";
import { cn } from "@/lib/utils";

export default function KharchaPage() {
  const transactionsQuery = useKharchaTransactions();
  const reviewQuery = useKharchaReviewEvents();
  const syncQuery = useKharchaSyncState();
  const updateDetails = useUpdateKharchaDetails();
  const deleteExpense = useDeleteManualKharcha();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<KharchaTransaction | null>(null);
  const transactions = useMemo(() => transactionsQuery.data || [], [transactionsQuery.data]);
  const reviewEvents = reviewQuery.data || [];

  const metrics = useMemo(() => {
    const today = GetKathmanduDateKey(new Date());
    const month = today.slice(0, 7);
    const posted = transactions.filter((transaction) => transaction.status === "posted");
    const monthTransactions = posted.filter((transaction) => transaction.occurred_on.startsWith(month));
    const todayTransactions = monthTransactions.filter((transaction) => transaction.occurred_on === today);
    const monthSpend = monthTransactions.reduce((total, transaction) => total + transaction.amount, 0);
    const todaySpend = todayTransactions.reduce((total, transaction) => total + transaction.amount, 0);
    const elapsedDays = Math.max(Number(today.slice(-2)), 1);
    const categories = KHARCHA_CATEGORIES.map((category) => ({
      category,
      total: monthTransactions
        .filter((transaction) => transaction.category === category)
        .reduce((total, transaction) => total + transaction.amount, 0),
    })).filter((item) => item.total > 0).sort((first, second) => second.total - first.total);

    return {
      monthSpend,
      todaySpend,
      dailyAverage: monthSpend / elapsedDays,
      monthCount: monthTransactions.length,
      categories,
    };
  }, [transactions]);

  const HandleAdd = () => {
    setSelectedTransaction(null);
    setDialogOpen(true);
  };

  const HandleEdit = (transaction: KharchaTransaction) => {
    setSelectedTransaction(transaction);
    setDialogOpen(true);
  };

  const HandleStatusChange = (transaction: KharchaTransaction, status: KharchaStatus) => {
    updateDetails.mutate({ id: transaction.id, status });
  };

  const HandleDelete = (transaction: KharchaTransaction) => {
    if (!window.confirm(`Delete the manual expense for ${transaction.merchant}?`)) {
      return;
    }
    deleteExpense.mutate(transaction.id);
  };

  if (transactionsQuery.isLoading) {
    return <KharchaSkeleton />;
  }

  if (transactionsQuery.isError) {
    return (
      <div className="editorial-card grid min-h-80 place-items-center p-8 text-center">
        <div className="max-w-md">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Kharcha could not load</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Check the Supabase migration and connection, then try again.</p>
          <Button className="mt-5 gap-2 rounded-xl" onClick={() => transactionsQuery.refetch()}>
            <RefreshCw className="h-4 w-4" />Try again
          </Button>
        </div>
      </div>
    );
  }

  const todayBs = GetBsDate(new Date());
  const maximumCategory = Math.max(...metrics.categories.map((item) => item.total), 1);
  const busy = updateDetails.isPending || deleteExpense.isPending;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 lg:space-y-8">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="editorial-kicker mb-3">Kharcha / खर्च · BS {FormatBsDate(todayBs)}</p>
          <h1 className="editorial-title text-4xl sm:text-5xl lg:text-6xl">Every debit, in one place.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            NIMB and eSewa alerts arrive automatically. Add cash or missed spending manually.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SyncPill syncState={syncQuery.data || null} loading={syncQuery.isLoading} />
          <Button className="h-11 gap-2 rounded-xl font-bold" onClick={HandleAdd}>
            <Plus className="h-4 w-4" />Add expense
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard label="This month" value={FormatNpr(metrics.monthSpend)} detail={format(new Date(), "MMMM yyyy")} primary />
        <MetricCard label="Today" value={FormatNpr(metrics.todaySpend)} detail="Posted debits" />
        <MetricCard label="Daily average" value={FormatNpr(metrics.dailyAverage)} detail="Month to date" />
        <MetricCard label="Transactions" value={metrics.monthCount.toLocaleString()} detail="This month" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_0.75fr]">
        <article className="editorial-card overflow-hidden">
          <div className="flex items-end justify-between gap-4 border-b border-border p-5 sm:p-6">
            <div>
              <p className="editorial-kicker">Last 30 days</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.04em]">Daily outflow</h2>
            </div>
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="px-2 pb-4 pt-5 sm:px-4">
            <SpendingChart transactions={transactions} />
          </div>
        </article>

        <article className="editorial-card overflow-hidden">
          <div className="border-b border-border p-5 sm:p-6">
            <p className="editorial-kicker">This month</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.04em]">Spend by category</h2>
          </div>
          {metrics.categories.length > 0 ? (
            <div className="space-y-5 p-5 sm:p-6">
              {metrics.categories.slice(0, 6).map((item) => (
                <CategoryBar key={item.category} category={item.category} amount={item.total} maximum={maximumCategory} />
              ))}
            </div>
          ) : (
            <div className="grid min-h-48 place-items-center p-6 text-center sm:min-h-72">
              <div>
                <ReceiptText className="mx-auto h-7 w-7 text-muted-foreground" />
                <p className="mt-3 text-sm font-bold">No posted expenses this month</p>
                <p className="mt-1 text-xs text-muted-foreground">New imports and manual entries will appear here.</p>
              </div>
            </div>
          )}
        </article>
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[1.45fr_0.75fr]">
        <TransactionLedger
          transactions={transactions}
          busy={busy}
          onEdit={HandleEdit}
          onStatusChange={HandleStatusChange}
          onDelete={HandleDelete}
        />

        <div className="space-y-4">
          <CollectorPanel syncState={syncQuery.data || null} loading={syncQuery.isLoading} />
          <ReviewPanel events={reviewEvents} loading={reviewQuery.isLoading} />
        </div>
      </section>

      <ExpenseDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedTransaction(null);
          }
        }}
        transaction={selectedTransaction}
      />
    </motion.div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  primary = false,
}: {
  label: string;
  value: string;
  detail: string;
  primary?: boolean;
}) {
  return (
    <article className={cn(
      "rounded-[1.1rem] border p-4 sm:p-5",
      primary
        ? "border-foreground bg-foreground text-background shadow-[4px_4px_0_hsl(var(--primary))]"
        : "border-border bg-card"
    )}>
      <p className={cn("text-xs font-semibold", primary ? "text-background/55" : "text-muted-foreground")}>{label}</p>
      <p className={cn("metric-number mt-2 truncate text-2xl sm:text-3xl", primary && "text-primary")}>{value}</p>
      <p className={cn("mt-1 text-[11px] font-semibold", primary ? "text-background/45" : "text-muted-foreground")}>{detail}</p>
    </article>
  );
}

function CategoryBar({
  category,
  amount,
  maximum,
}: {
  category: KharchaCategory;
  amount: number;
  maximum: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-semibold">{category}</span>
        <span className="shrink-0 font-bold tabular-nums text-muted-foreground">{FormatNpr(amount)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-foreground" style={{ width: `${Math.max((amount / maximum) * 100, 4)}%` }} />
      </div>
    </div>
  );
}

function SyncPill({ syncState, loading }: { syncState: KharchaSyncState | null; loading: boolean }) {
  const status = GetSyncStatus(syncState);
  return (
    <div className="hidden h-11 items-center gap-2 rounded-xl border bg-card px-3 text-xs font-bold sm:flex">
      <span className={cn("h-2 w-2 rounded-full", loading ? "bg-muted-foreground" : status.tone)} />
      {loading ? "Checking sync" : status.label}
    </div>
  );
}

function CollectorPanel({ syncState, loading }: { syncState: KharchaSyncState | null; loading: boolean }) {
  const status = GetSyncStatus(syncState);
  return (
    <article className="editorial-card overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-border p-5 sm:p-6">
        <div>
          <p className="editorial-kicker">Collector</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight">Email sync</h2>
        </div>
        <span className={cn("h-3 w-3 rounded-full", loading ? "bg-muted-foreground" : status.tone)} />
      </div>
      <div className="space-y-4 p-5 sm:p-6">
        <div>
          <p className="text-sm font-bold">{loading ? "Checking status" : status.label}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{status.detail}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatusCell
            icon={Clock3}
            label="Last checked"
            value={syncState?.last_checked_at ? RelativeTime(syncState.last_checked_at) : "Never"}
          />
          <StatusCell
            icon={Inbox}
            label="Last message"
            value={syncState?.last_message_at ? RelativeTime(syncState.last_message_at) : "None yet"}
          />
        </div>
        <div className="divide-y divide-border rounded-xl border border-border">
          <ProviderRow label="NIMB" state="Active parser" active />
          <ProviderRow label="eSewa" state="Active parser" active />
          <ProviderRow label="NIC ASIA" state="Waiting for sample" />
        </div>
      </div>
    </article>
  );
}

function ReviewPanel({ events, loading }: { events: KharchaIngestionEvent[]; loading: boolean }) {
  return (
    <article className="editorial-card overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-border p-5 sm:p-6">
        <div>
          <p className="editorial-kicker">Parser review</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight">Needs attention</h2>
        </div>
        <span className="grid h-9 min-w-9 place-items-center rounded-xl bg-secondary px-2 text-xs font-black">{events.length}</span>
      </div>
      {loading ? (
        <div className="space-y-3 p-5"><Skeleton className="h-16 rounded-xl" /><Skeleton className="h-16 rounded-xl" /></div>
      ) : events.length > 0 ? (
        <div className="divide-y divide-border">
          {events.slice(0, 5).map((event) => (
            <div key={event.id} className="p-4 sm:px-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{event.subject || "Transaction email"}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{event.reason}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    {event.source ? KHARCHA_SOURCE_LABELS[event.source] : "Unknown source"} · {RelativeTime(event.received_at)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3 rounded-xl bg-secondary/65 p-4">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-bold">No parser issues</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Changed or malformed email templates will be listed here instead of becoming guessed expenses.</p>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function StatusCell({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/65 p-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-xs font-bold">{value}</p>
    </div>
  );
}

function ProviderRow({ label, state, active = false }: { label: string; state: string; active?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <span className="text-xs font-bold">{label}</span>
      <span className={cn("text-[10px] font-semibold", active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>{state}</span>
    </div>
  );
}

function GetSyncStatus(syncState: KharchaSyncState | null) {
  if (!syncState?.last_checked_at) {
    return {
      label: "Collector not connected",
      detail: "Deploy the API, configure Apps Script properties, then run Setup.",
      tone: "bg-muted-foreground",
    };
  }

  if (syncState.consecutive_failures > 0 || syncState.last_error) {
    return {
      label: "Sync needs attention",
      detail: syncState.last_error || "The latest collector run failed.",
      tone: "bg-destructive",
    };
  }

  const minutesSinceCheck = (Date.now() - new Date(syncState.last_checked_at).getTime()) / 60000;
  if (minutesSinceCheck > 20) {
    return {
      label: "Sync overdue",
      detail: "No collector heartbeat has arrived in the last 20 minutes.",
      tone: "bg-amber-500",
    };
  }

  return {
    label: "Sync healthy",
    detail: "The Gmail collector is checking NIMB and eSewa every minute.",
    tone: "bg-emerald-500",
  };
}

function RelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return `${formatDistanceToNowStrict(date)} ago`;
}

function KharchaSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3"><Skeleton className="h-4 w-48" /><Skeleton className="h-14 w-full max-w-2xl" /><Skeleton className="h-5 w-full max-w-xl" /></div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-32 rounded-2xl" />)}</div>
      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.75fr]"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div>
      <Skeleton className="h-[32rem] rounded-2xl" />
    </div>
  );
}

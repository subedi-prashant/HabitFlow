"use client";

import { useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { Edit3, Eye, EyeOff, MoreHorizontal, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type KharchaTransaction } from "@/hooks/useKharcha";
import {
  FormatBsDate,
  FormatNpr,
  GetKathmanduDateKey,
  KHARCHA_CATEGORIES,
  KHARCHA_CHANNEL_LABELS,
  KHARCHA_SOURCE_LABELS,
  type KharchaStatus,
} from "@/lib/kharcha";
import { cn } from "@/lib/utils";

interface TransactionLedgerProps {
  transactions: KharchaTransaction[];
  busy: boolean;
  onEdit: (transaction: KharchaTransaction) => void;
  onStatusChange: (transaction: KharchaTransaction, status: KharchaStatus) => void;
  onDelete: (transaction: KharchaTransaction) => void;
}

type PeriodFilter = "month" | "30days" | "all";
type SourceFilter = "all" | "NIMB" | "ESEWA" | "MANUAL";

export function TransactionLedger({
  transactions,
  busy,
  onEdit,
  onStatusChange,
  onDelete,
}: TransactionLedgerProps) {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("month");
  const [source, setSource] = useState<SourceFilter>("all");
  const [category, setCategory] = useState("all");
  const today = GetKathmanduDateKey(new Date());
  const monthPrefix = today.slice(0, 7);
  const thirtyDayStart = GetKathmanduDateKey(subDays(new Date(), 29));

  const filteredTransactions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transactions.filter((transaction) => {
      const matchesPeriod = period === "all"
        || (period === "month" && transaction.occurred_on.startsWith(monthPrefix))
        || (period === "30days" && transaction.occurred_on >= thirtyDayStart);
      const matchesSource = source === "all" || transaction.source === source;
      const matchesCategory = category === "all" || transaction.category === category;
      const matchesSearch = !term || [
        transaction.merchant,
        transaction.description,
        transaction.external_transaction_id || "",
        KHARCHA_SOURCE_LABELS[transaction.source],
        transaction.category,
      ].join(" ").toLowerCase().includes(term);
      return matchesPeriod && matchesSource && matchesCategory && matchesSearch;
    });
  }, [category, monthPrefix, period, search, source, thirtyDayStart, transactions]);

  const groups = useMemo(() => {
    const entries = new Map<string, KharchaTransaction[]>();
    filteredTransactions.forEach((transaction) => {
      const group = entries.get(transaction.occurred_on) || [];
      group.push(transaction);
      entries.set(transaction.occurred_on, group);
    });
    return Array.from(entries.entries());
  }, [filteredTransactions]);

  return (
    <article className="editorial-card overflow-hidden">
      <div className="border-b border-border p-5 sm:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="editorial-kicker">Ledger</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.04em]">Where the money went</h2>
          </div>
          <p className="text-xs font-semibold text-muted-foreground">{filteredTransactions.length} shown</p>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 rounded-xl bg-background pl-9"
              placeholder="Search merchant or reference"
              aria-label="Search expenses"
            />
          </div>
          <Select value={period} onValueChange={(value) => setPeriod(value as PeriodFilter)}>
            <SelectTrigger className="h-10 rounded-xl bg-background" aria-label="Filter by period"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={(value) => setSource(value as SourceFilter)}>
            <SelectTrigger className="h-10 rounded-xl bg-background" aria-label="Filter by source"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="NIMB">NIMB</SelectItem>
              <SelectItem value="ESEWA">eSewa</SelectItem>
              <SelectItem value="MANUAL">Manual</SelectItem>
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-10 rounded-xl bg-background" aria-label="Filter by category"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {KHARCHA_CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {groups.length > 0 ? (
        <div className="divide-y divide-border">
          {groups.map(([date, items]) => (
            <section key={date}>
              <div className="flex items-center justify-between bg-secondary/45 px-5 py-2.5 sm:px-6">
                <p className="text-xs font-bold uppercase tracking-[0.12em]">
                  {format(parseISO(`${date}T12:00:00`), "EEEE, MMM d")}
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground">
                  BS {FormatBsDate({ year: items[0].bs_year, month: items[0].bs_month, day: items[0].bs_day })}
                </p>
              </div>
              <div className="divide-y divide-border">
                {items.map((transaction) => (
                  <div
                    key={transaction.id}
                    className={cn(
                      "grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-5 py-4 transition-colors hover:bg-secondary/25 sm:items-center sm:px-6",
                      transaction.status !== "posted" && "opacity-55"
                    )}
                  >
                    <SourceMark source={transaction.source} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cn("truncate text-sm font-bold", transaction.status !== "posted" && "line-through")}>
                          {transaction.merchant || "Untitled expense"}
                        </p>
                        {transaction.status !== "posted" && <Badge variant="outline" className="h-5 text-[10px] capitalize">{transaction.status}</Badge>}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {transaction.category} · {KHARCHA_CHANNEL_LABELS[transaction.channel]} · {format(new Date(transaction.occurred_at), "h:mm a")}
                      </p>
                      {transaction.description && transaction.description !== transaction.merchant && (
                        <p className="mt-1 truncate text-xs text-muted-foreground/75">{transaction.description}</p>
                      )}
                    </div>
                    <div className="flex items-start gap-1 sm:items-center sm:gap-2">
                      <div className="hidden min-w-36 text-right sm:block">
                        <p className={cn("metric-number text-lg", transaction.status !== "posted" && "line-through")}>
                          −{FormatNpr(transaction.amount)}
                        </p>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {transaction.ingestion_method === "email" ? "Email import" : "Manual"}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" disabled={busy} aria-label={`Actions for ${transaction.merchant}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2" onSelect={() => onEdit(transaction)}>
                            <Edit3 className="h-4 w-4" />Edit details
                          </DropdownMenuItem>
                          {transaction.status === "posted" && (
                            <DropdownMenuItem className="gap-2" onSelect={() => onStatusChange(transaction, "excluded")}>
                              <EyeOff className="h-4 w-4" />Exclude from totals
                            </DropdownMenuItem>
                          )}
                          {transaction.status === "excluded" && (
                            <DropdownMenuItem className="gap-2" onSelect={() => onStatusChange(transaction, "posted")}>
                              <Eye className="h-4 w-4" />Include in totals
                            </DropdownMenuItem>
                          )}
                          {transaction.ingestion_method === "manual" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onSelect={() => onDelete(transaction)}>
                                <Trash2 className="h-4 w-4" />Delete expense
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="col-span-2 col-start-2 -mt-1 flex items-center justify-between sm:hidden">
                      <p className={cn("metric-number text-base", transaction.status !== "posted" && "line-through")}>
                        −{FormatNpr(transaction.amount)}
                      </p>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {transaction.ingestion_method === "email" ? "Email import" : "Manual"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid min-h-48 place-items-center p-8 text-center sm:min-h-64">
          <div className="max-w-sm">
            <Search className="mx-auto h-7 w-7 text-muted-foreground" />
            <h3 className="mt-4 text-base font-bold">No expenses match these filters</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Change the period or filters to widen the ledger.</p>
          </div>
        </div>
      )}
    </article>
  );
}

function SourceMark({ source }: { source: KharchaTransaction["source"] }) {
  return (
    <div className={cn(
      "flex h-10 min-w-12 items-center justify-center rounded-xl px-2 text-[10px] font-black tracking-tight",
      source === "NIMB" && "bg-sky-950 text-sky-100 dark:bg-sky-200 dark:text-sky-950",
      source === "ESEWA" && "bg-emerald-600 text-white dark:bg-emerald-300 dark:text-emerald-950",
      source === "NIC_ASIA" && "bg-red-700 text-white dark:bg-red-300 dark:text-red-950",
      source === "MANUAL" && "bg-secondary text-secondary-foreground"
    )}>
      {KHARCHA_SOURCE_LABELS[source]}
    </div>
  );
}

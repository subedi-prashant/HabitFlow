"use client";

import { eachDayOfInterval, format, subDays } from "date-fns";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type KharchaTransaction } from "@/hooks/useKharcha";
import { FormatNpr, GetKathmanduDateKey } from "@/lib/kharcha";

interface SpendingChartProps {
  transactions: KharchaTransaction[];
}

export function SpendingChart({ transactions }: SpendingChartProps) {
  const start = subDays(new Date(), 29);
  const days = eachDayOfInterval({ start, end: new Date() });
  const postedTransactions = transactions.filter((transaction) => transaction.status === "posted");
  const data = days.map((day) => {
    const date = GetKathmanduDateKey(day);
    return {
      date,
      label: format(day, "MMM d"),
      amount: postedTransactions
        .filter((transaction) => transaction.occurred_on === date)
        .reduce((total, transaction) => total + transaction.amount, 0),
    };
  });
  const total = data.reduce((sum, day) => sum + day.amount, 0);

  if (total === 0) {
    return (
      <div className="grid h-48 place-items-center px-6 text-center sm:h-72">
        <div>
          <p className="text-sm font-bold">No outflow in the last 30 days</p>
          <p className="mt-1 text-xs text-muted-foreground">The daily chart starts with your first posted expense.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            interval={4}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(value) => value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--secondary))" }}
            contentStyle={{
              border: "1px solid hsl(var(--border))",
              borderRadius: "12px",
              background: "hsl(var(--card))",
              color: "hsl(var(--foreground))",
              fontSize: "12px",
            }}
            formatter={(value) => [FormatNpr(Number(value)), "Spent"]}
            labelFormatter={(label) => `Date · ${label}`}
          />
          <Bar dataKey="amount" fill="hsl(var(--foreground))" radius={[5, 5, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

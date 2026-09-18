"use client";

import { useEffect, useState } from "react";
import { Loader2, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateManualKharcha,
  useUpdateKharchaDetails,
  useUpdateManualKharcha,
  type KharchaTransaction,
} from "@/hooks/useKharcha";
import {
  KHARCHA_CATEGORIES,
  KHARCHA_CHANNELS,
  KHARCHA_CHANNEL_LABELS,
  type KharchaCategory,
  type KharchaChannel,
  type ManualKharchaInput,
} from "@/lib/kharcha";
import { toast } from "sonner";

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: KharchaTransaction | null;
}

export function ExpenseDialog({ open, onOpenChange, transaction = null }: ExpenseDialogProps) {
  const createExpense = useCreateManualKharcha();
  const updateManualExpense = useUpdateManualKharcha();
  const updateDetails = useUpdateKharchaDetails();
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => ToLocalDateTime(new Date()));
  const [category, setCategory] = useState<KharchaCategory>("Other");
  const [channel, setChannel] = useState<KharchaChannel>("cash");
  const isImported = transaction?.ingestion_method === "email";
  const isPending = createExpense.isPending || updateManualExpense.isPending || updateDetails.isPending;

  useEffect(() => {
    if (!open) {
      return;
    }

    if (transaction) {
      setAmount(String(transaction.amount));
      setMerchant(transaction.merchant);
      setDescription(transaction.description);
      setOccurredAt(ToLocalDateTime(new Date(transaction.occurred_at)));
      setCategory(transaction.category);
      setChannel(transaction.channel);
      return;
    }

    ResetForm();
  }, [open, transaction]);

  const ResetForm = () => {
    setAmount("");
    setMerchant("");
    setDescription("");
    setOccurredAt(ToLocalDateTime(new Date()));
    setCategory("Other");
    setChannel("cash");
  };

  const HandleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      ResetForm();
    }
    onOpenChange(nextOpen);
  };

  const HandleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    const parsedDate = new Date(occurredAt);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 9999999999.99) {
      toast.error("Enter a valid expense amount");
      return;
    }
    if (!merchant.trim()) {
      toast.error("Enter a merchant or payee");
      return;
    }
    if (merchant.trim().length > 120 || description.trim().length > 500) {
      toast.error("Merchant or description is too long");
      return;
    }
    if (Number.isNaN(parsedDate.getTime())) {
      toast.error("Enter a valid transaction date");
      return;
    }

    if (transaction && isImported) {
      updateDetails.mutate({
        id: transaction.id,
        merchant: merchant.trim(),
        description: description.trim(),
        category,
      }, {
        onSuccess: () => HandleOpenChange(false),
      });
      return;
    }

    const input: ManualKharchaInput = {
      amount: parsedAmount,
      merchant: merchant.trim(),
      description: description.trim(),
      occurredAt: parsedDate.toISOString(),
      category,
      channel,
    };

    if (transaction) {
      updateManualExpense.mutate({ id: transaction.id, input }, {
        onSuccess: () => HandleOpenChange(false),
      });
      return;
    }

    createExpense.mutate(input, {
      onSuccess: () => HandleOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={HandleOpenChange}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100%-1rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-2xl border-border bg-card p-0 sm:w-full">
        <DialogHeader className="border-b border-border px-5 py-5 text-left sm:px-7">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ReceiptText className="h-5 w-5" />
          </div>
          <DialogTitle className="text-2xl font-extrabold tracking-[-0.04em]">
            {transaction ? "Edit expense" : "Add an expense"}
          </DialogTitle>
          <DialogDescription>
            {isImported
              ? "Correct the merchant, note, or category without changing the imported bank record."
              : "Record cash spending or anything an email alert missed."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={HandleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expenseAmount">Amount</Label>
                <div className="relative">
                  <Input
                    id="expenseAmount"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    max="9999999999.99"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="h-11 rounded-xl pl-14 tabular-nums"
                    disabled={isImported}
                    autoFocus={!isImported}
                    required
                  />
                  <span className="pointer-events-none absolute left-3 top-3 text-xs font-bold text-muted-foreground">NPR</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseDate">Date and time</Label>
                <Input
                  id="expenseDate"
                  type="datetime-local"
                  value={occurredAt}
                  onChange={(event) => setOccurredAt(event.target.value)}
                  className="h-11 rounded-xl"
                  disabled={isImported}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseMerchant">Merchant or payee</Label>
              <Input
                id="expenseMerchant"
                value={merchant}
                onChange={(event) => setMerchant(event.target.value)}
                className="h-11 rounded-xl"
                maxLength={120}
                placeholder="Where the money went"
                autoFocus={isImported}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(value) => setCategory(value as KharchaCategory)}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KHARCHA_CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={channel} onValueChange={(value) => setChannel(value as KharchaChannel)} disabled={isImported}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KHARCHA_CHANNELS.map((item) => <SelectItem key={item} value={item}>{KHARCHA_CHANNEL_LABELS[item]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseDescription">Note</Label>
              <Textarea
                id="expenseDescription"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-24 rounded-xl"
                maxLength={500}
                placeholder="Reference, context, or anything worth remembering"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-card px-5 py-4 sm:px-7">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => HandleOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="gap-2 rounded-xl font-bold" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {transaction ? "Save changes" : "Add expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ToLocalDateTime(date: Date): string {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

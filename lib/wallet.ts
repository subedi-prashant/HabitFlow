import NepaliDate from "nepali-date-converter";

export const BS_MONTHS = [
  "Baisakh",
  "Jestha",
  "Ashadh",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
] as const;

export const ENTRY_TYPES = ["Expense", "Income"] as const;

export const CATEGORIES = [
  "Food",
  "Transport",
  "Utilities",
  "Shopping",
  "Health",
  "Education",
  "Entertainment",
  "Rent",
  "Savings",
  "Other",
] as const;

export const PAYMENT_METHODS = ["Cash", "eSewa", "Khalti", "Bank Transfer", "Card"] as const;

export type EntryType = (typeof ENTRY_TYPES)[number];
export type WalletCategory = (typeof CATEGORIES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type BSEntryDate = {
  year: number;
  month: number;
  day: number;
};

export function getCurrentBsDate(): BSEntryDate {
  const today = new NepaliDate(new Date());

  return {
    year: today.getYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  };
}

export function bsDateToJsDate(date: BSEntryDate): Date {
  return new NepaliDate(date.year, date.month - 1, date.day).toJsDate();
}

export function isValidBsDate(date: BSEntryDate): boolean {
  if (!Number.isInteger(date.year) || !Number.isInteger(date.month) || !Number.isInteger(date.day)) {
    return false;
  }

  if (date.month < 1 || date.month > 12 || date.day < 1) {
    return false;
  }

  try {
    const converted = new NepaliDate(date.year, date.month - 1, date.day);
    return (
      converted.getYear() === date.year &&
      converted.getMonth() === date.month - 1 &&
      converted.getDate() === date.day
    );
  } catch {
    return false;
  }
}

export function formatBsDate(date: BSEntryDate): string {
  return `${date.year}/${String(date.month).padStart(2, "0")}/${String(date.day).padStart(2, "0")}`;
}

export function formatBsDateLong(date: BSEntryDate): string {
  return `${BS_MONTHS[date.month - 1]} ${date.day}, ${date.year}`;
}

export function toNpr(amount: number): string {
  return `NPR ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}`;
}
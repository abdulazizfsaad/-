import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(value: number | string, currency = "ر.س") {
  return `${Number(value).toLocaleString("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`;
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(new Date(value));
}

export function overdueDays(dueDate: Date | string) {
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - due) / 86400000));
}

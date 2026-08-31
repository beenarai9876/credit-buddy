export type CreditCard = {
  id: string;
  user_id: string;
  name: string;
  credit_limit: number;
  bill_generation_day: number;
  used_limit: number;
  current_bill_amount: number;
  last_payment_day: number | null;
  notes: string | null;
  created_at: string;
};

export type BillRecord = {
  id: string;
  user_id: string;
  card_id: string;
  period_label: string;
  bill_amount: number;
  amount_paid: number;
  payment_date: string | null;
  status: "unpaid" | "partial" | "paid";
  created_at: string;
};

export type WalletAccount = {
  id: string;
  user_id: string;
  name: string;
  kind: "bank" | "cash";
  balance: number;
  created_at: string;
};

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

export const availableLimit = (c: CreditCard) =>
  Math.max(c.credit_limit - c.used_limit, 0);

export const thirtyPct = (c: CreditCard) => c.credit_limit * 0.3;

export const utilization = (c: CreditCard) =>
  c.credit_limit > 0 ? Math.min(c.used_limit / c.credit_limit, 1) : 0;

export const formatDate = (d: string | null) => {
  if (!d) return "—";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const toOrdinal = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return "—";
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) {
    return n + "st";
  }
  if (j === 2 && k !== 12) {
    return n + "nd";
  }
  if (j === 3 && k !== 13) {
    return n + "rd";
  }
  return n + "th";
};


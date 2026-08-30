ALTER TABLE public.credit_cards
  ADD COLUMN used_limit NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN current_bill_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN last_payment_date DATE;
ALTER TABLE public.credit_cards DROP COLUMN IF EXISTS last_payment_date;
ALTER TABLE public.credit_cards ADD COLUMN last_payment_day INT CHECK (last_payment_day BETWEEN 1 AND 31);

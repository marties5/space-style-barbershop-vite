-- Add payment_method column to expenses table
ALTER TABLE public.expenses 
ADD COLUMN payment_method text NOT NULL DEFAULT 'cash';

-- Add payment_method column to barber_withdrawals table
ALTER TABLE public.barber_withdrawals 
ADD COLUMN payment_method text NOT NULL DEFAULT 'cash';

-- Create initial_deposit table for tracking cash register start balance
CREATE TABLE public.initial_deposits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount numeric NOT NULL DEFAULT 0,
  deposit_date date NOT NULL DEFAULT CURRENT_DATE,
  user_id uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create unique constraint on deposit_date to allow only one deposit per day
CREATE UNIQUE INDEX idx_initial_deposits_date ON public.initial_deposits (deposit_date);

-- Enable RLS
ALTER TABLE public.initial_deposits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for initial_deposits
CREATE POLICY "Deny anonymous access on initial_deposits"
ON public.initial_deposits
AS RESTRICTIVE
FOR ALL
USING (false);

CREATE POLICY "Staff can view initial deposits"
ON public.initial_deposits
FOR SELECT
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can create initial deposits"
ON public.initial_deposits
FOR INSERT
WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Owners can manage initial deposits"
ON public.initial_deposits
FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role));
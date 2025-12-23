-- Add payment_method column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN payment_method text NOT NULL DEFAULT 'cash';

-- Add check constraint for valid payment methods
ALTER TABLE public.transactions 
ADD CONSTRAINT valid_payment_method CHECK (payment_method IN ('cash', 'qris', 'transfer'));
-- Add discount columns to transactions table
ALTER TABLE public.transactions
ADD COLUMN discount_amount numeric NOT NULL DEFAULT 0,
ADD COLUMN discount_percent numeric DEFAULT 0,
ADD COLUMN discount_type text DEFAULT 'none';

-- Add discount columns to transaction_items table  
ALTER TABLE public.transaction_items
ADD COLUMN discount_amount numeric NOT NULL DEFAULT 0,
ADD COLUMN discount_percent numeric DEFAULT 0;

-- Add comment
COMMENT ON COLUMN public.transactions.discount_amount IS 'Total discount amount applied';
COMMENT ON COLUMN public.transactions.discount_percent IS 'Discount percentage if applicable';
COMMENT ON COLUMN public.transactions.discount_type IS 'Type: none, percent, or fixed';
COMMENT ON COLUMN public.transaction_items.discount_amount IS 'Discount amount per item';
COMMENT ON COLUMN public.transaction_items.discount_percent IS 'Discount percentage per item';
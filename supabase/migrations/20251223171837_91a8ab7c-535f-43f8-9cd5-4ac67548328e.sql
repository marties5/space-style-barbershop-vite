-- Add deposit_type column to initial_deposits table
ALTER TABLE public.initial_deposits 
ADD COLUMN deposit_type text NOT NULL DEFAULT 'cash';

-- Add comment for clarity
COMMENT ON COLUMN public.initial_deposits.deposit_type IS 'Type of deposit: cash or bank';
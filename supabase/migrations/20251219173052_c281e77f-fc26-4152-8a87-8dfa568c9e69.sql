-- Fix PUBLIC_DATA_EXPOSURE: Restrict profile access to owners only
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;

CREATE POLICY "Owners can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'owner'));

-- Fix MISSING_RLS: Add INSERT policy for profiles (defense-in-depth)
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add stock validation to prevent negative stock
CREATE OR REPLACE FUNCTION public.update_stock_on_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  IF NEW.item_type = 'product' AND NEW.item_id IS NOT NULL THEN
    -- Get current stock
    SELECT stock INTO current_stock FROM public.items WHERE id = NEW.item_id;
    
    -- Check if sufficient stock
    IF current_stock IS NOT NULL AND current_stock < NEW.quantity THEN
      RAISE EXCEPTION 'Stok tidak mencukupi. Stok tersedia: %', current_stock;
    END IF;
    
    -- Update stock
    UPDATE public.items
    SET stock = stock - NEW.quantity,
        updated_at = now()
    WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$;
-- Drop existing policies for initial_deposits
DROP POLICY IF EXISTS "Deny anonymous access on initial_deposits" ON public.initial_deposits;
DROP POLICY IF EXISTS "Staff can view initial deposits" ON public.initial_deposits;
DROP POLICY IF EXISTS "Staff can create initial deposits" ON public.initial_deposits;
DROP POLICY IF EXISTS "Owners can manage initial deposits" ON public.initial_deposits;

-- Create proper RLS policies for initial_deposits (PERMISSIVE)
CREATE POLICY "Staff can view initial deposits"
ON public.initial_deposits
FOR SELECT
TO authenticated
USING (is_staff(auth.uid()));

CREATE POLICY "Staff can create initial deposits"
ON public.initial_deposits
FOR INSERT
TO authenticated
WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can update initial deposits"
ON public.initial_deposits
FOR UPDATE
TO authenticated
USING (is_staff(auth.uid()));

CREATE POLICY "Owners can delete initial deposits"
ON public.initial_deposits
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));
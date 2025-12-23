-- Create expenses table for operational expenses
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'operasional',
  notes TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create barber_withdrawals table for salary/commission withdrawals
CREATE TABLE public.barber_withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expenses
CREATE POLICY "Staff can view expenses" ON public.expenses
  FOR SELECT USING (is_staff(auth.uid()));

CREATE POLICY "Staff can create expenses" ON public.expenses
  FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Owners can manage expenses" ON public.expenses
  FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

-- RLS Policies for barber_withdrawals
CREATE POLICY "Staff can view withdrawals" ON public.barber_withdrawals
  FOR SELECT USING (is_staff(auth.uid()));

CREATE POLICY "Staff can create withdrawals" ON public.barber_withdrawals
  FOR INSERT WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Owners can manage withdrawals" ON public.barber_withdrawals
  FOR ALL USING (has_role(auth.uid(), 'owner'::app_role));

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.barber_withdrawals;
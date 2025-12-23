-- Create shop_status table to track if shop is open or closed
CREATE TABLE public.shop_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_open boolean NOT NULL DEFAULT false,
  opened_at timestamp with time zone,
  closed_at timestamp with time zone,
  opened_by uuid REFERENCES auth.users(id),
  closed_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shop_status ENABLE ROW LEVEL SECURITY;

-- Staff can view shop status
CREATE POLICY "Staff can view shop status"
ON public.shop_status
FOR SELECT
USING (is_staff(auth.uid()));

-- Staff can update shop status
CREATE POLICY "Staff can update shop status"
ON public.shop_status
FOR UPDATE
USING (is_staff(auth.uid()));

-- Insert initial record
INSERT INTO public.shop_status (is_open) VALUES (false);

-- Create shop_open_logs table to track open/close history for owner notifications
CREATE TABLE public.shop_open_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('open', 'close')),
  user_id uuid REFERENCES auth.users(id),
  user_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shop_open_logs ENABLE ROW LEVEL SECURITY;

-- Staff can create logs
CREATE POLICY "Staff can create shop logs"
ON public.shop_open_logs
FOR INSERT
WITH CHECK (is_staff(auth.uid()));

-- Staff can view logs
CREATE POLICY "Staff can view shop logs"
ON public.shop_open_logs
FOR SELECT
USING (is_staff(auth.uid()));
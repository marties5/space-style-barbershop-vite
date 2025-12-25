-- Create email settings table
CREATE TABLE public.email_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  smtp_host TEXT NOT NULL DEFAULT '',
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_user TEXT NOT NULL DEFAULT '',
  smtp_password TEXT NOT NULL DEFAULT '',
  smtp_from_email TEXT NOT NULL DEFAULT '',
  smtp_from_name TEXT NOT NULL DEFAULT 'Barbershop POS',
  recipient_emails TEXT[] NOT NULL DEFAULT '{}',
  notify_shop_open BOOLEAN NOT NULL DEFAULT true,
  notify_shop_close BOOLEAN NOT NULL DEFAULT true,
  notify_transaction BOOLEAN NOT NULL DEFAULT true,
  notify_withdrawal BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

-- Only owners can manage email settings
CREATE POLICY "Owners can manage email settings"
ON public.email_settings
FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role));

-- Staff can view email settings
CREATE POLICY "Staff can view email settings"
ON public.email_settings
FOR SELECT
USING (is_staff(auth.uid()));

-- Deny anonymous access
CREATE POLICY "Deny anonymous access on email_settings"
ON public.email_settings
FOR ALL
USING (false);

-- Add trigger for updated_at
CREATE TRIGGER update_email_settings_updated_at
BEFORE UPDATE ON public.email_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default row
INSERT INTO public.email_settings (id) VALUES (gen_random_uuid());
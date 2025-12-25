-- Create email_logs table to track sent emails
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Staff can view logs
CREATE POLICY "Staff can view email logs"
ON public.email_logs
FOR SELECT
USING (is_staff(auth.uid()));

-- Allow insert from edge function (service role)
CREATE POLICY "Service role can insert email logs"
ON public.email_logs
FOR INSERT
WITH CHECK (true);

-- Owners can delete logs
CREATE POLICY "Owners can delete email logs"
ON public.email_logs
FOR DELETE
USING (has_role(auth.uid(), 'owner'::app_role));

-- Deny anonymous
CREATE POLICY "Deny anonymous access on email_logs"
ON public.email_logs
FOR ALL
USING (false);
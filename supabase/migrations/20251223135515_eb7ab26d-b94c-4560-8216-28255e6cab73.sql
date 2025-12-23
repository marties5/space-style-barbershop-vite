-- Create push_subscriptions table to store user subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Staff can manage their own subscriptions
CREATE POLICY "Users can manage their own subscriptions"
ON public.push_subscriptions
FOR ALL
USING (auth.uid() = user_id);

-- Create notification_logs table to track daily limit
CREATE TABLE public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL,
  notification_data jsonb,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  recipients_count integer DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Staff can view logs
CREATE POLICY "Staff can view notification logs"
ON public.notification_logs
FOR SELECT
USING (is_staff(auth.uid()));

-- Service role can insert logs (for edge function)
CREATE POLICY "Service role can insert logs"
ON public.notification_logs
FOR INSERT
WITH CHECK (true);
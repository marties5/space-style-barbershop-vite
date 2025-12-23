-- Drop trigger first
DROP TRIGGER IF EXISTS trigger_notify_new_transaction ON public.transactions;

-- Drop notification function
DROP FUNCTION IF EXISTS public.notify_new_transaction() CASCADE;

-- Drop notification_logs table
DROP TABLE IF EXISTS public.notification_logs;

-- Drop push_subscriptions table  
DROP TABLE IF EXISTS public.push_subscriptions;
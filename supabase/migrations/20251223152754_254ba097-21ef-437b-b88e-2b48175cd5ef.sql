-- Enable the http extension for making HTTP requests from Postgres
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Enable pg_net for async HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to send push notification on new transaction
CREATE OR REPLACE FUNCTION public.notify_new_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_payload jsonb;
  supabase_url text;
  internal_key text;
BEGIN
  -- Get environment variables from vault or hardcode for now
  supabase_url := current_setting('app.supabase_url', true);
  internal_key := current_setting('app.internal_trigger_key', true);
  
  -- Build notification payload
  notification_payload := jsonb_build_object(
    'type', 'transaction',
    'title', '💰 Transaksi Baru',
    'body', 'Transaksi sebesar Rp ' || to_char(NEW.total_amount, 'FM999,999,999') || ' telah dibuat',
    'data', jsonb_build_object(
      'transaction_id', NEW.id,
      'amount', NEW.total_amount,
      'payment_method', NEW.payment_method
    ),
    'internal_key', internal_key
  );

  -- Make async HTTP request to edge function using pg_net
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    )::jsonb,
    body := notification_payload
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on transactions table
DROP TRIGGER IF EXISTS trigger_notify_new_transaction ON public.transactions;

CREATE TRIGGER trigger_notify_new_transaction
AFTER INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_transaction();

-- Add comment for documentation
COMMENT ON FUNCTION public.notify_new_transaction() IS 'Sends push notification when a new transaction is created';
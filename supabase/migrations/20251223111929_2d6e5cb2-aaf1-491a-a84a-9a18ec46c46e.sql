-- Enable realtime for transactions table to support notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
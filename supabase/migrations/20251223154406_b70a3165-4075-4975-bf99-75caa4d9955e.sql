-- Add explicit DENY policies for anonymous users on ALL tables
-- This prevents unauthenticated access to sensitive business data

-- 1. barber_withdrawals
CREATE POLICY "Deny anonymous access on barber_withdrawals"
ON public.barber_withdrawals
FOR ALL
TO anon
USING (false);

-- 2. barbers
CREATE POLICY "Deny anonymous access on barbers"
ON public.barbers
FOR ALL
TO anon
USING (false);

-- 3. expenses
CREATE POLICY "Deny anonymous access on expenses"
ON public.expenses
FOR ALL
TO anon
USING (false);

-- 4. items
CREATE POLICY "Deny anonymous access on items"
ON public.items
FOR ALL
TO anon
USING (false);

-- 5. notification_logs
CREATE POLICY "Deny anonymous access on notification_logs"
ON public.notification_logs
FOR ALL
TO anon
USING (false);

-- 6. profiles
CREATE POLICY "Deny anonymous access on profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- 7. push_subscriptions
CREATE POLICY "Deny anonymous access on push_subscriptions"
ON public.push_subscriptions
FOR ALL
TO anon
USING (false);

-- 8. shop_open_logs
CREATE POLICY "Deny anonymous access on shop_open_logs"
ON public.shop_open_logs
FOR ALL
TO anon
USING (false);

-- 9. shop_status
CREATE POLICY "Deny anonymous access on shop_status"
ON public.shop_status
FOR ALL
TO anon
USING (false);

-- 10. transaction_items
CREATE POLICY "Deny anonymous access on transaction_items"
ON public.transaction_items
FOR ALL
TO anon
USING (false);

-- 11. transactions
CREATE POLICY "Deny anonymous access on transactions"
ON public.transactions
FOR ALL
TO anon
USING (false);

-- 12. user_roles
CREATE POLICY "Deny anonymous access on user_roles"
ON public.user_roles
FOR ALL
TO anon
USING (false);
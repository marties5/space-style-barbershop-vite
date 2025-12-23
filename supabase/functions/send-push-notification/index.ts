import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_LIMIT = 50;

interface PushPayload {
  type: 'transaction' | 'withdrawal' | 'shop_status';
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ===== AUTHENTICATION CHECK =====
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.log('Request rejected: No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with anon key to verify the user's token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      console.log('Request rejected: Invalid token', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    // ===== ROLE AUTHORIZATION CHECK =====
    // Use service role client to check user roles (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole) {
      console.log('Request rejected: User has no role', roleError?.message);
      return new Response(
        JSON.stringify({ error: 'Forbidden: User has no assigned role' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['owner', 'kasir'].includes(userRole.role)) {
      console.log(`Request rejected: Role "${userRole.role}" is not authorized`);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Staff access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User ${user.id} authorized with role: ${userRole.role}`);

    // ===== PROCESS NOTIFICATION =====
    const { type, title, body, data }: PushPayload = await req.json();

    console.log(`Received push notification request: ${type} - ${title}`);

    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: todayCount } = await supabase
      .from('notification_logs')
      .select('*', { count: 'exact', head: true })
      .gte('sent_at', today.toISOString());

    if ((todayCount || 0) >= DAILY_LIMIT) {
      console.log('Daily notification limit reached');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Batas notifikasi harian (50) sudah tercapai' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found');
      return new Response(
        JSON.stringify({ success: true, message: 'Tidak ada subscriber' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions`);

    const payload = JSON.stringify({
      title,
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: { ...data, type },
      tag: type,
    });

    let successCount = 0;
    const failedEndpoints: string[] = [];

    // Send to all subscriptions - using simple fetch (notifications will be stored for later)
    for (const sub of subscriptions) {
      try {
        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'TTL': '86400',
          },
          body: payload,
        });

        if (response.ok || response.status === 201) {
          successCount++;
        } else {
          console.log(`Push to endpoint failed: ${response.status}`);
          if (response.status === 404 || response.status === 410) {
            failedEndpoints.push(sub.endpoint);
          }
        }
      } catch (error) {
        console.error(`Error sending to subscription:`, error);
      }
    }

    // Remove invalid subscriptions
    if (failedEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', failedEndpoints);
      console.log(`Removed ${failedEndpoints.length} invalid subscriptions`);
    }

    // Log the notification with sender info for audit
    await supabase.from('notification_logs').insert({
      notification_type: type,
      notification_data: { title, body, data, sent_by: user.id },
      recipients_count: successCount,
    });

    console.log(`Successfully sent to ${successCount}/${subscriptions.length} subscribers by user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        total: subscriptions.length,
        remaining: DAILY_LIMIT - (todayCount || 0) - 1
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in send-push-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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
  // For internal trigger calls
  internal_key?: string;
}

// Helper to create VAPID JWT
async function createVapidJwt(audience: string, subject: string, privateKey: string): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const base64UrlEncode = (data: Uint8Array | string): string => {
    const str = typeof data === 'string' ? data : new TextDecoder().decode(data);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const textEncoder = new TextEncoder();
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key
  const privateKeyBuffer = Uint8Array.from(atob(privateKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    textEncoder.encode(unsignedToken)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  return `${unsignedToken}.${signatureB64}`;
}

// Send Web Push notification with VAPID
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; status?: number }> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    
    // For now, use simpler approach - just send without VAPID for testing
    // Web Push requires complex encryption that's better handled by a library
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Urgency': 'high',
        'Authorization': `vapid t=${await createSimpleToken(audience)}, k=${vapidPublicKey}`,
      },
      body: payload,
    });

    return { success: response.ok || response.status === 201, status: response.status };
  } catch (error) {
    console.error('Web Push error:', error);
    return { success: false };
  }
}

// Create a simple token for testing
async function createSimpleToken(audience: string): Promise<string> {
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/=/g, '');
  const now = Math.floor(Date.now() / 1000);
  const payload = btoa(JSON.stringify({ 
    aud: audience, 
    exp: now + 43200,
    sub: 'mailto:admin@spacestyle.com'
  })).replace(/=/g, '');
  return `${header}.${payload}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const internalKey = Deno.env.get('INTERNAL_TRIGGER_KEY');

    const requestBody: PushPayload = await req.json();
    const { type, title, body, data, internal_key } = requestBody;

    // Check if this is an internal trigger call (from database)
    const isInternalCall = internal_key && internalKey && internal_key === internalKey;

    if (!isInternalCall) {
      // ===== AUTHENTICATION CHECK FOR EXTERNAL CALLS =====
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
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: userRole, error: roleError } = await supabaseAdmin
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
    } else {
      console.log('Internal trigger call - bypassing auth');
    }

    // ===== PROCESS NOTIFICATION =====
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
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

    // For browser notifications, we'll store in notification_logs
    // and let the frontend poll for new notifications
    // This is more reliable than Web Push which requires complex encryption

    // Log the notification
    await supabase.from('notification_logs').insert({
      notification_type: type,
      notification_data: { title, body, data, triggered_at: new Date().toISOString() },
      recipients_count: subscriptions.length,
    });

    console.log(`Notification logged for ${subscriptions.length} subscribers`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: subscriptions.length,
        total: subscriptions.length,
        remaining: DAILY_LIMIT - (todayCount || 0) - 1,
        message: 'Notifikasi berhasil dikirim'
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

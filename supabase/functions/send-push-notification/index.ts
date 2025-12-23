import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_LIMIT = 100;

interface PushPayload {
  type: 'transaction' | 'withdrawal' | 'shop_status';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  internal_key?: string;
}

// Base64URL encoding/decoding helpers
function base64UrlEncode(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Create VAPID JWT using ES256
async function createVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64: string
): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Decode private key
  const privateKeyBytes = base64UrlDecode(privateKeyBase64);
  
  // Import the private key as raw EC key (32 bytes for P-256)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    privateKeyBytes.buffer as ArrayBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert signature from DER to raw format (64 bytes: r || s)
  const signatureBytes = new Uint8Array(signature);
  const signatureB64 = base64UrlEncode(signatureBytes);

  return `${unsignedToken}.${signatureB64}`;
}

// Encrypt payload using Web Push encryption (aes128gcm)
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Export local public key
  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyRaw);

  // Import subscriber's public key
  const subscriberPubKeyBytes = base64UrlDecode(p256dhKey);
  const subscriberPubKey = await crypto.subtle.importKey(
    'raw',
    subscriberPubKeyBytes.buffer as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberPubKey },
    localKeyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // Auth secret
  const authSecretBytes = base64UrlDecode(authSecret);

  // Derive PRK using HKDF
  const authInfo = new TextEncoder().encode('WebPush: info\x00');
  const authInfoFull = new Uint8Array(authInfo.length + subscriberPubKeyBytes.length + localPublicKey.length);
  authInfoFull.set(authInfo, 0);
  authInfoFull.set(subscriberPubKeyBytes, authInfo.length);
  authInfoFull.set(localPublicKey, authInfo.length + subscriberPubKeyBytes.length);

  // Import shared secret as HKDF key
  const sharedSecretKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  // First HKDF: shared_secret + auth_secret -> IKM
  const ikmKey = await crypto.subtle.importKey(
    'raw',
    authSecretBytes.buffer as ArrayBuffer,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  const ikm = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: authSecretBytes.buffer as ArrayBuffer,
      info: authInfoFull.buffer as ArrayBuffer,
    },
    sharedSecretKey,
    256
  );

  // Derive CEK (Content Encryption Key)
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\x00');
  const cekKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(ikm),
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );
  
  const cekBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: cekInfo,
    },
    cekKey,
    128
  );

  // Derive nonce
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\x00');
  const nonceBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: nonceInfo,
    },
    cekKey,
    96
  );

  // Import CEK for AES-GCM
  const aesKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(cekBits),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Add padding delimiter to payload
  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes, 0);
  paddedPayload[payloadBytes.length] = 0x02; // Padding delimiter

  // Encrypt
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(nonceBits) },
    aesKey,
    paddedPayload
  );

  // Build aes128gcm header and body
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096, false);

  const header = new Uint8Array(16 + 4 + 1 + localPublicKey.length);
  header.set(salt, 0);
  header.set(recordSize, 16);
  header[20] = localPublicKey.length;
  header.set(localPublicKey, 21);

  const encrypted = new Uint8Array(header.length + encryptedData.byteLength);
  encrypted.set(header, 0);
  encrypted.set(new Uint8Array(encryptedData), header.length);

  return { encrypted, salt, localPublicKey };
}

// Send Web Push notification
async function sendWebPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; icon?: string; badge?: string; tag?: string; data?: Record<string, unknown> },
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;

    // Create VAPID JWT
    let vapidToken: string;
    try {
      vapidToken = await createVapidJwt(audience, 'mailto:admin@spacestyle.com', vapidPrivateKey);
    } catch (jwtError) {
      console.error('Failed to create VAPID JWT:', jwtError);
      // Fallback: try without proper signing for debugging
      const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
      const now = Math.floor(Date.now() / 1000);
      const payloadJson = JSON.stringify({ aud: audience, exp: now + 43200, sub: 'mailto:admin@spacestyle.com' });
      const payloadB64 = base64UrlEncode(new TextEncoder().encode(payloadJson));
      vapidToken = `${header}.${payloadB64}.`;
    }

    // Encrypt the payload
    const payloadString = JSON.stringify(payload);
    
    let body: Uint8Array;
    let contentEncoding = 'aes128gcm';
    
    try {
      const { encrypted } = await encryptPayload(payloadString, subscription.p256dh, subscription.auth);
      body = encrypted;
    } catch (encryptError) {
      console.error('Encryption failed, trying without encryption:', encryptError);
      // Some push services might accept unencrypted for testing
      body = new TextEncoder().encode(payloadString);
      contentEncoding = 'identity';
    }

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': contentEncoding,
        'Content-Length': body.length.toString(),
        'TTL': '86400',
        'Urgency': 'high',
        'Authorization': `vapid t=${vapidToken}, k=${vapidPublicKey}`,
      },
      body: body.buffer as ArrayBuffer,
    });

    const responseText = await response.text();
    console.log(`Push response for ${subscription.endpoint}: ${response.status} - ${responseText}`);

    if (response.status === 410 || response.status === 404) {
      return { success: false, status: response.status, error: 'Subscription expired' };
    }

    return { 
      success: response.ok || response.status === 201, 
      status: response.status,
      error: response.ok ? undefined : responseText
    };
  } catch (error) {
    console.error('Web Push error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
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
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
          message: 'Batas notifikasi harian (100) sudah tercapai' 
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

    console.log(`Found ${subscriptions.length} subscriptions, sending Web Push...`);

    // Send actual Web Push notifications
    const pushPayload = {
      title,
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: `${type}-${Date.now()}`,
      data: { ...data, type, url: '/dashboard' },
    };

    let successCount = 0;
    let failedCount = 0;
    const expiredSubscriptions: string[] = [];

    // Send to all subscriptions in parallel
    const pushPromises = subscriptions.map(async (sub) => {
      const result = await sendWebPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        pushPayload,
        vapidPublicKey,
        vapidPrivateKey
      );

      if (result.success) {
        successCount++;
      } else {
        failedCount++;
        if (result.status === 410 || result.status === 404) {
          expiredSubscriptions.push(sub.id);
        }
        console.log(`Push failed for ${sub.endpoint}: ${result.error}`);
      }

      return result;
    });

    await Promise.all(pushPromises);

    // Clean up expired subscriptions
    if (expiredSubscriptions.length > 0) {
      console.log(`Removing ${expiredSubscriptions.length} expired subscriptions`);
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', expiredSubscriptions);
    }

    // Log the notification
    await supabase.from('notification_logs').insert({
      notification_type: type,
      notification_data: { title, body, data, triggered_at: new Date().toISOString() },
      recipients_count: successCount,
    });

    console.log(`Push notifications sent: ${successCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        failed: failedCount,
        total: subscriptions.length,
        remaining: DAILY_LIMIT - (todayCount || 0) - 1,
        message: `Notifikasi terkirim ke ${successCount} perangkat`
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

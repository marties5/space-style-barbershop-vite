import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Debug: Log VAPID key availability
console.log('VAPID_PUBLIC_KEY configured:', !!VAPID_PUBLIC_KEY, VAPID_PUBLIC_KEY ? 'Key present' : 'Key missing');

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotification() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);

        // Check if already subscribed
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }
    };

    checkSupport();
  }, []);

  const registerServiceWorker = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!user) {
      toast.error('Silakan login terlebih dahulu');
      return false;
    }

    // Browser umumnya memblokir prompt notifikasi di dalam iframe (mis. preview/editor).
    // Jadi izin tidak akan muncul walaupun tombol sudah diklik.
    const inIframe = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

    if (inIframe) {
      toast.error('Izin notifikasi tidak bisa muncul di mode preview. Buka aplikasi di tab baru untuk mengaktifkan notifikasi.');
      return false;
    }

    if (!window.isSecureContext) {
      toast.error('Push notification butuh HTTPS (atau localhost).');
      return false;
    }

    if (Notification.permission === 'denied') {
      toast.error('Izin notifikasi sudah diblokir di browser. Ubah ke Allow di pengaturan situs/browser lalu coba lagi.');
      return false;
    }

    setIsLoading(true);
    try {
      // Request permission FIRST - always show browser prompt (jika status masih "default")
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        toast.error('Izin notifikasi ditolak');
        return false;
      }

      // Check VAPID key after permission is granted
      if (!VAPID_PUBLIC_KEY) {
        console.error('VAPID_PUBLIC_KEY is not configured. Please add VITE_VAPID_PUBLIC_KEY to environment variables.');
        toast.error('Konfigurasi push notification belum lengkap. Silakan hubungi admin.');
        return false;
      }

      // Register service worker
      const registration = await registerServiceWorker();
      await navigator.serviceWorker.ready;

      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer
      });

      console.log('Push subscription:', subscription);

      // Extract keys
      const subscriptionJson = subscription.toJSON();
      const p256dh = subscriptionJson.keys?.p256dh || '';
      const auth = subscriptionJson.keys?.auth || '';

      // Save to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh,
          auth
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) {
        console.error('Error saving subscription:', error);
        throw error;
      }

      setIsSubscribed(true);
      toast.success('Notifikasi berhasil diaktifkan!');
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Gagal mengaktifkan notifikasi');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, registerServiceWorker]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      setIsSubscribed(false);
      toast.success('Notifikasi dinonaktifkan');
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Gagal menonaktifkan notifikasi');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    subscribe,
    unsubscribe
  };
}

// Helper function to send notification from frontend
export async function sendPushNotification(
  type: 'transaction' | 'withdrawal' | 'shop_status',
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-push-notification', {
      body: { type, title, body, data }
    });

    if (error) {
      console.error('Error sending push notification:', error);
      return false;
    }

    console.log('Push notification result:', result);
    return result?.success || false;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

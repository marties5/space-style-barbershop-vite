import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Notification sound URL (free sound effect)
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export function TransactionNotification() {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.log('Could not play notification sound:', err);
      });
    }
  }, []);
  const lastNotifiedRef = useRef<string | null>(null);

  useEffect(() => {
    // Request notification permission on mount if not already granted
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel('transaction-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          const transaction = payload.new as {
            id: string;
            total_amount: number;
            payment_status: string;
            created_at: string;
          };

          // Prevent duplicate notifications
          if (lastNotifiedRef.current === transaction.id) {
            return;
          }
          lastNotifiedRef.current = transaction.id;

          const formattedAmount = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
          }).format(transaction.total_amount);

          // Play notification sound
          playNotificationSound();

          // Show in-app toast notification
          toast({
            title: '🧾 Transaksi Baru',
            description: `Transaksi sebesar ${formattedAmount} berhasil dicatat`,
          });

          // Send browser push notification (always show, not just when hidden)
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              const now = new Date();
              const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
              
              const notification = new Notification('💰 Transaksi Baru Masuk!', {
                body: `${formattedAmount}\n📅 ${timeStr}\n💳 ${transaction.payment_status === 'completed' ? 'Lunas' : 'Pending'}`,
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                tag: 'transaction-' + transaction.id,
                requireInteraction: true, // Keep notification until user interacts
                silent: false, // Play sound
              });

              notification.onclick = () => {
                window.focus();
                notification.close();
              };

              // Auto close after 10 seconds
              setTimeout(() => notification.close(), 10000);
            } catch (error) {
              console.log('Browser notification error:', error);
            }
          }
        }
      )
      .subscribe();

    // Also listen for notification_logs for centralized notifications (withdrawal, shop_status)
    const notificationChannel = supabase
      .channel('notification-logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_logs'
        },
        (payload) => {
          const log = payload.new as {
            id: string;
            notification_type: string;
            notification_data: { title?: string; body?: string } | null;
          };

          // Show in-app toast for withdrawal and shop_status
          if (log.notification_type !== 'transaction' && log.notification_data) {
            // Play sound for all notification types
            playNotificationSound();
            
            // Show in-app toast notification
            toast({
              title: log.notification_data.title || 'Notifikasi Baru',
              description: log.notification_data.body || 'Ada aktivitas baru',
            });

            // Also send browser push notification
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                const notification = new Notification(log.notification_data.title || 'Notifikasi Baru', {
                  body: log.notification_data.body || 'Ada aktivitas baru',
                  icon: '/pwa-192x192.png',
                  badge: '/pwa-192x192.png',
                  tag: log.notification_type + '-' + log.id,
                  requireInteraction: log.notification_type === 'shop_status',
                });

                notification.onclick = () => {
                  window.focus();
                  notification.close();
                };

                setTimeout(() => notification.close(), 8000);
              } catch (error) {
                console.log('Browser notification error:', error);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(notificationChannel);
    };
  }, [toast, playNotificationSound]);

  return null;
}

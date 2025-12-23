import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function TransactionNotification() {
  const { toast } = useToast();
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

          // Show in-app toast notification
          toast({
            title: '🧾 Transaksi Baru',
            description: `Transaksi sebesar ${formattedAmount} berhasil dicatat`,
          });

          // Send browser push notification if tab is not visible
          if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            try {
              const notification = new Notification('💰 Transaksi Baru', {
                body: `Transaksi sebesar ${formattedAmount} telah dibuat`,
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                tag: 'transaction-' + transaction.id,
                requireInteraction: false,
              });

              notification.onclick = () => {
                window.focus();
                notification.close();
              };

              // Auto close after 5 seconds
              setTimeout(() => notification.close(), 5000);
            } catch (error) {
              console.log('Browser notification error:', error);
            }
          }
        }
      )
      .subscribe();

    // Also listen for notification_logs for centralized notifications
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

          // Send browser notification for non-transaction types (shop_status, withdrawal)
          if (log.notification_type !== 'transaction' && document.hidden) {
            if ('Notification' in window && Notification.permission === 'granted' && log.notification_data) {
              try {
                const notification = new Notification(log.notification_data.title || 'Notifikasi Baru', {
                  body: log.notification_data.body || 'Ada aktivitas baru',
                  icon: '/pwa-192x192.png',
                  badge: '/pwa-192x192.png',
                  tag: log.notification_type + '-' + log.id,
                });

                notification.onclick = () => {
                  window.focus();
                  notification.close();
                };

                setTimeout(() => notification.close(), 5000);
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
  }, [toast]);

  return null;
}

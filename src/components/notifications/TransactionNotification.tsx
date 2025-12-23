import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function TransactionNotification() {
  const { toast } = useToast();

  useEffect(() => {
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

          const formattedAmount = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
          }).format(transaction.total_amount);

          toast({
            title: '🧾 Transaksi Baru',
            description: `Transaksi sebesar ${formattedAmount} berhasil dicatat`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  return null;
}

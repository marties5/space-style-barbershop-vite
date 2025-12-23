import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { sendPushNotification } from './usePushNotification';

interface ShopStatusContextType {
  isOpen: boolean;
  isLoading: boolean;
  openShop: () => Promise<void>;
  closeShop: () => Promise<void>;
}

const ShopStatusContext = createContext<ShopStatusContextType | undefined>(undefined);

export function ShopStatusProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchShopStatus = async () => {
    const { data, error } = await supabase
      .from('shop_status')
      .select('is_open')
      .limit(1)
      .maybeSingle();
    
    if (data && !error) {
      setIsOpen(data.is_open);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchShopStatus();
    }
  }, [user]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('shop-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shop_status'
        },
        (payload) => {
          if (payload.new && 'is_open' in payload.new) {
            setIsOpen(payload.new.is_open as boolean);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getUserName = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', userId)
      .maybeSingle();
    
    return data?.full_name || data?.email || 'Unknown';
  };

  const openShop = async () => {
    if (!user) return;

    try {
      const userName = await getUserName(user.id);

      const { error: updateError } = await supabase
        .from('shop_status')
        .update({
          is_open: true,
          opened_at: new Date().toISOString(),
          opened_by: user.id,
          updated_at: new Date().toISOString()
        })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

      if (updateError) throw updateError;

      // Log the action
      const { error: logError } = await supabase
        .from('shop_open_logs')
        .insert({
          action: 'open',
          user_id: user.id,
          user_name: userName
        });

      if (logError) console.error('Error logging shop open:', logError);

      // Send push notification
      sendPushNotification(
        'shop_status',
        '🟢 Toko Dibuka',
        `${userName} membuka toko pada ${new Date().toLocaleTimeString('id-ID')}`,
        { action: 'open', userName }
      );

      setIsOpen(true);
      toast.success('Toko berhasil dibuka!');
    } catch (error) {
      console.error('Error opening shop:', error);
      toast.error('Gagal membuka toko');
    }
  };

  const closeShop = async () => {
    if (!user) return;

    try {
      const userName = await getUserName(user.id);

      const { error: updateError } = await supabase
        .from('shop_status')
        .update({
          is_open: false,
          closed_at: new Date().toISOString(),
          closed_by: user.id,
          updated_at: new Date().toISOString()
        })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

      if (updateError) throw updateError;

      // Log the action
      const { error: logError } = await supabase
        .from('shop_open_logs')
        .insert({
          action: 'close',
          user_id: user.id,
          user_name: userName
        });

      if (logError) console.error('Error logging shop close:', logError);

      // Send push notification
      sendPushNotification(
        'shop_status',
        '🔴 Toko Ditutup',
        `${userName} menutup toko pada ${new Date().toLocaleTimeString('id-ID')}`,
        { action: 'close', userName }
      );

      setIsOpen(false);
      toast.success('Toko berhasil ditutup!');
    } catch (error) {
      console.error('Error closing shop:', error);
      toast.error('Gagal menutup toko');
    }
  };

  return (
    <ShopStatusContext.Provider value={{ isOpen, isLoading, openShop, closeShop }}>
      {children}
    </ShopStatusContext.Provider>
  );
}

export function useShopStatus() {
  const context = useContext(ShopStatusContext);
  if (context === undefined) {
    throw new Error('useShopStatus must be used within a ShopStatusProvider');
  }
  return context;
}

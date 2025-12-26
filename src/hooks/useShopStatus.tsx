import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { sendEmailNotification } from './useEmailSettings';

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

      // Send email notification
      sendEmailNotification('shop_open', { userName });

      setIsOpen(true);
      toast.success('Toko berhasil dibuka!');
    } catch (error) {
      console.error('Error opening shop:', error);
      toast.error('Gagal membuka toko');
    }
  };

  const getDailyReportData = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Get shop status for opened_at time
    const { data: shopStatus } = await supabase
      .from('shop_status')
      .select('opened_at')
      .limit(1)
      .maybeSingle();

    // Get today's transactions with items
    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        id,
        total_amount,
        payment_status,
        created_at,
        transaction_items (
          item_type,
          subtotal,
          barber_id,
          commission_amount
        )
      `)
      .gte('created_at', todayISO)
      .eq('payment_status', 'completed');

    // Get today's expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .gte('created_at', todayISO);

    // Get today's withdrawals with barber info
    const { data: withdrawals } = await supabase
      .from('barber_withdrawals')
      .select(`
        amount,
        payment_method,
        barber_id,
        barbers (name)
      `)
      .gte('created_at', todayISO);

    // Get barbers for performance data
    const { data: barbers } = await supabase
      .from('barbers')
      .select('id, name')
      .eq('is_active', true);

    // Calculate revenue breakdown
    let serviceRevenue = 0;
    let productRevenue = 0;
    const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;
    const totalTransactions = transactions?.length || 0;

    // Calculate barber performance
    const barberStats: Record<string, { transactionCount: number; totalRevenue: number; commission: number }> = {};
    
    transactions?.forEach(transaction => {
      const items = transaction.transaction_items || [];
      items.forEach((item: { item_type: string; subtotal: number; barber_id: string | null; commission_amount: number | null }) => {
        if (item.item_type === 'service') {
          serviceRevenue += Number(item.subtotal);
        } else if (item.item_type === 'product') {
          productRevenue += Number(item.subtotal);
        }

        if (item.barber_id) {
          if (!barberStats[item.barber_id]) {
            barberStats[item.barber_id] = { transactionCount: 0, totalRevenue: 0, commission: 0 };
          }
          barberStats[item.barber_id].transactionCount += 1;
          barberStats[item.barber_id].totalRevenue += Number(item.subtotal);
          barberStats[item.barber_id].commission += Number(item.commission_amount || 0);
        }
      });
    });

    // Build barber performance array
    const barberPerformance = barbers?.map(barber => ({
      name: barber.name,
      transactionCount: barberStats[barber.id]?.transactionCount || 0,
      totalRevenue: barberStats[barber.id]?.totalRevenue || 0,
      commission: barberStats[barber.id]?.commission || 0,
    })).filter(b => b.transactionCount > 0) || [];

    // Build withdrawals array
    const barberWithdrawals = withdrawals?.map(w => ({
      barberName: (w.barbers as { name: string })?.name || 'Unknown',
      amount: Number(w.amount),
      paymentMethod: w.payment_method,
    })) || [];

    const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

    const formatTime = (dateStr: string | null) => {
      if (!dateStr) return '-';
      return new Date(dateStr).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: '2-digit',
        minute: '2-digit',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    };

    return {
      openedAt: formatTime(shopStatus?.opened_at || null),
      closedAt: formatTime(new Date().toISOString()),
      totalRevenue,
      totalTransactions,
      serviceRevenue,
      productRevenue,
      totalExpenses,
      barberPerformance,
      barberWithdrawals,
    };
  };

  const closeShop = async () => {
    if (!user) return;

    try {
      const userName = await getUserName(user.id);

      // Gather daily report data before closing
      const reportData = await getDailyReportData();

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

      // Send daily report email (replaces shop_close notification)
      sendEmailNotification('daily_report', { 
        userName,
        ...reportData
      });

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

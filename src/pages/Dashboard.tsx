import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, ShoppingCart, Users, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import InitialDepositCard from '@/components/dashboard/InitialDepositCard';

interface DailyStats {
  totalRevenue: number;
  transactionCount: number;
  topBarber: { name: string; count: number } | null;
  topService: { name: string; count: number } | null;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DailyStats>({
    totalRevenue: 0,
    transactionCount: 0,
    topBarber: null,
    topService: null
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const startOfDay = `${today}T00:00:00`;
    const endOfDay = `${today}T23:59:59`;

    // Fetch today's transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .eq('payment_status', 'completed');

    // Fetch today's transaction items with barber info
    const { data: transactionItems } = await supabase
      .from('transaction_items')
      .select(`
        *,
        barbers:barber_id (name)
      `)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    // Calculate stats
    const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;
    const transactionCount = transactions?.length || 0;

    // Calculate top barber
    const barberCounts: Record<string, { name: string; count: number }> = {};
    transactionItems?.forEach(item => {
      if (item.barbers && item.item_type === 'service') {
        const barberName = item.barbers.name;
        if (!barberCounts[barberName]) {
          barberCounts[barberName] = { name: barberName, count: 0 };
        }
        barberCounts[barberName].count++;
      }
    });
    const topBarber = Object.values(barberCounts).sort((a, b) => b.count - a.count)[0] || null;

    // Calculate top service
    const serviceCounts: Record<string, { name: string; count: number }> = {};
    transactionItems?.forEach(item => {
      if (item.item_type === 'service') {
        if (!serviceCounts[item.item_name]) {
          serviceCounts[item.item_name] = { name: item.item_name, count: 0 };
        }
        serviceCounts[item.item_name].count += item.quantity;
      }
    });
    const topService = Object.values(serviceCounts).sort((a, b) => b.count - a.count)[0] || null;

    setStats({ totalRevenue, transactionCount, topBarber, topService });

    // Fetch recent transactions with items to determine type
    const { data: recent } = await supabase
      .from('transactions')
      .select(`
        *,
        transaction_items (item_type)
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    // Process transactions to determine type (service/product/mix)
    const processedTransactions = recent?.map(tx => {
      const itemTypes = tx.transaction_items?.map((item: any) => item.item_type) || [];
      const hasService = itemTypes.includes('service');
      const hasProduct = itemTypes.includes('product');
      
      let transactionType = '-';
      if (hasService && hasProduct) {
        transactionType = 'Mix';
      } else if (hasService) {
        transactionType = 'Layanan';
      } else if (hasProduct) {
        transactionType = 'Produk';
      }
      
      return { ...tx, transactionType };
    }) || [];
    
    setRecentTransactions(processedTransactions);
    setIsLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-32 bg-muted/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: localeId })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <InitialDepositCard todayRevenue={stats.totalRevenue} />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendapatan Hari Ini
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jumlah Transaksi
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.transactionCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Barber Teraktif
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.topBarber?.name || '-'}</div>
            {stats.topBarber && (
              <p className="text-xs text-muted-foreground">{stats.topBarber.count} layanan</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Layanan Terlaris
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{stats.topService?.name || '-'}</div>
            {stats.topService && (
              <p className="text-xs text-muted-foreground">{stats.topService.count} kali</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transaksi Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Belum ada transaksi hari ini
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Waktu</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Jenis</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Pembayaran</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Total</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2 text-sm">
                        {format(new Date(tx.created_at), 'HH:mm')}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          tx.transactionType === 'Mix' 
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            : tx.transactionType === 'Layanan'
                            ? 'bg-primary/10 text-primary'
                            : tx.transactionType === 'Produk'
                            ? 'bg-accent/50 text-accent-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {tx.transactionType}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          tx.payment_method === 'cash' 
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                            : tx.payment_method === 'transfer'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : tx.payment_method === 'qris'
                            ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {tx.payment_method === 'cash' ? 'Tunai' : 
                           tx.payment_method === 'transfer' ? 'Transfer' : 
                           tx.payment_method === 'qris' ? 'QRIS' : tx.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-medium">
                        {formatCurrency(Number(tx.total_amount))}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tx.payment_status === 'completed' 
                            ? 'bg-success/10 text-success' 
                            : 'bg-warning/10 text-warning'
                        }`}>
                          {tx.payment_status === 'completed' ? 'Selesai' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

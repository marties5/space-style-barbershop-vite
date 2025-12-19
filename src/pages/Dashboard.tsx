import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, ShoppingCart, Users, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

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

    // Fetch recent transactions
    const { data: recent } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    setRecentTransactions(recent || []);
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
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">{formatCurrency(Number(tx.total_amount))}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(tx.created_at), 'HH:mm')}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    tx.payment_status === 'completed' 
                      ? 'bg-success/10 text-success' 
                      : 'bg-warning/10 text-warning'
                  }`}>
                    {tx.payment_status === 'completed' ? 'Selesai' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

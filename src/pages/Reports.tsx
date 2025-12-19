import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Calendar, TrendingUp, Users, DollarSign } from 'lucide-react';

interface BarberReport {
  barber_name: string;
  service_count: number;
  total_revenue: number;
  total_commission: number;
}

export default function Reports() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);
  const [barberReports, setBarberReports] = useState<BarberReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [dateFrom, dateTo]);

  const fetchReports = async () => {
    setIsLoading(true);
    const start = `${dateFrom}T00:00:00`;
    const end = `${dateTo}T23:59:59`;

    // Fetch transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .gte('created_at', start)
      .lte('created_at', end)
      .eq('payment_status', 'completed');

    setTotalRevenue(transactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0);
    setTransactionCount(transactions?.length || 0);

    // Fetch transaction items for barber reports
    const { data: items } = await supabase
      .from('transaction_items')
      .select(`
        *,
        barbers:barber_id (name)
      `)
      .gte('created_at', start)
      .lte('created_at', end)
      .eq('item_type', 'service');

    // Aggregate by barber
    const barberData: Record<string, BarberReport> = {};
    items?.forEach(item => {
      if (item.barbers) {
        const name = item.barbers.name;
        if (!barberData[name]) {
          barberData[name] = {
            barber_name: name,
            service_count: 0,
            total_revenue: 0,
            total_commission: 0
          };
        }
        barberData[name].service_count += item.quantity;
        barberData[name].total_revenue += Number(item.subtotal);
        barberData[name].total_commission += Number(item.commission_amount);
      }
    });

    setBarberReports(Object.values(barberData).sort((a, b) => b.total_revenue - a.total_revenue));
    setIsLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Laporan</h1>
        <p className="text-muted-foreground">Analisis performa bisnis</p>
      </div>

      {/* Date Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Periode:</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-auto"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-auto"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pendapatan
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jumlah Transaksi
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactionCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rata-rata per Transaksi
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(transactionCount > 0 ? totalRevenue / transactionCount : 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barber Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Performa Barber
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
          ) : barberReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada data untuk periode ini
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Barber</TableHead>
                  <TableHead className="text-right">Jumlah Layanan</TableHead>
                  <TableHead className="text-right">Total Pendapatan</TableHead>
                  <TableHead className="text-right">Total Komisi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {barberReports.map((report, index) => (
                  <TableRow key={report.barber_name}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium">{report.barber_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{report.service_count}</TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {formatCurrency(report.total_revenue)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(report.total_commission)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

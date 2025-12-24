import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, subMonths, startOfDay, endOfDay, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface TrendData {
  date: string;
  label: string;
  revenue: number;
  transactions: number;
}

type FilterType = 'daily' | 'monthly' | 'sixMonths' | 'custom';

export default function DailyTrendChart() {
  const [data, setData] = useState<TrendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>('daily');
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 13), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchTrendData();
  }, [filterType, dateFrom, dateTo]);

  const fetchTrendData = async () => {
    setIsLoading(true);
    const trendData: TrendData[] = [];

    if (filterType === 'daily') {
      const days = eachDayOfInterval({
        start: subDays(new Date(), 13),
        end: new Date()
      });

      for (const date of days) {
        const start = startOfDay(date).toISOString();
        const end = endOfDay(date).toISOString();

        const { data: transactions } = await supabase
          .from('transactions')
          .select('total_amount')
          .gte('created_at', start)
          .lte('created_at', end)
          .eq('payment_status', 'completed');

        trendData.push({
          date: format(date, 'yyyy-MM-dd'),
          label: format(date, 'dd MMM', { locale: localeId }),
          revenue: transactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0,
          transactions: transactions?.length || 0
        });
      }
    } else if (filterType === 'sixMonths') {
      const months = eachMonthOfInterval({
        start: subMonths(new Date(), 5),
        end: new Date()
      });

      for (const date of months) {
        const start = startOfMonth(date).toISOString();
        const end = endOfMonth(date).toISOString();

        const { data: transactions } = await supabase
          .from('transactions')
          .select('total_amount')
          .gte('created_at', start)
          .lte('created_at', end)
          .eq('payment_status', 'completed');

        trendData.push({
          date: format(date, 'yyyy-MM'),
          label: format(date, 'MMM yy', { locale: localeId }),
          revenue: transactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0,
          transactions: transactions?.length || 0
        });
      }
    } else if (filterType === 'monthly') {
      const months = eachMonthOfInterval({
        start: subMonths(new Date(), 11),
        end: new Date()
      });

      for (const date of months) {
        const start = startOfMonth(date).toISOString();
        const end = endOfMonth(date).toISOString();

        const { data: transactions } = await supabase
          .from('transactions')
          .select('total_amount')
          .gte('created_at', start)
          .lte('created_at', end)
          .eq('payment_status', 'completed');

        trendData.push({
          date: format(date, 'yyyy-MM'),
          label: format(date, 'MMM yy', { locale: localeId }),
          revenue: transactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0,
          transactions: transactions?.length || 0
        });
      }
    } else {
      const startDate = new Date(dateFrom);
      const endDate = new Date(dateTo);
      const days = eachDayOfInterval({ start: startDate, end: endDate });

      for (const date of days) {
        const start = startOfDay(date).toISOString();
        const end = endOfDay(date).toISOString();

        const { data: transactions } = await supabase
          .from('transactions')
          .select('total_amount')
          .gte('created_at', start)
          .lte('created_at', end)
          .eq('payment_status', 'completed');

        trendData.push({
          date: format(date, 'yyyy-MM-dd'),
          label: format(date, 'dd MMM', { locale: localeId }),
          revenue: transactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0,
          transactions: transactions?.length || 0
        });
      }
    }

    setData(trendData);
    setIsLoading(false);
  };

  const getTitle = () => {
    switch (filterType) {
      case 'daily': return 'Trend Harian (14 Hari Terakhir)';
      case 'sixMonths': return 'Trend Pendapatan (6 Bulan Terakhir)';
      case 'monthly': return 'Trend Bulanan (12 Bulan Terakhir)';
      case 'custom': return 'Trend Pendapatan (Rentang Custom)';
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}jt`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}rb`;
    }
    return value.toString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-sm text-primary">
            Pendapatan: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(payload[0].value)}
          </p>
          <p className="text-sm text-muted-foreground">
            Transaksi: {payload[1]?.value || 0}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>{getTitle()}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={filterType === 'daily' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('daily')}
            >
              Harian
            </Button>
            <Button
              variant={filterType === 'sixMonths' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('sixMonths')}
            >
              6 Bulan
            </Button>
            <Button
              variant={filterType === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('monthly')}
            >
              12 Bulan
            </Button>
            <Button
              variant={filterType === 'custom' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('custom')}
            >
              Rentang
            </Button>
          </div>
        </div>
        {filterType === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-sm text-muted-foreground">Dari:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-auto"
            />
            <span className="text-sm text-muted-foreground">Sampai:</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-auto"
            />
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    yAxisId="left"
                    tickFormatter={formatCurrency}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="transactions"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    fill="transparent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-sm text-muted-foreground">Pendapatan</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 border-t-2 border-dashed border-muted-foreground" style={{ width: 12 }} />
                <span className="text-sm text-muted-foreground">Transaksi</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

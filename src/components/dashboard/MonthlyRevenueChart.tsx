import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface MonthlyData {
  month: string;
  revenue: number;
  shortMonth: string;
}

export default function MonthlyRevenueChart() {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMonthlyRevenue();
  }, []);

  const fetchMonthlyRevenue = async () => {
    const monthlyData: MonthlyData[] = [];
    const now = new Date();

    // Fetch last 6 months of data
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const start = format(startOfMonth(monthDate), 'yyyy-MM-dd') + 'T00:00:00';
      const end = format(endOfMonth(monthDate), 'yyyy-MM-dd') + 'T23:59:59';

      const { data: transactions } = await supabase
        .from('transactions')
        .select('total_amount')
        .gte('created_at', start)
        .lte('created_at', end)
        .eq('payment_status', 'completed');

      const revenue = transactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;

      monthlyData.push({
        month: format(monthDate, 'MMMM yyyy', { locale: localeId }),
        shortMonth: format(monthDate, 'MMM', { locale: localeId }),
        revenue,
      });
    }

    setData(monthlyData);
    setIsLoading(false);
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
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-primary font-bold">
            Rp {Number(payload[0].value).toLocaleString('id-ID')}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tren Pendapatan Bulanan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            Memuat data...
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const avgRevenue = data.length > 0 ? totalRevenue / data.length : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tren Pendapatan 6 Bulan Terakhir
          </CardTitle>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Rata-rata/bulan</p>
            <p className="font-bold text-primary">
              Rp {avgRevenue.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="shortMonth" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="revenue" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

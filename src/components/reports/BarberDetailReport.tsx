import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { User, Scissors, TrendingUp } from 'lucide-react';

interface Barber {
  id: string;
  name: string;
}

interface ServiceDetail {
  item_name: string;
  quantity: number;
  subtotal: number;
  commission_amount: number;
  created_at: string;
}

interface BarberStats {
  total_services: number;
  total_revenue: number;
  total_commission: number;
  avg_per_service: number;
}

interface BarberDetailReportProps {
  dateFrom: string;
  dateTo: string;
}

export function BarberDetailReport({ dateFrom, dateTo }: BarberDetailReportProps) {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [serviceDetails, setServiceDetails] = useState<ServiceDetail[]>([]);
  const [stats, setStats] = useState<BarberStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchBarbers();
  }, []);

  useEffect(() => {
    if (selectedBarberId) {
      fetchBarberDetails();
    }
  }, [selectedBarberId, dateFrom, dateTo]);

  const fetchBarbers = async () => {
    const { data } = await supabase
      .from('barbers')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    
    if (data) {
      setBarbers(data);
    }
  };

  const fetchBarberDetails = async () => {
    setIsLoading(true);
    const start = `${dateFrom}T00:00:00`;
    const end = `${dateTo}T23:59:59`;

    const { data } = await supabase
      .from('transaction_items')
      .select('item_name, quantity, subtotal, commission_amount, created_at')
      .eq('barber_id', selectedBarberId)
      .eq('item_type', 'service')
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false });

    if (data) {
      setServiceDetails(data);
      
      const totalServices = data.reduce((sum, item) => sum + item.quantity, 0);
      const totalRevenue = data.reduce((sum, item) => sum + Number(item.subtotal), 0);
      const totalCommission = data.reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);
      
      setStats({
        total_services: totalServices,
        total_revenue: totalRevenue,
        total_commission: totalCommission,
        avg_per_service: totalServices > 0 ? totalRevenue / totalServices : 0
      });
    }
    
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Laporan Detail per Barber
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Select value={selectedBarberId} onValueChange={setSelectedBarberId}>
          <SelectTrigger className="w-full md:w-[300px]">
            <SelectValue placeholder="Pilih Barber" />
          </SelectTrigger>
          <SelectContent>
            {barbers.map((barber) => (
              <SelectItem key={barber.id} value={barber.id}>
                {barber.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedBarberId && stats && (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Scissors className="h-4 w-4" />
                    Total Layanan
                  </div>
                  <div className="text-2xl font-bold mt-1">{stats.total_services}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <TrendingUp className="h-4 w-4" />
                    Total Pendapatan
                  </div>
                  <div className="text-2xl font-bold mt-1 text-primary">
                    {formatCurrency(stats.total_revenue)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-muted-foreground text-sm">Total Komisi</div>
                  <div className="text-2xl font-bold mt-1 text-green-600">
                    {formatCurrency(stats.total_commission)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-muted-foreground text-sm">Rata-rata/Layanan</div>
                  <div className="text-2xl font-bold mt-1">
                    {formatCurrency(stats.avg_per_service)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Service Details Table */}
            <div>
              <h4 className="font-semibold mb-4">Riwayat Layanan</h4>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
              ) : serviceDetails.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Tidak ada data layanan untuk periode ini
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Layanan</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Pendapatan</TableHead>
                      <TableHead className="text-right">Komisi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceDetails.map((detail, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(detail.created_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
                        </TableCell>
                        <TableCell className="font-medium">{detail.item_name}</TableCell>
                        <TableCell className="text-right">{detail.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(detail.subtotal)}</TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(detail.commission_amount || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

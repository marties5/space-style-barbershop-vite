import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, subDays } from 'date-fns';
import { Calendar, TrendingUp, Users, DollarSign, Receipt, Wallet, TrendingDown, Banknote, Smartphone, CreditCard } from 'lucide-react';
import { BarberDetailReport } from '@/components/reports/BarberDetailReport';

interface BarberReport {
  barber_name: string;
  service_count: number;
  total_revenue: number;
  total_commission: number;
}

interface ExpenseReport {
  category: string;
  total: number;
  count: number;
}

interface PaymentMethodReport {
  method: string;
  total: number;
  count: number;
}

export default function Reports() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);
  const [barberReports, setBarberReports] = useState<BarberReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState(0);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpenseReport[]>([]);
  const [paymentMethodReports, setPaymentMethodReports] = useState<PaymentMethodReport[]>([]);

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

    // Group by payment method
    const paymentData: Record<string, PaymentMethodReport> = {};
    transactions?.forEach(tx => {
      const method = tx.payment_method || 'cash';
      if (!paymentData[method]) {
        paymentData[method] = { method, total: 0, count: 0 };
      }
      paymentData[method].total += Number(tx.total_amount);
      paymentData[method].count += 1;
    });
    setPaymentMethodReports(Object.values(paymentData).sort((a, b) => b.total - a.total));
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

    // Fetch expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .gte('created_at', start)
      .lte('created_at', end);

    setTotalExpenses(expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0);

    // Group expenses by category
    const expenseData: Record<string, ExpenseReport> = {};
    expenses?.forEach(expense => {
      if (!expenseData[expense.category]) {
        expenseData[expense.category] = { category: expense.category, total: 0, count: 0 };
      }
      expenseData[expense.category].total += Number(expense.amount);
      expenseData[expense.category].count += 1;
    });
    setExpensesByCategory(Object.values(expenseData).sort((a, b) => b.total - a.total));

    // Fetch withdrawals
    const { data: withdrawals } = await supabase
      .from('barber_withdrawals')
      .select('*')
      .gte('created_at', start)
      .lte('created_at', end);

    setTotalWithdrawals(withdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0);

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

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="overview">Ringkasan</TabsTrigger>
        <TabsTrigger value="payment-method">Metode Pembayaran</TabsTrigger>
        <TabsTrigger value="barber-detail">Detail per Barber</TabsTrigger>
        <TabsTrigger value="operational">Laporan Operasional</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="payment-method" className="space-y-6">
          {/* Payment Method Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {paymentMethodReports.map((pm) => {
              const getIcon = () => {
                switch (pm.method) {
                  case 'qris': return <Smartphone className="h-4 w-4 text-purple-500" />;
                  case 'transfer': return <CreditCard className="h-4 w-4 text-blue-500" />;
                  default: return <Banknote className="h-4 w-4 text-green-500" />;
                }
              };
              const getColor = () => {
                switch (pm.method) {
                  case 'qris': return 'text-purple-500';
                  case 'transfer': return 'text-blue-500';
                  default: return 'text-green-500';
                }
              };
              return (
                <Card key={pm.method}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
                      {pm.method}
                    </CardTitle>
                    {getIcon()}
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getColor()}`}>{formatCurrency(pm.total)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{pm.count} transaksi</p>
                  </CardContent>
                </Card>
              );
            })}
            {paymentMethodReports.length === 0 && !isLoading && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Tidak ada data transaksi untuk periode ini
              </div>
            )}
          </div>

          {/* Payment Method Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Detail Metode Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
              ) : paymentMethodReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Tidak ada data untuk periode ini
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metode</TableHead>
                      <TableHead className="text-right">Jumlah Transaksi</TableHead>
                      <TableHead className="text-right">Total Pendapatan</TableHead>
                      <TableHead className="text-right">Persentase</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMethodReports.map((pm) => (
                      <TableRow key={pm.method}>
                        <TableCell className="font-medium uppercase">{pm.method}</TableCell>
                        <TableCell className="text-right">{pm.count}</TableCell>
                        <TableCell className="text-right font-medium text-primary">
                          {formatCurrency(pm.total)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {totalRevenue > 0 ? ((pm.total / totalRevenue) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{transactionCount}</TableCell>
                      <TableCell className="text-right text-primary">
                        {formatCurrency(totalRevenue)}
                      </TableCell>
                      <TableCell className="text-right">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="barber-detail">
          <BarberDetailReport dateFrom={dateFrom} dateTo={dateTo} />
        </TabsContent>

        <TabsContent value="operational" className="space-y-6">
          {/* Operational Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pendapatan
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pengeluaran
                </CardTitle>
                <Receipt className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Penarikan Barber
                </CardTitle>
                <Wallet className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">{formatCurrency(totalWithdrawals)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Laba Bersih
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(totalRevenue - totalExpenses - totalWithdrawals) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {formatCurrency(totalRevenue - totalExpenses - totalWithdrawals)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expenses by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Pengeluaran per Kategori
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
              ) : expensesByCategory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Tidak ada data pengeluaran untuk periode ini
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Jumlah Transaksi</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expensesByCategory.map((expense) => (
                      <TableRow key={expense.category}>
                        <TableCell className="font-medium capitalize">{expense.category}</TableCell>
                        <TableCell className="text-right">{expense.count}</TableCell>
                        <TableCell className="text-right text-destructive">
                          {formatCurrency(expense.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        {expensesByCategory.reduce((sum, e) => sum + e.count, 0)}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        {formatCurrency(totalExpenses)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface ReportExportButtonsProps {
  dateRange: { start: string; end: string };
  filterLabel: string;
}

export default function ReportExportButtons({ dateRange, filterLabel }: ReportExportButtonsProps) {
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const exportTransactions = async () => {
    setIsExporting('transactions');
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
          *,
          transaction_items (
            item_name,
            item_type,
            quantity,
            unit_price,
            subtotal,
            commission_amount,
            barbers:barber_id (name)
          )
        `)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = transactions?.flatMap(tx => 
        tx.transaction_items?.map((item: any) => ({
          'Tanggal': format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm'),
          'ID Transaksi': tx.id.slice(0, 8),
          'Item': item.item_name,
          'Tipe': item.item_type === 'service' ? 'Layanan' : 'Produk',
          'Barber': item.barbers?.name || '-',
          'Qty': item.quantity,
          'Harga Satuan': formatCurrency(item.unit_price),
          'Subtotal': formatCurrency(item.subtotal),
          'Komisi': formatCurrency(item.commission_amount || 0),
          'Diskon': tx.discount_amount > 0 ? formatCurrency(tx.discount_amount) : '-',
          'Tipe Diskon': tx.discount_type === 'percent' ? `${tx.discount_percent}%` : tx.discount_type === 'fixed' ? 'Nominal' : '-',
          'Metode Bayar': tx.payment_method === 'cash' ? 'Tunai' : tx.payment_method === 'transfer' ? 'Transfer' : 'QRIS',
          'Status': tx.payment_status === 'completed' ? 'Selesai' : 'Pending',
          'Total Transaksi': formatCurrency(tx.total_amount)
        })) || []
      );

      if (rows.length === 0) {
        toast.info('Tidak ada data transaksi untuk periode ini');
        setIsExporting(null);
        return;
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');
      XLSX.writeFile(wb, `transaksi_${filterLabel}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
      toast.success('Export transaksi berhasil');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal export transaksi');
    }
    setIsExporting(null);
  };

  const exportExpenses = async () => {
    setIsExporting('expenses');
    try {
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!expenses || expenses.length === 0) {
        toast.info('Tidak ada data pengeluaran untuk periode ini');
        setIsExporting(null);
        return;
      }

      const rows = expenses.map(exp => ({
        'Tanggal': format(new Date(exp.created_at), 'dd/MM/yyyy HH:mm'),
        'Deskripsi': exp.description,
        'Kategori': exp.category,
        'Jumlah': formatCurrency(exp.amount),
        'Metode Bayar': exp.payment_method === 'cash' ? 'Tunai' : exp.payment_method === 'transfer' ? 'Transfer' : 'QRIS',
        'Catatan': exp.notes || '-'
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Pengeluaran');
      XLSX.writeFile(wb, `pengeluaran_${filterLabel}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
      toast.success('Export pengeluaran berhasil');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal export pengeluaran');
    }
    setIsExporting(null);
  };

  const exportWithdrawals = async () => {
    setIsExporting('withdrawals');
    try {
      const { data: withdrawals, error } = await supabase
        .from('barber_withdrawals')
        .select(`
          *,
          barbers:barber_id (name)
        `)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!withdrawals || withdrawals.length === 0) {
        toast.info('Tidak ada data penarikan untuk periode ini');
        setIsExporting(null);
        return;
      }

      const rows = withdrawals.map(wd => ({
        'Tanggal': format(new Date(wd.created_at), 'dd/MM/yyyy HH:mm'),
        'Barber': wd.barbers?.name || '-',
        'Jumlah': formatCurrency(wd.amount),
        'Metode Bayar': wd.payment_method === 'cash' ? 'Tunai' : wd.payment_method === 'transfer' ? 'Transfer' : 'QRIS',
        'Catatan': wd.notes || '-'
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Penarikan');
      XLSX.writeFile(wb, `penarikan_${filterLabel}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
      toast.success('Export penarikan berhasil');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal export penarikan');
    }
    setIsExporting(null);
  };

  const exportAllReports = async () => {
    setIsExporting('all');
    try {
      // Fetch all data
      const [transactionsRes, expensesRes, withdrawalsRes] = await Promise.all([
        supabase
          .from('transactions')
          .select(`
            *,
            transaction_items (
              item_name,
              item_type,
              quantity,
              unit_price,
              subtotal,
              commission_amount,
              barbers:barber_id (name)
            )
          `)
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end)
          .order('created_at', { ascending: false }),
        supabase
          .from('expenses')
          .select('*')
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end)
          .order('created_at', { ascending: false }),
        supabase
          .from('barber_withdrawals')
          .select(`*, barbers:barber_id (name)`)
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end)
          .order('created_at', { ascending: false })
      ]);

      const wb = XLSX.utils.book_new();

      // Transactions sheet
      const txRows = transactionsRes.data?.flatMap(tx => 
        tx.transaction_items?.map((item: any) => ({
          'Tanggal': format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm'),
          'ID Transaksi': tx.id.slice(0, 8),
          'Item': item.item_name,
          'Tipe': item.item_type === 'service' ? 'Layanan' : 'Produk',
          'Barber': item.barbers?.name || '-',
          'Qty': item.quantity,
          'Harga Satuan': formatCurrency(item.unit_price),
          'Subtotal': formatCurrency(item.subtotal),
          'Komisi': formatCurrency(item.commission_amount || 0),
          'Diskon': tx.discount_amount > 0 ? formatCurrency(tx.discount_amount) : '-',
          'Tipe Diskon': tx.discount_type === 'percent' ? `${tx.discount_percent}%` : tx.discount_type === 'fixed' ? 'Nominal' : '-',
          'Metode Bayar': tx.payment_method === 'cash' ? 'Tunai' : tx.payment_method === 'transfer' ? 'Transfer' : 'QRIS',
          'Status': tx.payment_status === 'completed' ? 'Selesai' : 'Pending',
          'Total Transaksi': formatCurrency(tx.total_amount)
        })) || []
      ) || [];
      if (txRows.length > 0) {
        const wsTx = XLSX.utils.json_to_sheet(txRows);
        XLSX.utils.book_append_sheet(wb, wsTx, 'Transaksi');
      }

      // Expenses sheet
      const expRows = expensesRes.data?.map(exp => ({
        'Tanggal': format(new Date(exp.created_at), 'dd/MM/yyyy HH:mm'),
        'Deskripsi': exp.description,
        'Kategori': exp.category,
        'Jumlah': formatCurrency(exp.amount),
        'Metode Bayar': exp.payment_method === 'cash' ? 'Tunai' : exp.payment_method === 'transfer' ? 'Transfer' : 'QRIS',
        'Catatan': exp.notes || '-'
      })) || [];
      if (expRows.length > 0) {
        const wsExp = XLSX.utils.json_to_sheet(expRows);
        XLSX.utils.book_append_sheet(wb, wsExp, 'Pengeluaran');
      }

      // Withdrawals sheet
      const wdRows = withdrawalsRes.data?.map(wd => ({
        'Tanggal': format(new Date(wd.created_at), 'dd/MM/yyyy HH:mm'),
        'Barber': wd.barbers?.name || '-',
        'Jumlah': formatCurrency(wd.amount),
        'Metode Bayar': wd.payment_method === 'cash' ? 'Tunai' : wd.payment_method === 'transfer' ? 'Transfer' : 'QRIS',
        'Catatan': wd.notes || '-'
      })) || [];
      if (wdRows.length > 0) {
        const wsWd = XLSX.utils.json_to_sheet(wdRows);
        XLSX.utils.book_append_sheet(wb, wsWd, 'Penarikan');
      }

      if (wb.SheetNames.length === 0) {
        toast.info('Tidak ada data untuk periode ini');
        setIsExporting(null);
        return;
      }

      XLSX.writeFile(wb, `laporan_lengkap_${filterLabel}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
      toast.success('Export semua laporan berhasil');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal export laporan');
    }
    setIsExporting(null);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={exportTransactions}
        disabled={isExporting !== null}
      >
        <Download className="h-4 w-4 mr-2" />
        {isExporting === 'transactions' ? 'Mengexport...' : 'Transaksi'}
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={exportExpenses}
        disabled={isExporting !== null}
      >
        <Download className="h-4 w-4 mr-2" />
        {isExporting === 'expenses' ? 'Mengexport...' : 'Pengeluaran'}
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={exportWithdrawals}
        disabled={isExporting !== null}
      >
        <Download className="h-4 w-4 mr-2" />
        {isExporting === 'withdrawals' ? 'Mengexport...' : 'Penarikan'}
      </Button>
      <Button 
        variant="default" 
        size="sm" 
        onClick={exportAllReports}
        disabled={isExporting !== null}
      >
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        {isExporting === 'all' ? 'Mengexport...' : 'Semua Laporan'}
      </Button>
    </div>
  );
}

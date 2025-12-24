import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export default function ExportButtons() {
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
          'Metode Bayar': tx.payment_method === 'cash' ? 'Tunai' : tx.payment_method === 'transfer' ? 'Transfer' : 'QRIS',
          'Status': tx.payment_status === 'completed' ? 'Selesai' : 'Pending',
          'Total Transaksi': formatCurrency(tx.total_amount)
        })) || []
      );

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');
      XLSX.writeFile(wb, `transaksi_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = expenses?.map(exp => ({
        'Tanggal': format(new Date(exp.created_at), 'dd/MM/yyyy HH:mm'),
        'Deskripsi': exp.description,
        'Kategori': exp.category,
        'Jumlah': formatCurrency(exp.amount),
        'Metode Bayar': exp.payment_method === 'cash' ? 'Tunai' : exp.payment_method === 'transfer' ? 'Transfer' : 'QRIS',
        'Catatan': exp.notes || '-'
      })) || [];

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Pengeluaran');
      XLSX.writeFile(wb, `pengeluaran_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = withdrawals?.map(wd => ({
        'Tanggal': format(new Date(wd.created_at), 'dd/MM/yyyy HH:mm'),
        'Barber': wd.barbers?.name || '-',
        'Jumlah': formatCurrency(wd.amount),
        'Metode Bayar': wd.payment_method === 'cash' ? 'Tunai' : wd.payment_method === 'transfer' ? 'Transfer' : 'QRIS',
        'Catatan': wd.notes || '-'
      })) || [];

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Penarikan');
      XLSX.writeFile(wb, `penarikan_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
      toast.success('Export penarikan berhasil');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal export penarikan');
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
    </div>
  );
}

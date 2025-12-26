import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, FileText, Download } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Barber {
  id: string;
  name: string;
  commission_service: number;
  commission_product: number;
}

interface SalarySlipPDFProps {
  barbers: Barber[];
}

interface SlipData {
  barberName: string;
  period: string;
  totalServiceRevenue: number;
  totalProductRevenue: number;
  serviceCommission: number;
  productCommission: number;
  totalCommission: number;
  totalWithdrawn: number;
  remaining: number;
  transactions: Array<{
    date: string;
    item: string;
    type: string;
    amount: number;
    commission: number;
  }>;
  withdrawals: Array<{
    date: string;
    amount: number;
    method: string;
  }>;
}

export function SalarySlipPDF({ barbers }: SalarySlipPDFProps) {
  const [open, setOpen] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [slipData, setSlipData] = useState<SlipData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateSlip = async () => {
    if (!selectedBarber) {
      toast.error("Pilih barber terlebih dahulu");
      return;
    }

    setIsLoading(true);
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    const barber = barbers.find(b => b.id === selectedBarber);

    try {
      // Get transaction items for this barber in the period
      const { data: transactionItems, error: txError } = await supabase
        .from("transaction_items")
        .select(`
          *,
          transactions!inner(created_at)
        `)
        .eq("barber_id", selectedBarber)
        .gte("transactions.created_at", start.toISOString())
        .lte("transactions.created_at", end.toISOString());

      if (txError) throw txError;

      // Get withdrawals for this barber in the period
      const { data: withdrawalsData, error: wdError } = await supabase
        .from("barber_withdrawals")
        .select("*")
        .eq("barber_id", selectedBarber)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at");

      if (wdError) throw wdError;

      // Calculate totals
      let totalServiceRevenue = 0;
      let totalProductRevenue = 0;
      let serviceCommission = 0;
      let productCommission = 0;

      const transactions = transactionItems?.map(item => {
        const commission = Number(item.commission_amount) || 0;
        const amount = Number(item.subtotal) || 0;

        if (item.item_type === "service") {
          totalServiceRevenue += amount;
          serviceCommission += commission;
        } else {
          totalProductRevenue += amount;
          productCommission += commission;
        }

        return {
          date: format(new Date(item.transactions.created_at), "dd/MM/yyyy"),
          item: item.item_name,
          type: item.item_type === "service" ? "Layanan" : "Produk",
          amount,
          commission,
        };
      }) || [];

      const totalCommission = serviceCommission + productCommission;
      const totalWithdrawn = withdrawalsData?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;

      const withdrawals = withdrawalsData?.map(w => ({
        date: format(new Date(w.created_at), "dd/MM/yyyy"),
        amount: Number(w.amount),
        method: w.payment_method === "cash" ? "Cash" : "Transfer",
      })) || [];

      setSlipData({
        barberName: barber?.name || "",
        period: format(selectedMonth, "MMMM yyyy", { locale: localeId }),
        totalServiceRevenue,
        totalProductRevenue,
        serviceCommission,
        productCommission,
        totalCommission,
        totalWithdrawn,
        remaining: totalCommission - totalWithdrawn,
        transactions,
        withdrawals,
      });
    } catch (error: any) {
      toast.error("Gagal mengambil data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const printSlip = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !slipData) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Slip Gaji - ${slipData.barberName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; font-size: 12px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { font-size: 18px; margin-bottom: 5px; }
          .header p { color: #666; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; font-size: 14px; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          th { background: #f5f5f5; font-weight: 600; }
          .text-right { text-align: right; }
          .total-row { background: #f0f0f0; font-weight: bold; }
          .highlight { background: #e8f5e9; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SLIP GAJI BARBER</h1>
          <p>Periode: ${slipData.period}</p>
        </div>
        
        <div class="section">
          <div class="info-row">
            <span><strong>Nama Barber:</strong></span>
            <span>${slipData.barberName}</span>
          </div>
          <div class="info-row">
            <span><strong>Tanggal Cetak:</strong></span>
            <span>${format(new Date(), "dd MMMM yyyy", { locale: localeId })}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Ringkasan Pendapatan</div>
          <table>
            <tr>
              <td>Pendapatan Layanan</td>
              <td class="text-right">${formatCurrency(slipData.totalServiceRevenue)}</td>
            </tr>
            <tr>
              <td>Pendapatan Produk</td>
              <td class="text-right">${formatCurrency(slipData.totalProductRevenue)}</td>
            </tr>
            <tr class="total-row">
              <td>Total Pendapatan</td>
              <td class="text-right">${formatCurrency(slipData.totalServiceRevenue + slipData.totalProductRevenue)}</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Ringkasan Komisi</div>
          <table>
            <tr>
              <td>Komisi Layanan</td>
              <td class="text-right">${formatCurrency(slipData.serviceCommission)}</td>
            </tr>
            <tr>
              <td>Komisi Produk</td>
              <td class="text-right">${formatCurrency(slipData.productCommission)}</td>
            </tr>
            <tr class="total-row">
              <td>Total Komisi</td>
              <td class="text-right">${formatCurrency(slipData.totalCommission)}</td>
            </tr>
            <tr>
              <td>Sudah Ditarik</td>
              <td class="text-right">(${formatCurrency(slipData.totalWithdrawn)})</td>
            </tr>
            <tr class="highlight total-row">
              <td>Sisa Komisi</td>
              <td class="text-right">${formatCurrency(slipData.remaining)}</td>
            </tr>
          </table>
        </div>

        ${slipData.transactions.length > 0 ? `
        <div class="section">
          <div class="section-title">Detail Transaksi</div>
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Item</th>
                <th>Tipe</th>
                <th class="text-right">Subtotal</th>
                <th class="text-right">Komisi</th>
              </tr>
            </thead>
            <tbody>
              ${slipData.transactions.map(t => `
                <tr>
                  <td>${t.date}</td>
                  <td>${t.item}</td>
                  <td>${t.type}</td>
                  <td class="text-right">${formatCurrency(t.amount)}</td>
                  <td class="text-right">${formatCurrency(t.commission)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        ` : ""}

        ${slipData.withdrawals.length > 0 ? `
        <div class="section">
          <div class="section-title">Riwayat Penarikan</div>
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Metode</th>
                <th class="text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              ${slipData.withdrawals.map(w => `
                <tr>
                  <td>${w.date}</td>
                  <td>${w.method}</td>
                  <td class="text-right">${formatCurrency(w.amount)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        ` : ""}

        <div class="footer">
          <p>Dokumen ini dicetak secara otomatis oleh sistem</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Slip Gaji
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Slip Gaji Barber</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pilih Barber</Label>
              <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih barber" />
                </SelectTrigger>
                <SelectContent>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Periode Bulan</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedMonth, "MMMM yyyy", { locale: localeId })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedMonth}
                    onSelect={(date) => date && setSelectedMonth(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button onClick={generateSlip} disabled={isLoading || !selectedBarber}>
            {isLoading ? "Memuat..." : "Generate Slip"}
          </Button>

          {slipData && (
            <div className="mt-6 space-y-6 border rounded-lg p-6 bg-muted/30">
              {/* Slip Preview */}
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold">SLIP GAJI BARBER</h2>
                <p className="text-muted-foreground">Periode: {slipData.period}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Nama Barber:</span>
                  <span className="font-medium ml-2">{slipData.barberName}</span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground">Tanggal Cetak:</span>
                  <span className="font-medium ml-2">{format(new Date(), "dd MMMM yyyy", { locale: localeId })}</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="font-semibold border-b pb-1">Ringkasan Pendapatan</h3>
                  <div className="flex justify-between text-sm">
                    <span>Pendapatan Layanan</span>
                    <span>{formatCurrency(slipData.totalServiceRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Pendapatan Produk</span>
                    <span>{formatCurrency(slipData.totalProductRevenue)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>Total</span>
                    <span>{formatCurrency(slipData.totalServiceRevenue + slipData.totalProductRevenue)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold border-b pb-1">Ringkasan Komisi</h3>
                  <div className="flex justify-between text-sm">
                    <span>Komisi Layanan</span>
                    <span>{formatCurrency(slipData.serviceCommission)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Komisi Produk</span>
                    <span>{formatCurrency(slipData.productCommission)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>Total Komisi</span>
                    <span>{formatCurrency(slipData.totalCommission)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Sudah Ditarik</span>
                    <span>({formatCurrency(slipData.totalWithdrawn)})</span>
                  </div>
                  <div className="flex justify-between font-bold text-primary bg-primary/10 p-2 rounded">
                    <span>Sisa Komisi</span>
                    <span>{formatCurrency(slipData.remaining)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={printSlip}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF / Cetak
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

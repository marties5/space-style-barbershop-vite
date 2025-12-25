import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CalendarIcon, Search, Eye, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  notes: string | null;
  created_at: string;
  discount_amount?: number;
  discount_percent?: number;
  discount_type?: string;
}

interface TransactionItem {
  id: string;
  item_name: string;
  item_type: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  commission_amount: number | null;
  barber_id: string | null;
  barbers?: { name: string } | null;
}

interface Barber {
  id: string;
  name: string;
}

type DatePreset = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'custom';

const ITEMS_PER_PAGE = 10;

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [dateFrom, setDateFrom] = useState<Date>(startOfDay(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfDay(new Date()));
  const [selectedBarber, setSelectedBarber] = useState<string>("all");
  const [itemType, setItemType] = useState<string>("all");
  
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Detail modal
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionItems, setTransactionItems] = useState<TransactionItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    fetchBarbers();
  }, []);

  useEffect(() => {
    applyDatePreset(datePreset);
  }, [datePreset]);

  useEffect(() => {
    fetchTransactions();
  }, [currentPage, paymentMethod, dateFrom, dateTo, selectedBarber, itemType]);

  const fetchBarbers = async () => {
    const { data } = await supabase
      .from('barbers')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    if (data) setBarbers(data);
  };

  const applyDatePreset = (preset: DatePreset) => {
    const now = new Date();
    switch (preset) {
      case 'today':
        setDateFrom(startOfDay(now));
        setDateTo(endOfDay(now));
        break;
      case 'yesterday':
        const yesterday = subDays(now, 1);
        setDateFrom(startOfDay(yesterday));
        setDateTo(endOfDay(yesterday));
        break;
      case 'thisWeek':
        setDateFrom(startOfDay(subDays(now, 7)));
        setDateTo(endOfDay(now));
        break;
      case 'thisMonth':
        setDateFrom(startOfMonth(now));
        setDateTo(endOfDay(now));
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        setDateFrom(startOfMonth(lastMonth));
        setDateTo(endOfMonth(lastMonth));
        break;
      case 'custom':
        // Keep current custom dates
        break;
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .gte('created_at', dateFrom.toISOString())
        .lte('created_at', dateTo.toISOString())
        .order('created_at', { ascending: false });

      if (paymentMethod !== 'all') {
        query = query.eq('payment_method', paymentMethod);
      }

      // If barber or item type filter is active, we need to filter by transaction_items
      if (selectedBarber !== 'all' || itemType !== 'all') {
        // First get transaction IDs that match the criteria
        let itemsQuery = supabase
          .from('transaction_items')
          .select('transaction_id');
        
        if (selectedBarber !== 'all') {
          itemsQuery = itemsQuery.eq('barber_id', selectedBarber);
        }
        if (itemType !== 'all') {
          itemsQuery = itemsQuery.eq('item_type', itemType);
        }
        
        const { data: matchingItems } = await itemsQuery;
        const transactionIds = [...new Set(matchingItems?.map(item => item.transaction_id) || [])];
        
        if (transactionIds.length === 0) {
          setTransactions([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }
        
        query = query.in('id', transactionIds);
      }

      // Get total count first
      const { count } = await query;
      setTotalCount(count || 0);

      // Then get paginated data
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data, error } = await query.range(from, to);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchTransactions();
  };

  const fetchTransactionItems = async (transactionId: string) => {
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('transaction_items')
        .select(`
          *,
          barbers:barber_id(name)
        `)
        .eq('transaction_id', transactionId);

      if (error) throw error;
      setTransactionItems(data || []);
    } catch (error) {
      console.error('Error fetching transaction items:', error);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleViewDetail = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    fetchTransactionItems(transaction.id);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case 'cash':
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Cash</Badge>;
      case 'qris':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">QRIS</Badge>;
      case 'transfer':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Transfer</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const clearFilters = () => {
    setPaymentMethod("all");
    setSelectedBarber("all");
    setItemType("all");
    setDatePreset("today");
    setSearchQuery("");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl">History Transaksi</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
              >
                <X className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Date Presets */}
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'today', label: 'Hari Ini' },
              { value: 'yesterday', label: 'Kemarin' },
              { value: 'thisWeek', label: '7 Hari' },
              { value: 'thisMonth', label: 'Bulan Ini' },
              { value: 'lastMonth', label: 'Bulan Lalu' },
              { value: 'custom', label: 'Custom' },
            ].map((preset) => (
              <Button
                key={preset.value}
                variant={datePreset === preset.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDatePreset(preset.value as DatePreset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Custom Date Range */}
          {datePreset === 'custom' && (
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label>Dari Tanggal</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dateFrom, "dd MMM yyyy", { locale: localeId })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={(date) => date && setDateFrom(startOfDay(date))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Sampai Tanggal</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dateTo, "dd MMM yyyy", { locale: localeId })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={(date) => date && setDateTo(endOfDay(date))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Extended Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label>Metode Pembayaran</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="qris">QRIS</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Barber</Label>
                <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Barber</SelectItem>
                    {barbers.map((barber) => (
                      <SelectItem key={barber.id} value={barber.id}>
                        {barber.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipe Item</Label>
                <Select value={itemType} onValueChange={setItemType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="service">Jasa</SelectItem>
                    <SelectItem value="product">Produk</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cari</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="ID atau catatan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button size="icon" onClick={handleSearch}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Total: {totalCount} transaksi</span>
            <span>
              Halaman {currentPage} dari {totalPages || 1}
            </span>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>ID Transaksi</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pembayaran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Tidak ada transaksi ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {format(new Date(transaction.created_at), "dd MMM yyyy HH:mm", { locale: localeId })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {transaction.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(transaction.total_amount)}
                      </TableCell>
                      <TableCell>
                        {getPaymentMethodBadge(transaction.payment_method)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={transaction.payment_status === 'completed' ? 'default' : 'secondary'}
                        >
                          {transaction.payment_status === 'completed' ? 'Selesai' : transaction.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(transaction)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={currentPage === pageNum}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={cn(currentPage === totalPages && "pointer-events-none opacity-50")}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
      </Card>

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">ID Transaksi:</span>
                  <p className="font-mono">{selectedTransaction.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tanggal:</span>
                  <p>{format(new Date(selectedTransaction.created_at), "dd MMMM yyyy, HH:mm", { locale: localeId })}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <p className="font-semibold text-lg">{formatCurrency(selectedTransaction.total_amount)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Pembayaran:</span>
                  <p>{getPaymentMethodBadge(selectedTransaction.payment_method)}</p>
                </div>
                {selectedTransaction.discount_amount && selectedTransaction.discount_amount > 0 && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Diskon Member:</span>
                    <p className="text-green-600 font-medium">
                      -{formatCurrency(selectedTransaction.discount_amount)}
                      {selectedTransaction.discount_type === 'percent' && selectedTransaction.discount_percent && (
                        <span className="text-sm text-muted-foreground ml-1">({selectedTransaction.discount_percent}%)</span>
                      )}
                    </p>
                  </div>
                )}
                {selectedTransaction.notes && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Catatan:</span>
                    <p>{selectedTransaction.notes}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Item Transaksi</h4>
                {loadingItems ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead>Barber</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Harga</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactionItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {item.item_type === 'service' ? 'Jasa' : 'Produk'}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.barbers?.name || '-'}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

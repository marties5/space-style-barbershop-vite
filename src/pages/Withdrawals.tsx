import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Wallet } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export default function Withdrawals() {
  const { user, isOwner } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [barberId, setBarberId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  const { data: barbers } = useQuery({
    queryKey: ["barbers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbers")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ["withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barber_withdrawals")
        .select(`
          *,
          barbers (name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("barber_withdrawals").insert({
        barber_id: barberId,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        notes: notes || null,
        user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
      toast.success("Penarikan berhasil dicatat");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Gagal mencatat penarikan: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("barber_withdrawals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
      toast.success("Data penarikan berhasil dihapus");
    },
    onError: (error) => {
      toast.error("Gagal menghapus data: " + error.message);
    },
  });

  const resetForm = () => {
    setBarberId("");
    setAmount("");
    setPaymentMethod("cash");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barberId || !amount) {
      toast.error("Barber dan jumlah wajib diisi");
      return;
    }
    createMutation.mutate();
  };

  const totalWithdrawals = withdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;

  // Calculate pending commissions per barber
  const { data: pendingCommissions } = useQuery({
    queryKey: ["pending-commissions"],
    queryFn: async () => {
      const { data: transactionItems, error } = await supabase
        .from("transaction_items")
        .select(`
          barber_id,
          commission_amount,
          barbers (name)
        `)
        .not("barber_id", "is", null);
      if (error) throw error;
      
      // Group by barber and sum commissions
      const commissionsByBarber = transactionItems.reduce((acc: Record<string, { name: string; total: number }>, item) => {
        if (item.barber_id) {
          if (!acc[item.barber_id]) {
            acc[item.barber_id] = { 
              name: item.barbers?.name || "Unknown", 
              total: 0 
            };
          }
          acc[item.barber_id].total += Number(item.commission_amount) || 0;
        }
        return acc;
      }, {});

      return commissionsByBarber;
    },
  });

  // Calculate withdrawals per barber
  const withdrawalsByBarber = withdrawals?.reduce((acc: Record<string, number>, w) => {
    if (w.barber_id) {
      acc[w.barber_id] = (acc[w.barber_id] || 0) + Number(w.amount);
    }
    return acc;
  }, {}) || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Penarikan Barber</h1>
          <p className="text-muted-foreground">Kelola penarikan komisi/gaji barber</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Catat Penarikan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Catat Penarikan Barber</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="barber">Barber</Label>
                <Select value={barberId} onValueChange={setBarberId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih barber" />
                  </SelectTrigger>
                  <SelectContent>
                    {barbers?.map((barber) => (
                      <SelectItem key={barber.id} value={barber.id}>
                        {barber.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Jumlah (Rp)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Metode Pembayaran</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Catatan (opsional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Gaji mingguan"
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {barbers?.map((barber) => {
          const totalCommission = pendingCommissions?.[barber.id]?.total || 0;
          const totalWithdrawn = withdrawalsByBarber[barber.id] || 0;
          const remaining = totalCommission - totalWithdrawn;
          
          return (
            <div key={barber.id} className="bg-card border rounded-lg p-4 space-y-2">
              <div className="font-medium">{barber.name}</div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Komisi:</span>
                  <span>Rp {totalCommission.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sudah Ditarik:</span>
                  <span className="text-destructive">Rp {totalWithdrawn.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Sisa:</span>
                  <span className={remaining > 0 ? "text-green-600" : ""}>
                    Rp {remaining.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <span className="text-muted-foreground">Total Penarikan:</span>
          <span className="font-bold text-lg">
            Rp {totalWithdrawals.toLocaleString("id-ID")}
          </span>
        </div>
      </div>

      <div className="bg-card border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Barber</TableHead>
              <TableHead>Metode</TableHead>
              <TableHead>Jumlah</TableHead>
              <TableHead>Catatan</TableHead>
              {isOwner && <TableHead className="w-[80px]">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : withdrawals?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Belum ada penarikan tercatat
                </TableCell>
              </TableRow>
            ) : (
              withdrawals?.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                  <TableCell>
                    {format(new Date(withdrawal.created_at), "dd MMM yyyy HH:mm", { locale: localeId })}
                  </TableCell>
                  <TableCell className="font-medium">{withdrawal.barbers?.name}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      withdrawal.payment_method === 'cash' 
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    }`}>
                      {withdrawal.payment_method === 'cash' ? 'Cash' : 'Transfer'}
                    </span>
                  </TableCell>
                  <TableCell>Rp {Number(withdrawal.amount).toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-muted-foreground">{withdrawal.notes || "-"}</TableCell>
                  {isOwner && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(withdrawal.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

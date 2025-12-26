import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Banknote, Trash2, Building2, Wallet } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export default function CashRegister() {
  const { user, isOwner } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [depositDate, setDepositDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [depositType, setDepositType] = useState<"cash" | "bank">("cash");

  const { data: deposits, isLoading } = useQuery({
    queryKey: ["initial-deposits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("initial_deposits")
        .select("*")
        .order("deposit_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // Check if deposit for this date already exists
      const { data: existing } = await supabase
        .from("initial_deposits")
        .select("id")
        .eq("deposit_date", depositDate)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("initial_deposits")
          .update({
            amount: parseFloat(amount),
            notes: notes || null,
            deposit_type: depositType,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase.from("initial_deposits").insert({
          amount: parseFloat(amount),
          deposit_date: depositDate,
          notes: notes || null,
          user_id: user?.id,
          deposit_type: depositType,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initial-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["initial-deposit"] });
      toast.success("Setoran awal berhasil disimpan");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Gagal menyimpan: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("initial_deposits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initial-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["initial-deposit"] });
      toast.success("Setoran berhasil dihapus");
    },
    onError: (error) => {
      toast.error("Gagal menghapus: " + error.message);
    },
  });

  const resetForm = () => {
    setAmount("");
    setNotes("");
    setDepositDate(format(new Date(), "yyyy-MM-dd"));
    setDepositType("cash");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) < 0) {
      toast.error("Jumlah setoran tidak valid");
      return;
    }
    createMutation.mutate();
  };

  const totalDeposits = deposits?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
  const totalCash = deposits?.filter(d => d.deposit_type === 'cash').reduce((sum, d) => sum + Number(d.amount), 0) || 0;
  const totalBank = deposits?.filter(d => d.deposit_type === 'bank').reduce((sum, d) => sum + Number(d.amount), 0) || 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Setoran Awal</h1>
          <p className="text-muted-foreground">Kelola setoran kas harian</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Setoran
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Catat Setoran Awal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="depositDate">Tanggal</Label>
                <Input
                  id="depositDate"
                  type="date"
                  value={depositDate}
                  onChange={(e) => setDepositDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Jumlah Setoran (Rp)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500000"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="depositType">Tujuan Setoran</Label>
                <Select value={depositType} onValueChange={(v) => setDepositType(v as "cash" | "bank")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Kas (Cash)
                      </div>
                    </SelectItem>
                    {/* <SelectItem value="bank">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Bank
                      </div>
                    </SelectItem> */}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Catatan (opsional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan tambahan..."
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            <span className="text-muted-foreground">Total Semua Deposit:</span>
          </div>
          <span className="font-bold text-lg">{formatCurrency(totalDeposits)}</span>
        </div>
        {/* <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-green-500" />
            <span className="text-muted-foreground">Kas (Cash):</span>
          </div>
          <span className="font-bold text-lg text-green-600">{formatCurrency(totalCash)}</span>
        </div> */}
        {/* <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            <span className="text-muted-foreground">Bank:</span>
          </div>
          <span className="font-bold text-lg text-blue-600">{formatCurrency(totalBank)}</span>
        </div> */}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Setoran Awal</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Tujuan</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Catatan</TableHead>
                {isOwner && <TableHead className="w-[80px]">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : deposits?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Belum ada setoran tercatat
                  </TableCell>
                </TableRow>
              ) : (
                deposits?.map((deposit) => (
                  <TableRow key={deposit.id}>
                    <TableCell>
                      {format(new Date(deposit.deposit_date), "EEEE, dd MMMM yyyy", { locale: localeId })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {deposit.deposit_type === 'bank' ? (
                          <>
                            <Building2 className="h-4 w-4 text-blue-500" />
                            <span className="text-blue-600">Bank</span>
                          </>
                        ) : (
                          <>
                            <Wallet className="h-4 w-4 text-green-500" />
                            <span className="text-green-600">Kas</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-primary">
                      {formatCurrency(Number(deposit.amount))}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{deposit.notes || "-"}</TableCell>
                    {isOwner && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(deposit.id)}
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
        </CardContent>
      </Card>
    </div>
  );
}

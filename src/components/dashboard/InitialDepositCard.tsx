import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Banknote, Edit2 } from "lucide-react";
import { format } from "date-fns";

interface InitialDepositCardProps {
  todayRevenue: number;
}

export default function InitialDepositCard({ todayRevenue }: InitialDepositCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [amount, setAmount] = useState("");
  
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: todayDeposit } = useQuery({
    queryKey: ["initial-deposit", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("initial_deposits")
        .select("*")
        .eq("deposit_date", today)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async () => {
      if (todayDeposit) {
        // Update existing
        const { error } = await supabase
          .from("initial_deposits")
          .update({ amount: parseFloat(amount) })
          .eq("id", todayDeposit.id);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase.from("initial_deposits").insert({
          amount: parseFloat(amount),
          deposit_date: today,
          user_id: user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initial-deposit", today] });
      toast.success("Setoran awal berhasil disimpan");
      setIsDialogOpen(false);
      setAmount("");
    },
    onError: (error) => {
      toast.error("Gagal menyimpan: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) < 0) {
      toast.error("Jumlah setoran tidak valid");
      return;
    }
    createOrUpdateMutation.mutate();
  };

  const handleOpenDialog = () => {
    if (todayDeposit) {
      setAmount(todayDeposit.amount.toString());
    }
    setIsDialogOpen(true);
  };

  const initialDeposit = Number(todayDeposit?.amount) || 0;
  const currentBalance = initialDeposit + todayRevenue;
  const ratio = initialDeposit > 0 ? ((todayRevenue / initialDeposit) * 100).toFixed(1) : "0";

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Kas Hari Ini
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleOpenDialog}>
              <Edit2 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Setoran Awal Hari Ini</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deposit">Jumlah Setoran (Rp)</Label>
                <Input
                  id="deposit"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500000"
                  min="0"
                />
              </div>
              <Button type="submit" className="w-full" disabled={createOrUpdateMutation.isPending}>
                {createOrUpdateMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" />
          <span className="text-2xl font-bold">{formatCurrency(currentBalance)}</span>
        </div>
        
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Setoran Awal:</span>
            <span>{formatCurrency(initialDeposit)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pendapatan:</span>
            <span className="text-green-600">+{formatCurrency(todayRevenue)}</span>
          </div>
          <div className="flex justify-between pt-1 border-t">
            <span className="text-muted-foreground">Rasio Pertumbuhan:</span>
            <span className={Number(ratio) > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>
              {ratio}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

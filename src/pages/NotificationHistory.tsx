import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bell, Store, Wallet, ShoppingCart, Clock } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const DAILY_LIMIT = 50;

interface NotificationLog {
  id: string;
  notification_type: string;
  notification_data: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
  };
  sent_at: string;
  recipients_count: number;
}

export default function NotificationHistory() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["notification-logs", today.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_logs")
        .select("*")
        .gte("sent_at", today.toISOString())
        .order("sent_at", { ascending: false });
      
      if (error) throw error;
      return data as NotificationLog[];
    },
  });

  const usedQuota = logs?.length || 0;
  const remainingQuota = DAILY_LIMIT - usedQuota;
  const quotaPercentage = (usedQuota / DAILY_LIMIT) * 100;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "transaction":
        return <ShoppingCart className="h-4 w-4" />;
      case "withdrawal":
        return <Wallet className="h-4 w-4" />;
      case "shop_status":
        return <Store className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "transaction":
        return <Badge variant="default">Transaksi</Badge>;
      case "withdrawal":
        return <Badge variant="secondary">Penarikan</Badge>;
      case "shop_status":
        return <Badge className="bg-purple-500">Status Toko</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Riwayat Notifikasi</h1>
        <p className="text-muted-foreground">
          Notifikasi yang dikirim hari ini ({format(new Date(), "d MMMM yyyy", { locale: localeId })})
        </p>
      </div>

      {/* Quota Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Kuota Notifikasi Hari Ini
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Terpakai</span>
            <span className="text-2xl font-bold">
              {usedQuota} <span className="text-sm font-normal text-muted-foreground">/ {DAILY_LIMIT}</span>
            </span>
          </div>
          <Progress value={quotaPercentage} className="h-3" />
          <div className="flex items-center justify-between text-sm">
            <span className={remainingQuota <= 10 ? "text-destructive" : "text-muted-foreground"}>
              Sisa: {remainingQuota} notifikasi
            </span>
            <span className="text-muted-foreground">
              {quotaPercentage.toFixed(0)}% terpakai
            </span>
          </div>
          {remainingQuota <= 10 && remainingQuota > 0 && (
            <p className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded-md">
              ⚠️ Kuota hampir habis. Gunakan dengan bijak.
            </p>
          )}
          {remainingQuota === 0 && (
            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">
              ❌ Kuota habis. Notifikasi akan tersedia lagi besok.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Notification List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Riwayat Pengiriman
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Memuat...
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="p-2 rounded-full bg-primary/10 text-primary">
                    {getTypeIcon(log.notification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeBadge(log.notification_type)}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.sent_at), "HH:mm", { locale: localeId })}
                      </span>
                    </div>
                    <p className="font-medium text-sm truncate">
                      {log.notification_data?.title || "Notifikasi"}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {log.notification_data?.body || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Dikirim ke {log.recipients_count} penerima
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Belum ada notifikasi hari ini</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

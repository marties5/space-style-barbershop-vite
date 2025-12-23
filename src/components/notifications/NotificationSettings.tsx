import { usePushNotification } from '@/hooks/usePushNotification';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, Loader2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function NotificationSettings() {
  const { 
    isSupported, 
    isSubscribed, 
    permission, 
    isLoading, 
    subscribe, 
    unsubscribe 
  } = usePushNotification();

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Push Notification
          </CardTitle>
          <CardDescription>
            Browser Anda tidak mendukung push notification
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Push Notification
            </CardTitle>
            <CardDescription>
              Terima notifikasi untuk transaksi, penarikan, dan status toko
            </CardDescription>
          </div>
          <Badge variant={isSubscribed ? 'default' : 'secondary'}>
            {isSubscribed ? 'Aktif' : 'Nonaktif'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {permission === 'denied' 
              ? 'Izin notifikasi ditolak. Silakan aktifkan di pengaturan browser.'
              : 'Aktifkan notifikasi untuk mendapat pemberitahuan real-time. Maksimal 50 notifikasi per hari.'}
          </p>
          
          {isSubscribed ? (
            <Button 
              variant="outline" 
              onClick={unsubscribe}
              disabled={isLoading}
              className="w-full gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
              Nonaktifkan Notifikasi
            </Button>
          ) : (
            <Button 
              onClick={subscribe}
              disabled={isLoading || permission === 'denied'}
              className="w-full gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
              Aktifkan Notifikasi
            </Button>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Notifikasi transaksi baru</p>
            <p>• Notifikasi penarikan dana barber</p>
            <p>• Notifikasi buka/tutup toko</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

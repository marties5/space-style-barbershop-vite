import { useShopStatus } from '@/hooks/useShopStatus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, Power, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function ShopClosed() {
  const { openShop } = useShopStatus();
  const [isOpening, setIsOpening] = useState(false);

  const handleOpen = async () => {
    setIsOpening(true);
    await openShop();
    setIsOpening(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto p-4 rounded-full bg-muted">
            <Store className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Toko Sedang Tutup</CardTitle>
          <CardDescription className="text-base">
            Space Style Barbershop saat ini sedang tutup. Silakan buka toko terlebih dahulu untuk mulai melayani pelanggan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleOpen} 
            disabled={isOpening}
            size="lg" 
            className="w-full gap-2"
          >
            {isOpening ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Membuka Toko...
              </>
            ) : (
              <>
                <Power className="h-5 w-5" />
                Buka Toko Sekarang
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

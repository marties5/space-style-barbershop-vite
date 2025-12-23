import { useState } from 'react';
import { useShopStatus } from '@/hooks/useShopStatus';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Power, PowerOff, Loader2 } from 'lucide-react';

export default function ShopStatusButton() {
  const { isOpen, closeShop } = useShopStatus();
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = async () => {
    setIsClosing(true);
    await closeShop();
    setIsClosing(false);
  };

  if (!isOpen) return null;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 border-green-500/50 text-green-600 hover:bg-green-500/10"
        >
          <Power className="h-4 w-4" />
          <span className="hidden sm:inline">Toko Buka</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tutup Toko?</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menutup toko? Semua pengguna akan melihat halaman toko tutup dan tidak bisa melakukan transaksi.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleClose}
            disabled={isClosing}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isClosing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Menutup...
              </>
            ) : (
              <>
                <PowerOff className="h-4 w-4 mr-2" />
                Tutup Toko
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

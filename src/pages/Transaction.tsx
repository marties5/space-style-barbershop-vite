import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Scissors, Package, User, Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Item {
  id: string;
  name: string;
  type: string;
  price: number;
  stock: number | null;
}

interface Barber {
  id: string;
  name: string;
  photo_url: string | null;
  commission_service: number;
  commission_product: number;
}

interface CartItem {
  item: Item;
  barber?: Barber;
  quantity: number;
}

export default function Transaction() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [barberModalOpen, setBarberModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [itemsRes, barbersRes] = await Promise.all([
      supabase.from('items').select('*').eq('is_active', true),
      supabase.from('barbers').select('*').eq('is_active', true)
    ]);
    
    if (itemsRes.data) setItems(itemsRes.data);
    if (barbersRes.data) setBarbers(barbersRes.data);
  };

  const services = items.filter(i => i.type === 'service');
  const products = items.filter(i => i.type === 'product');

  const handleItemClick = (item: Item) => {
    if (item.type === 'service') {
      setSelectedItem(item);
      setBarberModalOpen(true);
    } else {
      // For products, add directly to cart
      addToCart(item);
    }
  };

  const handleBarberSelect = (barber: Barber) => {
    if (selectedItem) {
      addToCart(selectedItem, barber);
      setBarberModalOpen(false);
      setSelectedItem(null);
    }
  };

  const addToCart = (item: Item, barber?: Barber) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(
        c => c.item.id === item.id && c.barber?.id === barber?.id
      );
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity++;
        return updated;
      }
      
      return [...prev, { item, barber, quantity: 1 }];
    });
    toast.success(`${item.name} ditambahkan`);
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const updated = [...prev];
      updated[index].quantity += delta;
      if (updated[index].quantity <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const total = cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Keranjang kosong');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create transaction
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: user?.id,
          total_amount: total,
          payment_status: 'completed'
        })
        .select()
        .single();

      if (txError) throw txError;

      // Create transaction items
      const transactionItems = cart.map(c => {
        const commissionRate = c.item.type === 'service' 
          ? c.barber?.commission_service || 0 
          : c.barber?.commission_product || 0;
        const subtotal = c.item.price * c.quantity;
        const commissionAmount = (subtotal * commissionRate) / 100;

        return {
          transaction_id: transaction.id,
          item_id: c.item.id,
          barber_id: c.barber?.id || null,
          item_name: c.item.name,
          item_type: c.item.type,
          quantity: c.quantity,
          unit_price: c.item.price,
          subtotal,
          commission_rate: commissionRate,
          commission_amount: commissionAmount
        };
      });

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(transactionItems);

      if (itemsError) throw itemsError;

      toast.success(`Transaksi berhasil! Total: ${formatCurrency(total)}`);
      setCart([]);
      fetchData(); // Refresh stock
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan transaksi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Transaksi Baru</h1>
        <p className="text-muted-foreground">Pilih layanan atau produk untuk ditambahkan</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items Grid */}
        <div className="lg:col-span-2 space-y-6">
          {/* Layanan Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Scissors className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Layanan</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {services.map(item => (
                <Card 
                  key={item.id}
                  className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]"
                  onClick={() => handleItemClick(item)}
                >
                  <CardContent className="p-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-primary/10">
                      <Scissors className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-medium truncate">{item.name}</h3>
                    <p className="text-lg font-bold text-primary mt-1">
                      {formatCurrency(item.price)}
                    </p>
                  </CardContent>
                </Card>
              ))}
              {services.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  Belum ada layanan
                </div>
              )}
            </div>
          </div>

          {/* Produk Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-accent-foreground" />
              <h2 className="font-semibold text-lg">Produk</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {products.map(item => (
                <Card 
                  key={item.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]",
                    (item.stock || 0) <= 0 && "opacity-50 pointer-events-none"
                  )}
                  onClick={() => handleItemClick(item)}
                >
                  <CardContent className="p-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-accent">
                      <Package className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <h3 className="font-medium truncate">{item.name}</h3>
                    <p className="text-lg font-bold text-primary mt-1">
                      {formatCurrency(item.price)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Stok: {item.stock || 0}
                    </p>
                  </CardContent>
                </Card>
              ))}
              {products.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  Belum ada produk
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cart */}
        <Card className="h-fit sticky top-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Keranjang
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Keranjang kosong
              </p>
            ) : (
              <>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {cart.map((c, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{c.item.name}</p>
                        {c.barber && (
                          <p className="text-xs text-muted-foreground">
                            Barber: {c.barber.name}
                          </p>
                        )}
                        <p className="text-sm font-medium text-primary mt-1">
                          {formatCurrency(c.item.price * c.quantity)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(index, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{c.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(index, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeFromCart(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-medium">Total</span>
                    <span className="text-xl font-bold text-primary">
                      {formatCurrency(total)}
                    </span>
                  </div>
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleCheckout}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Memproses...' : 'Checkout'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Barber Selection Modal */}
      <Dialog open={barberModalOpen} onOpenChange={setBarberModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pilih Barber untuk {selectedItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {barbers.map(barber => (
              <Card
                key={barber.id}
                className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] hover:ring-2 hover:ring-primary"
                onClick={() => handleBarberSelect(barber)}
              >
                <CardContent className="p-4 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center overflow-hidden mb-3">
                    {barber.photo_url ? (
                      <img 
                        src={barber.photo_url} 
                        alt={barber.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <p className="font-medium">{barber.name}</p>
                </CardContent>
              </Card>
            ))}

            {barbers.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Belum ada barber. Silakan tambah barber terlebih dahulu.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

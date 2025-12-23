import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Scissors, Package, User, Trash2, Plus, Minus, ShoppingCart, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface Item {
  id: string;
  name: string;
  type: string;
  price: number;
  stock: number | null;
  image_url: string | null;
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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'transfer'>('cash');
  

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
          payment_status: 'completed',
          payment_method: paymentMethod
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

      toast.success(`Transaksi berhasil! Total: ${formatCurrency(total)} (${paymentMethod.toUpperCase()})`);
      setCart([]);
      setPaymentMethod('cash');
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
                  className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] overflow-hidden"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Scissors className="h-12 w-12 text-primary/40" />
                    )}
                  </div>
                  <CardContent className="p-4">
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
                    "cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] overflow-hidden",
                    (item.stock || 0) <= 0 && "opacity-50 pointer-events-none"
                  )}
                  onClick={() => handleItemClick(item)}
                >
                  <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden relative">
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="h-12 w-12 text-accent-foreground/40" />
                    )}
                    <span className="absolute top-2 right-2 bg-background/90 text-xs font-medium px-2 py-1 rounded-full">
                      Stok: {item.stock || 0}
                    </span>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium truncate">{item.name}</h3>
                    <p className="text-lg font-bold text-primary mt-1">
                      {formatCurrency(item.price)}
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
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {cart.map((c, index) => (
                    <div key={index} className="p-4 bg-muted/50 rounded-xl border border-border space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-semibold truncate">{c.item.name}</p>
                          {c.barber && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Barber: {c.barber.name}
                            </p>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-10 w-10 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                          onClick={() => removeFromCart(index)}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center bg-background rounded-lg border-2 border-border shadow-sm overflow-hidden">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-11 w-11 rounded-none border-r border-border text-lg font-bold hover:bg-destructive/10 hover:text-destructive transition-colors"
                            onClick={() => updateQuantity(index, -1)}
                          >
                            <Minus className="h-5 w-5" />
                          </Button>
                          <span className="w-14 text-center font-bold text-lg">{c.quantity}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-11 w-11 rounded-none border-l border-border text-lg font-bold hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => updateQuantity(index, 1)}
                          >
                            <Plus className="h-5 w-5" />
                          </Button>
                        </div>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(c.item.price * c.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-4">
                  {/* Payment Method Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Metode Pembayaran</Label>
                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={(value) => setPaymentMethod(value as 'cash' | 'qris' | 'transfer')}
                      className="grid grid-cols-3 gap-2"
                    >
                      <div>
                        <RadioGroupItem value="cash" id="cash" className="peer sr-only" />
                        <Label
                          htmlFor="cash"
                          className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 cursor-pointer transition-colors"
                        >
                          <Banknote className="h-5 w-5 mb-1" />
                          <span className="text-xs font-medium">Cash</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="qris" id="qris" className="peer sr-only" />
                        <Label
                          htmlFor="qris"
                          className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 cursor-pointer transition-colors"
                        >
                          <Smartphone className="h-5 w-5 mb-1" />
                          <span className="text-xs font-medium">QRIS</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="transfer" id="transfer" className="peer sr-only" />
                        <Label
                          htmlFor="transfer"
                          className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 cursor-pointer transition-colors"
                        >
                          <CreditCard className="h-5 w-5 mb-1" />
                          <span className="text-xs font-medium">Transfer</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="flex justify-between items-center">
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

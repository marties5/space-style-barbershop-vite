import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, Package } from 'lucide-react';
import { productSchema, validateForm } from '@/lib/validations';

interface Product {
  id: string;
  name: string;
  price: number;
  cost_price: number | null;
  stock: number | null;
  is_active: boolean;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({ 
    name: '', 
    price: 0, 
    cost_price: 0, 
    stock: 0 
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('type', 'product')
      .order('name');
    
    if (data) setProducts(data);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ name: '', price: 0, cost_price: 0, stock: 0 });
    setEditingProduct(null);
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ 
        name: product.name, 
        price: product.price, 
        cost_price: product.cost_price || 0,
        stock: product.stock || 0
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validation = validateForm(productSchema, formData);
    if (!validation.success) {
      toast.error((validation as { success: false; error: string }).error);
      return;
    }
    
    const validatedData = (validation as { success: true; data: typeof formData }).data;
    setIsLoading(true);

    try {
      
      if (editingProduct) {
        const { error } = await supabase
          .from('items')
          .update({ 
            name: validatedData.name, 
            price: validatedData.price,
            cost_price: validatedData.cost_price,
            stock: validatedData.stock
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success('Produk berhasil diupdate');
      } else {
        const { error } = await supabase
          .from('items')
          .insert({ 
            name: validatedData.name, 
            price: validatedData.price, 
            cost_price: validatedData.cost_price,
            stock: validatedData.stock,
            type: 'product' 
          });

        if (error) throw error;
        toast.success('Produk berhasil ditambahkan');
      }

      setDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus produk ini?')) return;

    const { error } = await supabase.from('items').delete().eq('id', id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Produk berhasil dihapus');
      fetchProducts();
    }
  };

  const toggleActive = async (product: Product) => {
    const { error } = await supabase
      .from('items')
      .update({ is_active: !product.is_active })
      .eq('id', product.id);

    if (!error) fetchProducts();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produk</h1>
          <p className="text-muted-foreground">Kelola inventaris produk</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Produk
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Produk</TableHead>
                <TableHead>Harga Jual</TableHead>
                <TableHead>HPP</TableHead>
                <TableHead>Stok</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map(product => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                        <Package className="h-4 w-4 text-accent-foreground" />
                      </div>
                      <span className="font-medium">{product.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-primary">
                    {formatCurrency(product.price)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatCurrency(product.cost_price || 0)}
                  </TableCell>
                  <TableCell>
                    <span className={`font-medium ${(product.stock || 0) <= 5 ? 'text-destructive' : ''}`}>
                      {product.stock || 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleActive(product)}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.is_active 
                          ? 'bg-success/10 text-success' 
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {product.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleOpenDialog(product)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'Tidak ada produk ditemukan' : 'Belum ada produk'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Produk' : 'Tambah Produk'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Produk</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Harga Jual (Rp)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost_price">HPP (Rp)</Label>
                <Input
                  id="cost_price"
                  type="number"
                  min="0"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Stok</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

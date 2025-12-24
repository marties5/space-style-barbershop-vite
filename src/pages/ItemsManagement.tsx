import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, Scissors, Package, Upload, X } from 'lucide-react';
import { serviceSchema, productSchema, validateForm } from '@/lib/validations';
import TopItemsChart from '@/components/items/TopItemsChart';

interface Item {
  id: string;
  name: string;
  price: number;
  cost_price: number | null;
  stock: number | null;
  is_active: boolean;
  type: string;
  image_url: string | null;
}

export default function ItemsManagement() {
  const [services, setServices] = useState<Item[]>([]);
  const [products, setProducts] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'service' | 'product'>('service');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({ 
    name: '', 
    price: 0, 
    cost_price: 0, 
    stock: 0 
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .order('name');
    
    if (data) {
      setServices(data.filter(i => i.type === 'service'));
      setProducts(data.filter(i => i.type === 'product'));
    }
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ name: '', price: 0, cost_price: 0, stock: 0 });
    setEditingItem(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleOpenDialog = (type: 'service' | 'product', item?: Item) => {
    setDialogType(type);
    if (item) {
      setEditingItem(item);
      setFormData({ 
        name: item.name, 
        price: item.price, 
        cost_price: item.cost_price || 0,
        stock: item.stock || 0
      });
      setImagePreview(item.image_url);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 2MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (itemId: string): Promise<string | null> => {
    if (!imageFile) return editingItem?.image_url || null;
    
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${itemId}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, imageFile, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const schema = dialogType === 'service' ? serviceSchema : productSchema;
    const validation = validateForm(schema, formData);
    if (!validation.success) {
      toast.error((validation as { success: false; error: string }).error);
      return;
    }
    
    const validatedData = (validation as { success: true; data: typeof formData }).data;
    setIsLoading(true);

    try {
      if (editingItem) {
        let imageUrl = editingItem.image_url;
        if (imageFile) {
          imageUrl = await uploadImage(editingItem.id);
        }

        const updateData: any = { 
          name: validatedData.name, 
          price: validatedData.price,
          image_url: imageUrl
        };

        if (dialogType === 'product') {
          updateData.cost_price = validatedData.cost_price;
          updateData.stock = validatedData.stock;
        }

        const { error } = await supabase
          .from('items')
          .update(updateData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success(`${dialogType === 'service' ? 'Layanan' : 'Produk'} berhasil diupdate`);
      } else {
        const insertData: any = { 
          name: validatedData.name, 
          price: validatedData.price, 
          type: dialogType 
        };

        if (dialogType === 'product') {
          insertData.cost_price = validatedData.cost_price;
          insertData.stock = validatedData.stock;
        }

        const { data: newItem, error } = await supabase
          .from('items')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;

        if (imageFile && newItem) {
          const imageUrl = await uploadImage(newItem.id);
          if (imageUrl) {
            await supabase
              .from('items')
              .update({ image_url: imageUrl })
              .eq('id', newItem.id);
          }
        }

        toast.success(`${dialogType === 'service' ? 'Layanan' : 'Produk'} berhasil ditambahkan`);
      }

      setDialogOpen(false);
      resetForm();
      fetchItems();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (item: Item) => {
    if (!confirm(`Yakin ingin menghapus ${item.type === 'service' ? 'layanan' : 'produk'} ini?`)) return;

    const { error } = await supabase.from('items').delete().eq('id', item.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${item.type === 'service' ? 'Layanan' : 'Produk'} berhasil dihapus`);
      fetchItems();
    }
  };

  const toggleActive = async (item: Item) => {
    const { error } = await supabase
      .from('items')
      .update({ is_active: !item.is_active })
      .eq('id', item.id);

    if (!error) fetchItems();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Layanan & Produk</h1>
        <p className="text-muted-foreground">Kelola layanan dan produk barbershop</p>
      </div>

      {/* Top Items Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <TopItemsChart type="service" />
        <TopItemsChart type="product" />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari layanan atau produk..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Services Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Layanan
          </CardTitle>
          <Button onClick={() => handleOpenDialog('service')} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Layanan
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Layanan</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.map(service => (
                <TableRow key={service.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {service.image_url ? (
                        <img 
                          src={service.image_url} 
                          alt={service.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Scissors className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <span className="font-medium">{service.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-primary">
                    {formatCurrency(service.price)}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleActive(service)}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        service.is_active 
                          ? 'bg-green-500/10 text-green-600' 
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {service.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleOpenDialog('service', service)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(service)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredServices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'Tidak ada layanan ditemukan' : 'Belum ada layanan'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Products Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produk
          </CardTitle>
          <Button onClick={() => handleOpenDialog('product')} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Produk
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
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
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                          <Package className="h-5 w-5 text-accent-foreground" />
                        </div>
                      )}
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
                          ? 'bg-green-500/10 text-green-600' 
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {product.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleOpenDialog('product', product)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(product)}>
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

      {/* Dialog Form */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem 
                ? `Edit ${dialogType === 'service' ? 'Layanan' : 'Produk'}` 
                : `Tambah ${dialogType === 'service' ? 'Layanan' : 'Produk'}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Gambar {dialogType === 'service' ? 'Layanan' : 'Produk'}</Label>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
                  >
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">Upload</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <div className="text-sm text-muted-foreground">
                  <p>Format: JPG, PNG</p>
                  <p>Maks: 2MB</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nama {dialogType === 'service' ? 'Layanan' : 'Produk'}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {dialogType === 'product' ? (
              <>
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
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="price">Harga (Rp)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  required
                />
              </div>
            )}

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

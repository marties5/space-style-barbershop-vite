import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, Scissors } from 'lucide-react';
import { serviceSchema, validateForm } from '@/lib/validations';

interface Service {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
}

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({ name: '', price: 0 });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('type', 'service')
      .order('name');
    
    if (data) setServices(data);
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ name: '', price: 0 });
    setEditingService(null);
  };

  const handleOpenDialog = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({ name: service.name, price: service.price });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validation = validateForm(serviceSchema, formData);
    if (!validation.success) {
      toast.error((validation as { success: false; error: string }).error);
      return;
    }
    
    const validatedData = (validation as { success: true; data: typeof formData }).data;
    setIsLoading(true);

    try {
      
      if (editingService) {
        const { error } = await supabase
          .from('items')
          .update({ name: validatedData.name, price: validatedData.price })
          .eq('id', editingService.id);

        if (error) throw error;
        toast.success('Layanan berhasil diupdate');
      } else {
        const { error } = await supabase
          .from('items')
          .insert({ name: validatedData.name, price: validatedData.price, type: 'service' });

        if (error) throw error;
        toast.success('Layanan berhasil ditambahkan');
      }

      setDialogOpen(false);
      resetForm();
      fetchServices();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus layanan ini?')) return;

    const { error } = await supabase.from('items').delete().eq('id', id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Layanan berhasil dihapus');
      fetchServices();
    }
  };

  const toggleActive = async (service: Service) => {
    const { error } = await supabase
      .from('items')
      .update({ is_active: !service.is_active })
      .eq('id', service.id);

    if (!error) fetchServices();
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
          <h1 className="text-2xl font-bold">Layanan</h1>
          <p className="text-muted-foreground">Kelola daftar layanan barbershop</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Layanan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari layanan..."
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
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Scissors className="h-4 w-4 text-primary" />
                      </div>
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
                          ? 'bg-success/10 text-success' 
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {service.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleOpenDialog(service)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(service.id)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit Layanan' : 'Tambah Layanan'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Layanan</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
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

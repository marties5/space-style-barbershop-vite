import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, User, Search } from 'lucide-react';

interface Barber {
  id: string;
  name: string;
  photo_url: string | null;
  specialization: string | null;
  commission_service: number;
  commission_product: number;
  is_active: boolean;
}

export default function Barbers() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    photo_url: '',
    specialization: '',
    commission_service: 40,
    commission_product: 10
  });

  useEffect(() => {
    fetchBarbers();
  }, []);

  const fetchBarbers = async () => {
    const { data, error } = await supabase
      .from('barbers')
      .select('*')
      .order('name');
    
    if (data) setBarbers(data);
  };

  const filteredBarbers = barbers.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: '',
      photo_url: '',
      specialization: '',
      commission_service: 40,
      commission_product: 10
    });
    setEditingBarber(null);
  };

  const handleOpenDialog = (barber?: Barber) => {
    if (barber) {
      setEditingBarber(barber);
      setFormData({
        name: barber.name,
        photo_url: barber.photo_url || '',
        specialization: barber.specialization || '',
        commission_service: barber.commission_service,
        commission_product: barber.commission_product
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingBarber) {
        const { error } = await supabase
          .from('barbers')
          .update({
            name: formData.name,
            photo_url: formData.photo_url || null,
            specialization: formData.specialization || null,
            commission_service: formData.commission_service,
            commission_product: formData.commission_product
          })
          .eq('id', editingBarber.id);

        if (error) throw error;
        toast.success('Barber berhasil diupdate');
      } else {
        const { error } = await supabase
          .from('barbers')
          .insert({
            name: formData.name,
            photo_url: formData.photo_url || null,
            specialization: formData.specialization || null,
            commission_service: formData.commission_service,
            commission_product: formData.commission_product
          });

        if (error) throw error;
        toast.success('Barber berhasil ditambahkan');
      }

      setDialogOpen(false);
      resetForm();
      fetchBarbers();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus barber ini?')) return;

    const { error } = await supabase
      .from('barbers')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Barber berhasil dihapus');
      fetchBarbers();
    }
  };

  const toggleActive = async (barber: Barber) => {
    const { error } = await supabase
      .from('barbers')
      .update({ is_active: !barber.is_active })
      .eq('id', barber.id);

    if (error) {
      toast.error(error.message);
    } else {
      fetchBarbers();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Barber</h1>
          <p className="text-muted-foreground">Kelola data barber</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Barber
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari barber..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Foto</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Spesialisasi</TableHead>
                <TableHead>Komisi Jasa (%)</TableHead>
                <TableHead>Komisi Produk (%)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBarbers.map(barber => (
                <TableRow key={barber.id}>
                  <TableCell>
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {barber.photo_url ? (
                        <img src={barber.photo_url} alt={barber.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{barber.name}</TableCell>
                  <TableCell>{barber.specialization || '-'}</TableCell>
                  <TableCell>{barber.commission_service}%</TableCell>
                  <TableCell>{barber.commission_product}%</TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleActive(barber)}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        barber.is_active 
                          ? 'bg-success/10 text-success' 
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {barber.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleOpenDialog(barber)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(barber.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredBarbers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'Tidak ada barber ditemukan' : 'Belum ada data barber'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBarber ? 'Edit Barber' : 'Tambah Barber'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="photo_url">URL Foto (opsional)</Label>
              <Input
                id="photo_url"
                value={formData.photo_url}
                onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialization">Spesialisasi (opsional)</Label>
              <Input
                id="specialization"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="commission_service">Komisi Jasa (%)</Label>
                <Input
                  id="commission_service"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.commission_service}
                  onChange={(e) => setFormData({ ...formData, commission_service: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission_product">Komisi Produk (%)</Label>
                <Input
                  id="commission_product"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.commission_product}
                  onChange={(e) => setFormData({ ...formData, commission_product: Number(e.target.value) })}
                />
              </div>
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

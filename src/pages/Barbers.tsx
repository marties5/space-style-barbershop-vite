import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, User, Search, Upload, X } from 'lucide-react';
import { barberSchema, validateForm } from '@/lib/validations';

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    specialization: '',
    commission_service: 0,
    commission_product: 0
  });

  useEffect(() => {
    fetchBarbers();
  }, []);

  const fetchBarbers = async () => {
    const { data } = await supabase
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
      specialization: '',
      commission_service: 40,
      commission_product: 10
    });
    setEditingBarber(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleOpenDialog = (barber?: Barber) => {
    if (barber) {
      setEditingBarber(barber);
      setFormData({
        name: barber.name,
        specialization: barber.specialization || '',
        commission_service: barber.commission_service,
        commission_product: barber.commission_product
      });
      setImagePreview(barber.photo_url);
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

  const uploadImage = async (barberId: string): Promise<string | null> => {
    if (!imageFile) return editingBarber?.photo_url || null;
    
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${barberId}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('barber-photos')
      .upload(filePath, imageFile, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('barber-photos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateForm(barberSchema, formData);
    if (!validation.success) {
      toast.error((validation as { success: false; error: string }).error);
      return;
    }
    
    const validatedData = (validation as { success: true; data: typeof formData }).data;
    setIsLoading(true);

    try {
      if (editingBarber) {
        let photoUrl = editingBarber.photo_url;
        if (imageFile) {
          photoUrl = await uploadImage(editingBarber.id);
        }

        const { error } = await supabase
          .from('barbers')
          .update({
            name: validatedData.name,
            photo_url: photoUrl,
            specialization: validatedData.specialization || null,
            commission_service: validatedData.commission_service,
            commission_product: validatedData.commission_product
          })
          .eq('id', editingBarber.id);

        if (error) throw error;
        toast.success('Barber berhasil diupdate');
      } else {
        const { data: newBarber, error } = await supabase
          .from('barbers')
          .insert({
            name: validatedData.name,
            specialization: validatedData.specialization || null,
            commission_service: validatedData.commission_service,
            commission_product: validatedData.commission_product
          })
          .select()
          .single();

        if (error) throw error;

        if (imageFile && newBarber) {
          const photoUrl = await uploadImage(newBarber.id);
          if (photoUrl) {
            await supabase
              .from('barbers')
              .update({ photo_url: photoUrl })
              .eq('id', newBarber.id);
          }
        }

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

    if (!error) fetchBarbers();
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
                {/* <TableHead>Komisi Jasa (%)</TableHead>
                <TableHead>Komisi Produk (%)</TableHead> */}
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
                  {/* <TableCell>{barber.commission_service}%</TableCell>
                  <TableCell>{barber.commission_product}%</TableCell> */}
                  <TableCell>
                    <button
                      onClick={() => toggleActive(barber)}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        barber.is_active 
                          ? 'bg-green-500/10 text-green-600' 
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
            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Foto Barber</Label>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-20 h-20 rounded-full object-cover"
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
                    className="w-20 h-20 rounded-full border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
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
              <Label htmlFor="name">Nama</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
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
            <div className=" grid-cols-2 gap-4 hidden">
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

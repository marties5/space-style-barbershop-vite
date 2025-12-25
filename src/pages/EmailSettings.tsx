import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEmailSettings, EmailSettings } from '@/hooks/useEmailSettings';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Server, Send, Settings, Loader2, X, Plus, Eye, EyeOff, History, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface EmailLog {
  id: string;
  email_type: string;
  recipient_email: string;
  subject: string;
  status: string;
  error_message: string | null;
  sent_at: string;
}

export default function EmailSettingsPage() {
  const { settings, isLoading, updateSettings, sendTestEmail } = useEmailSettings();
  const [formData, setFormData] = useState<Partial<EmailSettings>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const fetchEmailLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEmailLogs(data || []);
    } catch (error) {
      console.error('Error fetching email logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchEmailLogs();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    await updateSettings(formData);
    setIsSaving(false);
  };

  const handleTestEmail = async () => {
    setIsTesting(true);
    await sendTestEmail();
    setIsTesting(false);
    // Refresh logs after test
    setTimeout(fetchEmailLogs, 1000);
  };

  const addRecipientEmail = () => {
    if (!newEmail || !newEmail.includes('@')) return;
    const emails = formData.recipient_emails || [];
    if (!emails.includes(newEmail)) {
      setFormData(prev => ({
        ...prev,
        recipient_emails: [...emails, newEmail]
      }));
      setNewEmail('');
    }
  };

  const removeRecipientEmail = (email: string) => {
    setFormData(prev => ({
      ...prev,
      recipient_emails: (prev.recipient_emails || []).filter(e => e !== email)
    }));
  };

  const getEmailTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      shop_open: 'Buka Toko',
      shop_close: 'Tutup Toko',
      transaction: 'Transaksi',
      withdrawal: 'Penarikan',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan Email</h1>
        <p className="text-muted-foreground">
          Konfigurasi SMTP untuk notifikasi email otomatis
        </p>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Pengaturan
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <History className="h-4 w-4" />
            Log Email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Status Notifikasi Email</CardTitle>
                    <CardDescription>Aktifkan/nonaktifkan notifikasi email</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={formData.is_active || false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            </CardHeader>
          </Card>

          {/* SMTP Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Konfigurasi SMTP</CardTitle>
                  <CardDescription>Pengaturan server email SMTP</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">SMTP Host</Label>
                  <Input
                    id="smtp_host"
                    placeholder="smtp.gmail.com"
                    value={formData.smtp_host || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, smtp_host: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_port">SMTP Port</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    placeholder="587"
                    value={formData.smtp_port || 587}
                    onChange={(e) => setFormData(prev => ({ ...prev, smtp_port: parseInt(e.target.value) || 587 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_user">Username SMTP</Label>
                  <Input
                    id="smtp_user"
                    placeholder="email@domain.com"
                    value={formData.smtp_user || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, smtp_user: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_password">Password SMTP</Label>
                  <div className="relative">
                    <Input
                      id="smtp_password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.smtp_password || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, smtp_password: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_from_email">Email Pengirim</Label>
                  <Input
                    id="smtp_from_email"
                    placeholder="noreply@domain.com"
                    value={formData.smtp_from_email || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, smtp_from_email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_from_name">Nama Pengirim</Label>
                  <Input
                    id="smtp_from_name"
                    placeholder="Barbershop POS"
                    value={formData.smtp_from_name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, smtp_from_name: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recipient Emails */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Send className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Email Penerima</CardTitle>
                  <CardDescription>Daftar email yang akan menerima notifikasi</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Tambah email penerima..."
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addRecipientEmail()}
                />
                <Button onClick={addRecipientEmail} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {(formData.recipient_emails || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada email penerima</p>
                ) : (
                  (formData.recipient_emails || []).map((email) => (
                    <Badge key={email} variant="secondary" className="gap-1 py-1.5">
                      {email}
                      <button
                        onClick={() => removeRecipientEmail(email)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notification Types */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Jenis Notifikasi</CardTitle>
                  <CardDescription>Pilih notifikasi yang ingin dikirim</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Buka Toko</p>
                  <p className="text-sm text-muted-foreground">Kirim email saat toko dibuka</p>
                </div>
                <Switch
                  checked={formData.notify_shop_open || false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notify_shop_open: checked }))}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Tutup Toko</p>
                  <p className="text-sm text-muted-foreground">Kirim email saat toko ditutup</p>
                </div>
                <Switch
                  checked={formData.notify_shop_close || false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notify_shop_close: checked }))}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Transaksi Baru</p>
                  <p className="text-sm text-muted-foreground">Kirim email setiap ada transaksi</p>
                </div>
                <Switch
                  checked={formData.notify_transaction || false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notify_transaction: checked }))}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Penarikan Dana</p>
                  <p className="text-sm text-muted-foreground">Kirim email saat barber menarik dana</p>
                </div>
                <Switch
                  checked={formData.notify_withdrawal || false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notify_withdrawal: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Pengaturan'
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleTestEmail} 
              disabled={isTesting || !formData.is_active}
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Test Email
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Log Email Terkirim</CardTitle>
                    <CardDescription>Riwayat pengiriman email notifikasi</CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={fetchEmailLogs} disabled={isLoadingLogs}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingLogs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : emailLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Belum ada log email</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Waktu</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead>Penerima</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(log.sent_at), 'dd MMM yyyy HH:mm', { locale: id })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getEmailTypeLabel(log.email_type)}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {log.recipient_email}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {log.subject}
                          </TableCell>
                          <TableCell>
                            {log.status === 'success' ? (
                              <Badge className="gap-1 bg-green-100 text-green-700 hover:bg-green-100">
                                <CheckCircle2 className="h-3 w-3" />
                                Sukses
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                Gagal
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-destructive">
                            {log.error_message || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

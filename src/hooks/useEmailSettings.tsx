import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmailSettings {
  id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
  recipient_emails: string[];
  notify_shop_open: boolean;
  notify_shop_close: boolean;
  notify_transaction: boolean;
  notify_withdrawal: boolean;
  is_active: boolean;
}

export function useEmailSettings() {
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('email_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching email settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<EmailSettings>) => {
    if (!settings?.id) return;

    try {
      const { error } = await supabase
        .from('email_settings')
        .update(newSettings)
        .eq('id', settings.id);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
      toast.success('Pengaturan email berhasil disimpan');
      return true;
    } catch (error) {
      console.error('Error updating email settings:', error);
      toast.error('Gagal menyimpan pengaturan email');
      return false;
    }
  };

  const sendTestEmail = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('send-email-notification', {
        body: {
          type: 'shop_open',
          data: { userName: 'Test User' }
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Email test berhasil dikirim');
      } else {
        toast.error(data.message || 'Gagal mengirim email test');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Gagal mengirim email test');
    }
  };

  return {
    settings,
    isLoading,
    updateSettings,
    sendTestEmail,
    refetch: fetchSettings
  };
}

export async function sendEmailNotification(
  type: 'shop_open' | 'shop_close' | 'transaction' | 'withdrawal' | 'daily_report',
  data: Record<string, unknown>
) {
  try {
    await supabase.functions.invoke('send-email-notification', {
      body: { type, data }
    });
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
}

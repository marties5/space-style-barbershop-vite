import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: "shop_open" | "shop_close" | "transaction" | "withdrawal";
  data: Record<string, unknown>;
}

const getEmailTemplate = (type: string, data: Record<string, unknown>) => {
  const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  
  switch (type) {
    case "shop_open":
      return {
        subject: "🟢 Toko Dibuka",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
            <h2 style="color: #22c55e;">Toko Telah Dibuka</h2>
            <p><strong>Waktu:</strong> ${timestamp}</p>
            <p><strong>Dibuka oleh:</strong> ${data.userName || "Unknown"}</p>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">Notifikasi otomatis dari Barbershop POS</p>
          </div>
        `,
      };
    case "shop_close":
      return {
        subject: "🔴 Toko Ditutup",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
            <h2 style="color: #ef4444;">Toko Telah Ditutup</h2>
            <p><strong>Waktu:</strong> ${timestamp}</p>
            <p><strong>Ditutup oleh:</strong> ${data.userName || "Unknown"}</p>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">Notifikasi otomatis dari Barbershop POS</p>
          </div>
        `,
      };
    case "transaction":
      return {
        subject: "💰 Transaksi Baru",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
            <h2 style="color: #3b82f6;">Transaksi Baru</h2>
            <p><strong>Waktu:</strong> ${timestamp}</p>
            <p><strong>Total:</strong> Rp ${Number(data.total || 0).toLocaleString("id-ID")}</p>
            <p><strong>Metode Pembayaran:</strong> ${data.paymentMethod === "cash" ? "Tunai" : "QRIS"}</p>
            ${data.discount ? `<p><strong>Diskon:</strong> Rp ${Number(data.discount || 0).toLocaleString("id-ID")}</p>` : ""}
            <p><strong>Jumlah Item:</strong> ${data.itemCount || 0}</p>
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">Notifikasi otomatis dari Barbershop POS</p>
          </div>
        `,
      };
    case "withdrawal":
      return {
        subject: "💸 Penarikan Dana Barber",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
            <h2 style="color: #f59e0b;">Penarikan Dana</h2>
            <p><strong>Waktu:</strong> ${timestamp}</p>
            <p><strong>Barber:</strong> ${data.barberName || "Unknown"}</p>
            <p><strong>Jumlah:</strong> Rp ${Number(data.amount || 0).toLocaleString("id-ID")}</p>
            <p><strong>Metode:</strong> ${data.paymentMethod === "cash" ? "Tunai" : "Transfer"}</p>
            ${data.notes ? `<p><strong>Catatan:</strong> ${data.notes}</p>` : ""}
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #6b7280; font-size: 12px;">Notifikasi otomatis dari Barbershop POS</p>
          </div>
        `,
      };
    default:
      return { subject: "Notifikasi", html: "<p>Notifikasi baru</p>" };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, data }: EmailRequest = await req.json();
    console.log(`Processing email notification: ${type}`, data);

    // Fetch email settings
    const { data: settings, error: settingsError } = await supabase
      .from("email_settings")
      .select("*")
      .limit(1)
      .single();

    if (settingsError || !settings) {
      console.log("No email settings found or error:", settingsError);
      return new Response(
        JSON.stringify({ success: false, message: "Email settings not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if notifications are active and this type is enabled
    if (!settings.is_active) {
      console.log("Email notifications are disabled");
      return new Response(
        JSON.stringify({ success: false, message: "Email notifications disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typeCheckMap: Record<string, boolean> = {
      shop_open: settings.notify_shop_open,
      shop_close: settings.notify_shop_close,
      transaction: settings.notify_transaction,
      withdrawal: settings.notify_withdrawal,
    };

    if (!typeCheckMap[type]) {
      console.log(`Notification type ${type} is disabled`);
      return new Response(
        JSON.stringify({ success: false, message: `${type} notifications disabled` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!settings.recipient_emails || settings.recipient_emails.length === 0) {
      console.log("No recipient emails configured");
      return new Response(
        JSON.stringify({ success: false, message: "No recipient emails" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: settings.smtp_host,
        port: settings.smtp_port,
        tls: true,
        auth: {
          username: settings.smtp_user,
          password: settings.smtp_password,
        },
      },
    });

    const template = getEmailTemplate(type, data);

    // Send to all recipients
    const sendPromises = settings.recipient_emails.map(async (email: string) => {
      try {
        await client.send({
          from: `${settings.smtp_from_name} <${settings.smtp_from_email}>`,
          to: email,
          subject: template.subject,
          content: "auto",
          html: template.html,
        });
        console.log(`Email sent to ${email}`);
        return { email, success: true };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to send email to ${email}:`, error);
        return { email, success: false, error: errorMessage };
      }
    });

    const results = await Promise.all(sendPromises);
    await client.close();

    console.log("Email send results:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in send-email-notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

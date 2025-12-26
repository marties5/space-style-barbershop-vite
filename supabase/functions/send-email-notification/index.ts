import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Professional email base template
const getEmailBaseStyles = () => `
  body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
  .email-wrapper { background-color: #f4f4f5; padding: 40px 20px; }
  .email-container { max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
  .email-header { padding: 32px 32px 24px; text-align: center; }
  .email-icon { width: 56px; height: 56px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 16px; }
  .email-title { margin: 0; font-size: 22px; font-weight: 600; color: #18181b; letter-spacing: -0.025em; }
  .email-subtitle { margin: 8px 0 0; font-size: 14px; color: #71717a; }
  .email-body { padding: 0 32px 32px; }
  .info-card { background-color: #fafafa; border-radius: 8px; padding: 20px; }
  .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e4e4e7; }
  .info-row:last-child { border-bottom: none; }
  .info-label { font-size: 14px; color: #71717a; }
  .info-value { font-size: 14px; font-weight: 500; color: #18181b; text-align: right; }
  .highlight-value { font-size: 20px; font-weight: 700; }
  .email-footer { padding: 24px 32px; background-color: #fafafa; border-top: 1px solid #e4e4e7; text-align: center; }
  .footer-text { margin: 0; font-size: 12px; color: #a1a1aa; }
  .footer-brand { font-weight: 600; color: #71717a; }
`;

const getEmailTemplate = (type: string, data: Record<string, unknown>) => {
  const timestamp = new Date().toLocaleString("id-ID", { 
    timeZone: "Asia/Jakarta",
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const baseStyles = getEmailBaseStyles();

  switch (type) {
    case "shop_open":
      return {
        subject: "Toko Dibuka - Barbershop POS",
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyles}</style></head>
          <body>
            <div class="email-wrapper">
              <div class="email-container">
                <div class="email-header">
                  <div class="email-icon" style="background-color: #dcfce7;">✓</div>
                  <h1 class="email-title">Toko Telah Dibuka</h1>
                  <p class="email-subtitle">Operasional hari ini dimulai</p>
                </div>
                <div class="email-body">
                  <div class="info-card">
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #71717a;">Waktu</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; font-size: 14px; font-weight: 500; color: #18181b; text-align: right;">${timestamp}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; font-size: 14px; color: #71717a;">Dibuka oleh</td>
                        <td style="padding: 12px 0; font-size: 14px; font-weight: 500; color: #18181b; text-align: right;">${data.userName || "Staff"}</td>
                      </tr>
                    </table>
                  </div>
                </div>
                <div class="email-footer">
                  <p class="footer-text">Notifikasi otomatis dari <span class="footer-brand">Barbershop POS</span></p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case "shop_close":
      return {
        subject: "Toko Ditutup - Barbershop POS",
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyles}</style></head>
          <body>
            <div class="email-wrapper">
              <div class="email-container">
                <div class="email-header">
                  <div class="email-icon" style="background-color: #fee2e2;">🔒</div>
                  <h1 class="email-title">Toko Telah Ditutup</h1>
                  <p class="email-subtitle">Operasional hari ini selesai</p>
                </div>
                <div class="email-body">
                  <div class="info-card">
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #71717a;">Waktu</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; font-size: 14px; font-weight: 500; color: #18181b; text-align: right;">${timestamp}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; font-size: 14px; color: #71717a;">Ditutup oleh</td>
                        <td style="padding: 12px 0; font-size: 14px; font-weight: 500; color: #18181b; text-align: right;">${data.userName || "Staff"}</td>
                      </tr>
                    </table>
                  </div>
                </div>
                <div class="email-footer">
                  <p class="footer-text">Notifikasi otomatis dari <span class="footer-brand">Barbershop POS</span></p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case "transaction":
      const total = Number(data.total || 0);
      const discount = Number(data.discount || 0);
      return {
        subject: `Transaksi Rp ${total.toLocaleString("id-ID")} - Barbershop POS`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyles}</style></head>
          <body>
            <div class="email-wrapper">
              <div class="email-container">
                <div class="email-header">
                  <div class="email-icon" style="background-color: #dbeafe;">💳</div>
                  <h1 class="email-title">Transaksi Berhasil</h1>
                  <p class="email-subtitle">Detail transaksi baru</p>
                </div>
                <div class="email-body">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <p style="margin: 0; font-size: 14px; color: #71717a;">Total Pembayaran</p>
                    <p style="margin: 8px 0 0; font-size: 32px; font-weight: 700; color: #18181b;">Rp ${total.toLocaleString("id-ID")}</p>
                  </div>
                  <div class="info-card">
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #71717a;">Waktu</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; font-size: 14px; font-weight: 500; color: #18181b; text-align: right;">${timestamp}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #71717a;">Metode Pembayaran</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; font-size: 14px; font-weight: 500; color: #18181b; text-align: right;">
                          <span style="background-color: ${data.paymentMethod === "cash" ? "#dcfce7" : "#e0e7ff"}; color: ${data.paymentMethod === "cash" ? "#166534" : "#3730a3"}; padding: 4px 10px; border-radius: 12px; font-size: 12px;">
                            ${data.paymentMethod === "cash" ? "Tunai" : "QRIS"}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; ${discount > 0 ? 'border-bottom: 1px solid #e4e4e7;' : ''} font-size: 14px; color: #71717a;">Jumlah Item</td>
                        <td style="padding: 12px 0; ${discount > 0 ? 'border-bottom: 1px solid #e4e4e7;' : ''} font-size: 14px; font-weight: 500; color: #18181b; text-align: right;">${data.itemCount || 0} item</td>
                      </tr>
                      ${discount > 0 ? `
                      <tr>
                        <td style="padding: 12px 0; font-size: 14px; color: #71717a;">Diskon</td>
                        <td style="padding: 12px 0; font-size: 14px; font-weight: 500; color: #dc2626; text-align: right;">-Rp ${discount.toLocaleString("id-ID")}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </div>
                </div>
                <div class="email-footer">
                  <p class="footer-text">Notifikasi otomatis dari <span class="footer-brand">Barbershop POS</span></p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case "withdrawal":
      const amount = Number(data.amount || 0);
      return {
        subject: `Penarikan Rp ${amount.toLocaleString("id-ID")} - ${data.barberName || "Barber"}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyles}</style></head>
          <body>
            <div class="email-wrapper">
              <div class="email-container">
                <div class="email-header">
                  <div class="email-icon" style="background-color: #fef3c7;">💰</div>
                  <h1 class="email-title">Penarikan Dana</h1>
                  <p class="email-subtitle">Komisi barber telah ditarik</p>
                </div>
                <div class="email-body">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <p style="margin: 0; font-size: 14px; color: #71717a;">Jumlah Penarikan</p>
                    <p style="margin: 8px 0 0; font-size: 32px; font-weight: 700; color: #18181b;">Rp ${amount.toLocaleString("id-ID")}</p>
                  </div>
                  <div class="info-card">
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #71717a;">Barber</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; font-size: 14px; font-weight: 600; color: #18181b; text-align: right;">${data.barberName || "Unknown"}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #71717a;">Waktu</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; font-size: 14px; font-weight: 500; color: #18181b; text-align: right;">${timestamp}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; ${data.notes ? 'border-bottom: 1px solid #e4e4e7;' : ''} font-size: 14px; color: #71717a;">Metode</td>
                        <td style="padding: 12px 0; ${data.notes ? 'border-bottom: 1px solid #e4e4e7;' : ''} font-size: 14px; font-weight: 500; color: #18181b; text-align: right;">
                          <span style="background-color: ${data.paymentMethod === "cash" ? "#dcfce7" : "#e0e7ff"}; color: ${data.paymentMethod === "cash" ? "#166534" : "#3730a3"}; padding: 4px 10px; border-radius: 12px; font-size: 12px;">
                            ${data.paymentMethod === "cash" ? "Tunai" : "Transfer"}
                          </span>
                        </td>
                      </tr>
                      ${data.notes ? `
                      <tr>
                        <td style="padding: 12px 0; font-size: 14px; color: #71717a;">Catatan</td>
                        <td style="padding: 12px 0; font-size: 14px; font-weight: 500; color: #18181b; text-align: right;">${data.notes}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </div>
                </div>
                <div class="email-footer">
                  <p class="footer-text">Notifikasi otomatis dari <span class="footer-brand">Barbershop POS</span></p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case "test":
      return {
        subject: "Test Email - Barbershop POS",
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyles}</style></head>
          <body>
            <div class="email-wrapper">
              <div class="email-container">
                <div class="email-header">
                  <div class="email-icon" style="background-color: #f3e8ff;">✉️</div>
                  <h1 class="email-title">Test Email Berhasil</h1>
                  <p class="email-subtitle">Konfigurasi SMTP berfungsi dengan baik</p>
                </div>
                <div class="email-body">
                  <div class="info-card">
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                      <tr>
                        <td style="padding: 12px 0; font-size: 14px; color: #71717a;">Waktu</td>
                        <td style="padding: 12px 0; font-size: 14px; font-weight: 500; color: #18181b; text-align: right;">${timestamp}</td>
                      </tr>
                    </table>
                  </div>
                  <p style="margin: 24px 0 0; text-align: center; font-size: 14px; color: #71717a;">
                    Jika Anda menerima email ini, berarti pengaturan email notifikasi sudah benar.
                  </p>
                </div>
                <div class="email-footer">
                  <p class="footer-text">Notifikasi otomatis dari <span class="footer-brand">Barbershop POS</span></p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    default:
      return {
        subject: "Notifikasi - Barbershop POS",
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyles}</style></head>
          <body>
            <div class="email-wrapper">
              <div class="email-container">
                <div class="email-header">
                  <div class="email-icon" style="background-color: #f4f4f5;">📬</div>
                  <h1 class="email-title">Notifikasi Baru</h1>
                </div>
                <div class="email-body">
                  <p style="text-align: center; color: #71717a;">Anda menerima notifikasi baru dari sistem.</p>
                </div>
                <div class="email-footer">
                  <p class="footer-text">Notifikasi otomatis dari <span class="footer-brand">Barbershop POS</span></p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      };
  }
};

// Function to log email to database
const logEmailToDatabase = async (
  supabaseUrl: string,
  supabaseKey: string,
  emailType: string,
  recipientEmail: string,
  subject: string,
  status: 'success' | 'failed',
  errorMessage?: string
) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.from('email_logs').insert({
      email_type: emailType,
      recipient_email: recipientEmail,
      subject: subject,
      status: status,
      error_message: errorMessage || null,
      sent_at: new Date().toISOString()
    });
    
    if (error) {
      console.error('Error logging email:', error);
    }
  } catch (err) {
    console.error('Failed to log email:', err);
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();
    console.log("Processing email notification:", type, data);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get email settings
    const { data: settings, error: settingsError } = await supabase
      .from("email_settings")
      .select("*")
      .limit(1)
      .single();

    if (settingsError || !settings) {
      console.error("Error fetching email settings:", settingsError);
      return new Response(
        JSON.stringify({ error: "Email settings not found" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if notifications are active
    if (!settings.is_active) {
      console.log("Email notifications are disabled");
      return new Response(
        JSON.stringify({ message: "Email notifications are disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if this notification type is enabled
    const notificationTypeMap: Record<string, string> = {
      shop_open: "notify_shop_open",
      shop_close: "notify_shop_close",
      transaction: "notify_transaction",
      withdrawal: "notify_withdrawal",
      test: "is_active", // Always send test if is_active is true
    };

    const settingKey = notificationTypeMap[type];
    if (settingKey && !settings[settingKey]) {
      console.log(`Notification type ${type} is disabled`);
      return new Response(
        JSON.stringify({ message: `${type} notifications are disabled` }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get email template
    const template = getEmailTemplate(type, data);

    // Create SMTP client with proper TLS configuration
    // Port 465 uses direct SSL/TLS, Port 587 uses STARTTLS
    const useDirectTLS = settings.smtp_port === 465;
    
    const client = new SMTPClient({
      connection: {
        hostname: settings.smtp_host,
        port: settings.smtp_port,
        tls: useDirectTLS,
        auth: {
          username: settings.smtp_user,
          password: settings.smtp_password,
        },
      },
    });

    // Send email to all recipients
    const recipientEmails = settings.recipient_emails || [];
    const results = [];

    for (const recipientEmail of recipientEmails) {
      try {
        await client.send({
          from: `${settings.smtp_from_name} <${settings.smtp_from_email}>`,
          to: recipientEmail,
          subject: template.subject,
          html: template.html,
        });
        console.log(`Email sent to ${recipientEmail}`);
        results.push({ email: recipientEmail, success: true });
        
        // Log successful email
        await logEmailToDatabase(
          supabaseUrl,
          supabaseKey,
          type,
          recipientEmail,
          template.subject,
          'success'
        );
      } catch (emailError: unknown) {
        const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
        console.error(`Failed to send email to ${recipientEmail}:`, errorMessage);
        results.push({ email: recipientEmail, success: false, error: errorMessage });
        
        // Log failed email
        await logEmailToDatabase(
          supabaseUrl,
          supabaseKey,
          type,
          recipientEmail,
          template.subject,
          'failed',
          errorMessage
        );
      }
    }

    await client.close();

    console.log("Email send results:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in send-email-notification:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

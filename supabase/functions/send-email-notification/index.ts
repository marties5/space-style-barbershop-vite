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

    case "daily_report":
      const reportData = data as {
        userName: string;
        openedAt: string;
        closedAt: string;
        totalRevenue: number;
        totalTransactions: number;
        serviceRevenue: number;
        productRevenue: number;
        totalExpenses: number;
        barberPerformance: Array<{
          name: string;
          transactionCount: number;
          totalRevenue: number;
          commission: number;
        }>;
        barberWithdrawals: Array<{
          barberName: string;
          amount: number;
          paymentMethod: string;
        }>;
      };

      const formatCurrency = (amount: number) => `Rp ${amount.toLocaleString("id-ID")}`;
      
      const barberRows = (reportData.barberPerformance || []).map(barber => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; font-size: 13px; color: #18181b;">${barber.name}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; font-size: 13px; color: #71717a; text-align: center;">${barber.transactionCount}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; font-size: 13px; color: #18181b; text-align: right;">${formatCurrency(barber.totalRevenue)}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; font-size: 13px; color: #166534; text-align: right;">${formatCurrency(barber.commission)}</td>
        </tr>
      `).join('');

      const withdrawalRows = (reportData.barberWithdrawals || []).length > 0 
        ? (reportData.barberWithdrawals || []).map(w => `
            <tr>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; font-size: 13px; color: #18181b;">${w.barberName}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; font-size: 13px; color: #dc2626; text-align: right;">${formatCurrency(w.amount)}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e4e4e7; font-size: 13px; text-align: center;">
                <span style="background-color: ${w.paymentMethod === "cash" ? "#dcfce7" : "#e0e7ff"}; color: ${w.paymentMethod === "cash" ? "#166534" : "#3730a3"}; padding: 2px 8px; border-radius: 10px; font-size: 11px;">
                  ${w.paymentMethod === "cash" ? "Tunai" : "Transfer"}
                </span>
              </td>
            </tr>
          `).join('')
        : '<tr><td colspan="3" style="padding: 16px; text-align: center; color: #a1a1aa; font-size: 13px;">Tidak ada penarikan hari ini</td></tr>';

      const netRevenue = reportData.totalRevenue - reportData.totalExpenses;

      return {
        subject: `📊 Laporan Harian - ${new Date().toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyles}</style></head>
          <body>
            <div class="email-wrapper">
              <div class="email-container" style="max-width: 600px;">
                <div class="email-header" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 28px;">
                  <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.025em;">📊 Laporan Harian</h1>
                  <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.85);">${new Date().toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                
                <div class="email-body" style="padding: 24px;">
                  <!-- Summary Cards -->
                  <div style="display: flex; gap: 12px; margin-bottom: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" style="padding-right: 6px;">
                          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 10px; padding: 16px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.5px;">Total Pendapatan</p>
                            <p style="margin: 6px 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">${formatCurrency(reportData.totalRevenue)}</p>
                          </div>
                        </td>
                        <td width="50%" style="padding-left: 6px;">
                          <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 10px; padding: 16px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.5px;">Transaksi</p>
                            <p style="margin: 6px 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">${reportData.totalTransactions}</p>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- Revenue Breakdown -->
                  <div style="background-color: #fafafa; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #18181b;">💰 Rincian Pendapatan</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #71717a;">Pendapatan Layanan</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e4e4e7; font-size: 14px; font-weight: 600; color: #18181b; text-align: right;">${formatCurrency(reportData.serviceRevenue)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #71717a;">Pendapatan Produk</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e4e4e7; font-size: 14px; font-weight: 600; color: #18181b; text-align: right;">${formatCurrency(reportData.productRevenue)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e4e4e7; font-size: 14px; color: #71717a;">Total Pengeluaran</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e4e4e7; font-size: 14px; font-weight: 600; color: #dc2626; text-align: right;">-${formatCurrency(reportData.totalExpenses)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; font-size: 15px; font-weight: 600; color: #18181b;">Pendapatan Bersih</td>
                        <td style="padding: 12px 0; font-size: 18px; font-weight: 700; color: ${netRevenue >= 0 ? '#166534' : '#dc2626'}; text-align: right;">${formatCurrency(netRevenue)}</td>
                      </tr>
                    </table>
                  </div>

                  <!-- Barber Performance -->
                  <div style="background-color: #fafafa; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #18181b;">💈 Performa Barber</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                      <thead>
                        <tr style="background-color: #e4e4e7;">
                          <th style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #52525b; text-align: left; border-radius: 6px 0 0 0;">Nama</th>
                          <th style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #52525b; text-align: center;">Transaksi</th>
                          <th style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #52525b; text-align: right;">Pendapatan</th>
                          <th style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #52525b; text-align: right; border-radius: 0 6px 0 0;">Komisi</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${barberRows || '<tr><td colspan="4" style="padding: 16px; text-align: center; color: #a1a1aa; font-size: 13px;">Tidak ada data barber</td></tr>'}
                      </tbody>
                    </table>
                  </div>

                  <!-- Barber Withdrawals -->
                  <div style="background-color: #fef3c7; border-radius: 10px; padding: 16px;">
                    <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #92400e;">💸 Penarikan Komisi</h3>
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; background-color: #ffffff; border-radius: 8px;">
                      <thead>
                        <tr style="background-color: #fef9c3;">
                          <th style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #78350f; text-align: left; border-radius: 8px 0 0 0;">Barber</th>
                          <th style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #78350f; text-align: right;">Jumlah</th>
                          <th style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #78350f; text-align: center; border-radius: 0 8px 0 0;">Metode</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${withdrawalRows}
                      </tbody>
                    </table>
                  </div>

                  <!-- Footer Info -->
                  <div style="margin-top: 20px; padding: 16px; background-color: #f4f4f5; border-radius: 10px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 12px; color: #71717a;">Dibuka:</td>
                        <td style="font-size: 12px; color: #18181b; text-align: right;">${reportData.openedAt || '-'}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; color: #71717a; padding-top: 6px;">Ditutup:</td>
                        <td style="font-size: 12px; color: #18181b; text-align: right; padding-top: 6px;">${reportData.closedAt || timestamp}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; color: #71717a; padding-top: 6px;">Ditutup oleh:</td>
                        <td style="font-size: 12px; color: #18181b; text-align: right; padding-top: 6px;">${reportData.userName || 'Staff'}</td>
                      </tr>
                    </table>
                  </div>
                </div>
                
                <div class="email-footer">
                  <p class="footer-text">Laporan otomatis dari <span class="footer-brand">Barbershop POS</span></p>
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
      daily_report: "notify_shop_close", // Daily report is sent when shop closes
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

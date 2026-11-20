// Branded minimal HTML e-mail templates. Pure functions: no I/O, no secrets in logs.
// Palette: #FAF8F3 (bg) / #4A372C (ink) / #85632B (accent, AA on cream). Fonts fall back to system serif/sans.

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export const formatTry = (kurus: number) =>
  `${(Math.trunc(kurus) / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;

function layout(opts: { title: string; paragraphs: string[]; cta?: { label: string; url: string }; footnote?: string }): string {
  const paras = opts.paragraphs.map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#4A372C">${esc(p)}</p>`).join("");
  const cta = opts.cta
    ? `<p style="margin:24px 0"><a href="${esc(opts.cta.url)}" style="display:inline-block;background:#4A372C;color:#FAF8F3;text-decoration:none;padding:12px 24px;border-radius:2px;font-family:Manrope,Arial,sans-serif;font-size:15px">${esc(opts.cta.label)}</a></p>
       <p style="margin:0 0 16px;font-size:13px;color:#85632B;word-break:break-all">${esc(opts.cta.url)}</p>`
    : "";
  const foot = opts.footnote ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#6b5a4d">${esc(opts.footnote)}</p>` : "";
  return `<!doctype html><html lang="tr"><body style="margin:0;padding:0;background:#FAF8F3">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FAF8F3"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#FFFFFF;border:1px solid #EDE4D6">
<tr><td style="padding:28px 32px 8px;font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-size:26px;color:#4A372C;letter-spacing:.02em">Tülay Birer</td></tr>
<tr><td style="padding:8px 32px 32px;font-family:Manrope,Arial,Helvetica,sans-serif">
<h1 style="margin:16px 0;font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:24px;color:#242320">${esc(opts.title)}</h1>
${paras}${cta}${foot}
</td></tr></table></td></tr></table></body></html>`;
}

function text(title: string, paragraphs: string[], url?: string, foot?: string) {
  return [title, "", ...paragraphs, ...(url ? ["", url] : []), ...(foot ? ["", foot] : [])].join("\n");
}

function make(subject: string, paragraphs: string[], cta?: { label: string; url: string }, footnote?: string): RenderedEmail {
  return {
    subject,
    html: layout({ title: subject, paragraphs, cta, footnote }),
    text: text(subject, paragraphs, cta?.url, footnote),
  };
}

export interface TemplateData {
  verify_email: { name?: string | null; url: string };
  password_reset: { name?: string | null; url: string };
  order_created: { orderNumber: string; totalKurus: number; url: string };
  payment_completed: { orderNumber: string; totalKurus: number; url: string };
  downloads_ready: { orderNumber: string; url: string };
  order_shipped: { orderNumber: string; carrier?: string | null; trackingNumber?: string | null; url: string };
  new_custom_order: { customOrderId: string; customerName: string; customerEmail: string; summary: string; url: string };
  quote_sent: { customerName: string; quoteKurus: number; note?: string | null; url: string; prepDays?: number | null; validUntil?: string | null };
  custom_request_received: { customerName: string; summary: string; url?: string | null };
  order_cancelled: { orderNumber: string; url: string };
  order_refunded: { orderNumber: string; totalKurus: number; url: string };
  admin_invite: { name?: string | null; roleLabel: string; url: string };
}
export type TemplateName = keyof TemplateData;

const hello = (n?: string | null) => (n ? `Merhaba ${n},` : "Merhaba,");

export const templates: { [K in TemplateName]: (d: TemplateData[K]) => RenderedEmail } = {
  verify_email: (d) =>
    make("E-posta adresinizi doğrulayın", [hello(d.name), "Hesabınızı etkinleştirmek için e-posta adresinizi doğrulayın. Bağlantı 24 saat geçerlidir."], { label: "E-postamı doğrula", url: d.url }, "Bu hesabı siz oluşturmadıysanız bu e-postayı yok sayabilirsiniz."),
  password_reset: (d) =>
    make("Şifre sıfırlama isteği", [hello(d.name), "Şifrenizi sıfırlamak için aşağıdaki bağlantıyı kullanın. Bağlantı 1 saat geçerlidir ve yalnızca bir kez kullanılabilir."], { label: "Şifremi sıfırla", url: d.url }, "Bu isteği siz yapmadıysanız bu e-postayı yok sayın; şifreniz değişmeyecektir."),
  order_created: (d) =>
    make(`Siparişiniz alındı (${d.orderNumber})`, [`Siparişiniz oluşturuldu. Toplam tutar: ${formatTry(d.totalKurus)}.`, "Ödeme onaylandığında size ayrıca bilgi vereceğiz."], { label: "Siparişi görüntüle", url: d.url }),
  payment_completed: (d) =>
    make(`Ödemeniz alındı (${d.orderNumber})`, [`${formatTry(d.totalKurus)} tutarındaki ödemeniz onaylandı. Teşekkür ederiz.`], { label: "Siparişi görüntüle", url: d.url }),
  downloads_ready: (d) =>
    make(`Dosyalarınız indirmeye hazır (${d.orderNumber})`, ["Dijital nakış dosyalarınız hesabınızdaki indirmeler bölümünde hazır. İndirme bağlantıları kısa ömürlüdür; her indirmede yeniden oluşturulur."], { label: "İndirmelerime git", url: d.url }),
  order_shipped: (d) =>
    make(`Siparişiniz kargoya verildi (${d.orderNumber})`, [
      "Siparişiniz kargoya teslim edildi.",
      ...(d.carrier ? [`Kargo firması: ${d.carrier}`] : []),
      ...(d.trackingNumber ? [`Takip numarası: ${d.trackingNumber}`] : []),
    ], { label: "Siparişi görüntüle", url: d.url }),
  new_custom_order: (d) =>
    make("Yeni kişiye özel sipariş talebi", [`${d.customerName} (${d.customerEmail}) yeni bir talep gönderdi.`, d.summary], { label: "Talebi aç", url: d.url }),
  quote_sent: (d) =>
    make("Kişiye özel siparişiniz için teklifimiz hazır", [hello(d.customerName), `Teklif tutarı: ${formatTry(d.quoteKurus)}.`, ...(d.prepDays ? [`Hazırlık süresi: ${d.prepDays} gün.`] : []), ...(d.validUntil ? [`Teklif geçerlilik tarihi: ${d.validUntil}.`] : []), ...(d.note ? [d.note] : [])], { label: "Teklifi görüntüle", url: d.url }),
  custom_request_received: (d) =>
    make("Kişiye özel talebiniz alındı", [hello(d.customerName), "Talebiniz bize ulaştı. İnceleyip size teklifle dönüş yapacağız.", d.summary], d.url ? { label: "Talebimi görüntüle", url: d.url } : undefined, "Bu talebi siz göndermediyseniz bu e-postayı yok sayabilirsiniz."),
  order_cancelled: (d) =>
    make(`Siparişiniz iptal edildi (${d.orderNumber})`, ["Siparişiniz iptal edildi. Stok ve varsa kupon hakkınız serbest bırakıldı."], { label: "Siparişi görüntüle", url: d.url }),
  order_refunded: (d) =>
    make(`Siparişiniz iade edildi (${d.orderNumber})`, [`${formatTry(d.totalKurus)} tutarındaki ödemeniz için iade işlemi başlatıldı. Bankanıza bağlı olarak hesabınıza yansıması birkaç iş günü sürebilir.`], { label: "Siparişi görüntüle", url: d.url }),
  admin_invite: (d) =>
    make("Yönetim paneli davetiniz", [hello(d.name), `Sizi yönetim paneline "${d.roleLabel}" rolüyle ekledik. Şifrenizi belirlemek için aşağıdaki bağlantıyı kullanın. Bağlantı 1 saat geçerlidir.`], { label: "Şifremi belirle", url: d.url }, "Bu daveti beklemiyorsanız e-postayı yok sayın."),
};

// API Route pour envoyer un devis ou une facture par email
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sendEmail } from '@/lib/email';

interface InvoiceLinePayload {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

interface SendInvoicePayload {
  documentType: 'invoice' | 'quote';
  number: string;
  issueDate: string;
  dueDate: string;
  issuerName: string;
  issuerEmail?: string;
  issuerPhone?: string;
  issuerAddress?: string;
  issuerZip?: string;
  issuerCity?: string;
  issuerSiret?: string;
  clientName: string;
  clientEmail: string;
  lines: InvoiceLinePayload[];
  globalDiscount?: number;
  paymentTerms?: string;
  notes?: string;
  message?: string;
  accentColor?: string;
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const fmt = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Auto-entreprise : TVA non applicable, art. 293 B du CGI — totaux nets, sans TVA
function calcTotals(lines: InvoiceLinePayload[], globalDiscount = 0) {
  const raw = lines.reduce((s, l) =>
    s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0) * (1 - (Number(l.discount) || 0) / 100), 0);
  const factor = 1 - Math.min(Math.max(globalDiscount, 0), 100) / 100;
  return { raw, total: raw * factor, discount: raw * (1 - factor) };
}

function buildHtml(p: SendInvoicePayload) {
  const accent = /^#[0-9a-fA-F]{6}$/.test(p.accentColor ?? '') ? p.accentColor! : '#6366f1';
  const label = p.documentType === 'quote' ? 'Devis' : 'Facture';
  const totals = calcTotals(p.lines, p.globalDiscount ?? 0);

  const linesRows = p.lines.map(l => {
    const total = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0) * (1 - (Number(l.discount) || 0) / 100);
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${esc(l.description) || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${esc(l.quantity)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${fmt(Number(l.unitPrice) || 0)} €</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${(Number(l.discount) || 0) > 0 ? esc(l.discount) + '%' : '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">${fmt(total)} €</td>
    </tr>`;
  }).join('');

  const discountRows = (p.globalDiscount ?? 0) > 0 ? `
    <tr><td style="padding:4px 12px;text-align:right;color:#555;">Sous-total</td>
        <td style="padding:4px 12px;text-align:right;">${fmt(totals.raw)} €</td></tr>
    <tr><td style="padding:4px 12px;text-align:right;color:#e11d48;">Remise globale (${esc(p.globalDiscount)}%)</td>
        <td style="padding:4px 12px;text-align:right;color:#e11d48;">− ${fmt(totals.discount)} €</td></tr>` : '';

  return `<!doctype html>
<html lang="fr"><body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <div style="max-width:640px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:${accent};padding:24px 32px;color:#fff;">
        <div style="font-size:22px;font-weight:bold;">${label} ${esc(p.number)}</div>
        <div style="opacity:.85;font-size:13px;margin-top:4px;">${esc(p.issuerName)}</div>
      </div>
      <div style="padding:24px 32px;">
        ${p.message ? `<p style="font-size:14px;line-height:1.6;white-space:pre-line;">${esc(p.message)}</p>` : `
        <p style="font-size:14px;line-height:1.6;">Bonjour ${esc(p.clientName) || ''},</p>
        <p style="font-size:14px;line-height:1.6;">Veuillez trouver ci-dessous votre ${label.toLowerCase()} <strong>${esc(p.number)}</strong>.</p>`}
        <table style="width:100%;font-size:13px;margin:16px 0;border-collapse:collapse;">
          <tr>
            <td style="padding:4px 0;color:#6b7280;">Date d'émission</td>
            <td style="padding:4px 0;text-align:right;font-weight:bold;">${new Date(p.issueDate).toLocaleDateString('fr-FR')}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280;">${p.documentType === 'quote' ? 'Valable jusqu\'au' : 'Échéance'}</td>
            <td style="padding:4px 0;text-align:right;font-weight:bold;">${new Date(p.dueDate).toLocaleDateString('fr-FR')}</td>
          </tr>
        </table>
        <table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:8px;">
          <thead>
            <tr style="border-bottom:2px solid ${accent};">
              <th style="padding:8px 12px;text-align:left;">Description</th>
              <th style="padding:8px 12px;text-align:right;">Qté</th>
              <th style="padding:8px 12px;text-align:right;">P.U.</th>
              <th style="padding:8px 12px;text-align:right;">Rem.</th>
              <th style="padding:8px 12px;text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>${linesRows}</tbody>
        </table>
        <table style="width:100%;font-size:13px;border-collapse:collapse;">
          ${discountRows}
          <tr>
            <td style="padding:8px 12px;text-align:right;font-size:16px;font-weight:bold;color:${accent};border-top:2px solid ${accent};">Total</td>
            <td style="padding:8px 12px;text-align:right;font-size:16px;font-weight:bold;color:${accent};border-top:2px solid ${accent};white-space:nowrap;">${fmt(totals.total)} €</td>
          </tr>
        </table>
        <p style="text-align:right;font-size:11px;color:#6b7280;font-style:italic;margin-top:4px;">TVA non applicable, art. 293 B du CGI</p>
        ${p.paymentTerms ? `<p style="font-size:12px;color:#6b7280;margin-top:16px;"><strong>Conditions de paiement :</strong> ${esc(p.paymentTerms)}</p>` : ''}
        ${p.notes ? `<p style="font-size:12px;color:#6b7280;white-space:pre-line;">${esc(p.notes)}</p>` : ''}
      </div>
      <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;">
        ${esc(p.issuerName)}${p.issuerSiret ? ` — SIRET ${esc(p.issuerSiret)}` : ''}<br/>
        ${[p.issuerAddress, [p.issuerZip, p.issuerCity].filter(Boolean).join(' ')].filter(Boolean).map(esc).join(', ')}
        ${p.issuerPhone ? `<br/>Tél : ${esc(p.issuerPhone)}` : ''}
        ${p.issuerEmail ? `<br/>${esc(p.issuerEmail)}` : ''}
      </div>
    </div>
  </div>
</body></html>`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = (await request.json()) as SendInvoicePayload;

    if (!body?.clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.clientEmail)) {
      return NextResponse.json({ error: 'Email du client manquant ou invalide' }, { status: 400 });
    }
    if (!Array.isArray(body.lines) || body.lines.length === 0) {
      return NextResponse.json({ error: 'Aucune ligne à facturer' }, { status: 400 });
    }

    const label = body.documentType === 'quote' ? 'Devis' : 'Facture';
    const totals = calcTotals(body.lines, body.globalDiscount ?? 0);

    const result = await sendEmail({
      to: body.clientEmail,
      subject: `${label} ${body.number} — ${fmt(totals.total)} € — ${body.issuerName}`,
      html: buildHtml(body),
      replyTo: body.issuerEmail || undefined,
    });

    return NextResponse.json({
      success: true,
      id: result.id,
      simulated: result.id === 'dev-mode',
    });
  } catch (error) {
    console.error('Erreur envoi devis/facture:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de l\'email' },
      { status: 500 }
    );
  }
}

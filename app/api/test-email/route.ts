export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sendEmail } from '../../../lib/email';

export const runtime = 'nodejs';

// Endpoint de test email — protégé par INTERNAL_API_TOKEN
// Usage: POST /api/test-email  Authorization: Bearer <token>
// Body: { to: "email@example.com" }  (optionnel, défaut: ADMIN_EMAIL)
export async function POST(request: Request) {
  // Vérification token interne
  const authHeader = request.headers.get('authorization') || '';
  const internalToken = process.env.INTERNAL_API_TOKEN?.trim();

  if (!internalToken || authHeader !== `Bearer ${internalToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let to: string;
  try {
    const body = await request.json().catch(() => ({}));
    to = body.to || process.env.ADMIN_EMAIL || 'claustre.emmanuel@gmail.com';
  } catch {
    to = process.env.ADMIN_EMAIL || 'claustre.emmanuel@gmail.com';
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'BNBGest <noreply@bnbgest.com>';

  if (!resendKey) {
    return NextResponse.json({
      success: false,
      status: 'NOT_CONFIGURED',
      error: 'RESEND_API_KEY manquante dans les variables d\'environnement',
      hint: 'Ajoutez RESEND_API_KEY dans le Vercel Dashboard',
    }, { status: 503 });
  }

  try {
    const result = await sendEmail({
      to,
      subject: '✅ Test Email BNBGest — ' + new Date().toLocaleString('fr-FR'),
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <div style="background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🏠 BNBGest</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Test de configuration email</p>
          </div>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px;">
            <h2 style="color: #111827; margin-top: 0;">✅ Le serveur mail fonctionne !</h2>
            <p style="color: #6b7280;">Cet email confirme que Resend est correctement configuré sur BNBGest.</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
              <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px; border-bottom: 1px solid #e5e7eb;">Service</td><td style="padding: 8px 0; font-size: 14px; border-bottom: 1px solid #e5e7eb;">Resend</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px; border-bottom: 1px solid #e5e7eb;">Expéditeur</td><td style="padding: 8px 0; font-size: 14px; border-bottom: 1px solid #e5e7eb;">${fromEmail}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px; border-bottom: 1px solid #e5e7eb;">Destinataire</td><td style="padding: 8px 0; font-size: 14px; border-bottom: 1px solid #e5e7eb;">${to}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date</td><td style="padding: 8px 0; font-size: 14px;">${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</td></tr>
            </table>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">© 2026 BNBGest — Gestion locative professionnelle</p>
        </div>
      `,
      text: `BNBGest — Test email réussi ! Envoyé le ${new Date().toLocaleString('fr-FR')} à ${to}`,
    });

    return NextResponse.json({
      success: true,
      status: 'SENT',
      to,
      from: fromEmail,
      messageId: result.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const err = error as { message?: string; name?: string; statusCode?: number };
    return NextResponse.json({
      success: false,
      status: 'ERROR',
      error: err.message || 'Erreur inconnue',
      errorType: err.name,
      hint: err.statusCode === 403
        ? 'Domaine non vérifié dans Resend. Allez sur resend.com/domains'
        : err.message?.includes('API key')
        ? 'Clé API Resend invalide'
        : 'Vérifiez les logs Vercel pour plus de détails',
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '../../../../lib/prisma';
import { sendEmail } from '../../../../lib/email';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: true });
    }

    const emailLower = email.toLowerCase().trim();

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    const employeeEmail = process.env.EMPLOYEE_EMAIL?.toLowerCase().trim();
    const validEmails = [adminEmail, employeeEmail].filter(Boolean) as string[];

    if (validEmails.includes(emailLower)) {
      await prisma.passwordResetToken.deleteMany({ where: { email: emailLower } });

      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 heures

      await prisma.passwordResetToken.create({ data: { email: emailLower, token, expires } });

      const baseUrl = 'https://bnbgest.vercel.app';
      // Ne passer QUE le token dans l'URL — pas d'email (évite les problèmes d'encodage Gmail)
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      console.log(`Reset token created in DB for ${emailLower}`);

      try {
        await sendEmail({
          to: emailLower,
          subject: 'Reinitialisation de votre mot de passe - BNBGest',
          html: buildEmailHtml(resetUrl),
          text: `Cliquez sur ce lien pour reinitialiser votre mot de passe :\n${resetUrl}\n\nCe lien est valable 2 heures.`,
        });
        console.log(`Email envoye a ${emailLower}`);
      } catch (emailErr) {
        console.error('Erreur envoi email:', emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ success: true });
  }
}

function buildEmailHtml(resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:36px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">BNBGest</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">Reinitialisation de mot de passe</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#111827;font-size:22px;">Bonjour,</h2>
          <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.6;">
            Vous avez demande la reinitialisation de votre mot de passe.<br>
            Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;">
              Reinitialiser mon mot de passe
            </a>
          </div>
          <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">Ce lien est valable <strong>2 heures</strong>.</p>
          <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Si vous n avez pas demande cette reinitialisation, ignorez cet email.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
            Lien direct : <a href="${resetUrl}" style="color:#6366f1;word-break:break-all;">${resetUrl}</a>
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">BNBGest - Gestion de location saisonniere</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

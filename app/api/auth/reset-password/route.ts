import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token et mot de passe requis.' }, { status: 400 });
    }

    const tokenData = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!tokenData) {
      return NextResponse.json({ error: 'Lien invalide ou deja utilise.' }, { status: 400 });
    }
    if (tokenData.used) {
      return NextResponse.json({ error: 'Ce lien a deja ete utilise.' }, { status: 400 });
    }
    if (tokenData.expires < new Date()) {
      await prisma.passwordResetToken.delete({ where: { token } });
      return NextResponse.json({ error: 'Ce lien a expire. Veuillez faire une nouvelle demande.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caracteres.' }, { status: 400 });
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins une majuscule.' }, { status: 400 });
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins un chiffre.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.appCredential.upsert({
      where: { email: tokenData.email },
      create: { email: tokenData.email, hashedPassword },
      update: { hashedPassword },
    });

    await prisma.passwordResetToken.update({
      where: { token },
      data: { used: true },
    });

    console.log('Password updated in DB for', tokenData.email);

    return NextResponse.json({ success: true, message: 'Mot de passe mis a jour. Vous pouvez maintenant vous connecter.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Erreur serveur. Veuillez reessayer.' }, { status: 500 });
  }
}

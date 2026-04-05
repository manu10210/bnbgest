import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { prisma } from '../../../../lib/prisma';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins une majuscule' }, { status: 400 });
    }
    if (!/[0-9]/.test(newPassword)) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins un chiffre' }, { status: 400 });
    }

    const email = session.user.email.toLowerCase().trim();

    // Vérifier le mot de passe actuel
    const cred = await prisma.appCredential.findUnique({ where: { email } });

    if (cred) {
      // Vérifier via DB (bcrypt)
      const valid = await bcrypt.compare(currentPassword, cred.hashedPassword);
      if (!valid) {
        return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 400 });
      }
    } else {
      // Fallback : vérifier via variable d'environnement
      const envPassword = process.env.ADMIN_PASSWORD;
      if (!envPassword || currentPassword !== envPassword) {
        return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 400 });
      }
    }

    // Hacher et sauvegarder le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.appCredential.upsert({
      where: { email },
      create: { email, hashedPassword },
      update: { hashedPassword },
    });

    return NextResponse.json({ success: true, message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

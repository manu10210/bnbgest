import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    // Validation
    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 });
    }
    if (!email.includes('@') || email.length < 5) {
      return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 6 caractères' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Vérifier si un compte existe déjà
    const existing = await prisma.appCredential.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: 'Un compte existe déjà avec cette adresse email' }, { status: 409 });
    }

    // Hasher le mot de passe et créer le compte
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.appCredential.create({
      data: { email: normalizedEmail, hashedPassword },
    });

    return NextResponse.json(
      { success: true, message: 'Compte créé avec succès', email: normalizedEmail },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Erreur serveur lors de l\'inscription' }, { status: 500 });
  }
}

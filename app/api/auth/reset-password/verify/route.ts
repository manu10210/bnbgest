import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

export const runtime = 'nodejs';

// Route POST /api/auth/reset-password/verify
// Body: { token }
// Utilisée par la page reset-password pour vérifier la validité du token
export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ valid: false, reason: 'missing' });
    }

    const tokenData = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!tokenData) {
      return NextResponse.json({ valid: false, reason: 'invalid' });
    }

    if (tokenData.used) {
      return NextResponse.json({ valid: false, reason: 'already_used' });
    }

    if (tokenData.expires < new Date()) {
      return NextResponse.json({ valid: false, reason: 'expired' });
    }

    return NextResponse.json({ valid: true, email: tokenData.email });
  } catch {
    return NextResponse.json({ valid: false, reason: 'error' });
  }
}

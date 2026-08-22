export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { requireRole } from '../../../../lib/auth-middleware';

// GET /api/iot/camera-access
// Ouvre l'accès aux caméras de l'espace commun (ControlBnB) à un membre
// connecté à BNBGest avec le rôle ADMIN ou EMPLOYEE : on signe un jeton
// court (12 h) avec IOT_API_KEY et on redirige vers ControlBnB, qui le
// vérifie hors ligne. Sans session ou sans rôle : 401 / 403.
//   ?json=1  -> renvoie { token, url } au lieu de rediriger.
const DUREE_S = 12 * 3600;

export async function GET(request: Request) {
  const session = await requireRole(request, ['ADMIN', 'EMPLOYEE']);
  if (session instanceof NextResponse) return session;

  const key = process.env.IOT_API_KEY?.trim();
  const controlbnb = (process.env.CONTROLBNB_URL || '').trim().replace(/\/$/, '');
  if (!key || !controlbnb) {
    return NextResponse.json({ error: 'IOT_API_KEY / CONTROLBNB_URL non configurés' }, { status: 503 });
  }

  const payload = {
    sub: session.user.email || session.user.id,
    role: String(session.user.role || 'USER').toUpperCase(),
    exp: Math.floor(Date.now() / 1000) + DUREE_S,
  };
  const corps = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = createHmac('sha256', key).update(corps).digest('base64url');
  const token = `${corps}.${mac}`;
  const url = `${controlbnb}/?cam=${encodeURIComponent(token)}`;

  if (new URL(request.url).searchParams.get('json') === '1') return NextResponse.json({ token, url, expiresIn: DUREE_S });
  return NextResponse.redirect(url, 302);
}

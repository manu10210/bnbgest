import { NextResponse } from 'next/server';
import { VAPID_PUBLIC_KEY } from '../../../../lib/web-push';

export const runtime = 'nodejs';

// GET /api/push/vapid-key — retourne la clé publique VAPID pour s'abonner
export async function GET() {
  if (!VAPID_PUBLIC_KEY) {
    return NextResponse.json({ error: 'Push notifications non configurées' }, { status: 503 });
  }
  return NextResponse.json({ publicKey: VAPID_PUBLIC_KEY });
}

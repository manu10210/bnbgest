import { NextRequest, NextResponse } from 'next/server';
import { parseAirbnbEmail } from '../../../../lib/gmail-parser';

export async function POST(req: NextRequest) {
  try {
    const { subject, body, from: sender, receivedAt } = await req.json();

    if (!subject) {
      return NextResponse.json({ error: 'subject requis' }, { status: 400 });
    }

    const msgId = `manual-${Date.now()}`;
    const fromAddr = sender || 'automated@airbnb.com';
    const date = receivedAt ? new Date(receivedAt).toISOString() : new Date().toISOString();

    const result = parseAirbnbEmail(msgId, subject, fromAddr, body || '', date);

    return NextResponse.json({ parsed: result });
  } catch (err) {
    console.error('[parse-email]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

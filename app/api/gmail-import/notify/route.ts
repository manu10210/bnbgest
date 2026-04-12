/**
 * POST /api/gmail-import/notify
 *
 * Déclenche des notifications email depuis le GmailImporter (côté client).
 * Appelé après un import réussi pour envoyer des emails aux voyageurs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  sendBookingConfirmationEmail,
  sendCheckInReminderEmail,
} from '@/lib/email-notifications';

export const runtime = 'nodejs';

interface NotifyPayload {
  type: 'booking_confirmation' | 'checkin_reminder';
  guestName: string;
  guestEmail: string;
  checkIn: string;      // ISO date string
  checkOut?: string;
  guests?: number;
  totalPrice?: number;
  bookingId?: number;
  property: {
    name: string;
    address?: string;
    city?: string;
  };
}

export async function POST(request: NextRequest) {
  // Authentification requise
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const payload: NotifyPayload = await request.json();

    if (!payload.guestEmail || !payload.guestName || !payload.property?.name) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // Valider que l'email ressemble à un email valide (pas un placeholder)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.guestEmail)) {
      return NextResponse.json({ error: 'Email invalide', skipped: true }, { status: 200 });
    }

    if (payload.type === 'booking_confirmation') {
      if (!payload.checkOut) {
        return NextResponse.json({ error: 'checkOut manquant' }, { status: 400 });
      }
      await sendBookingConfirmationEmail({
        id: payload.bookingId ?? 0,
        guestName: payload.guestName,
        guestEmail: payload.guestEmail,
        checkIn: new Date(payload.checkIn),
        checkOut: new Date(payload.checkOut),
        guests: payload.guests ?? 1,
        totalPrice: payload.totalPrice ?? 0,
        property: payload.property,
      });
      return NextResponse.json({ success: true, type: 'booking_confirmation', to: payload.guestEmail });
    }

    if (payload.type === 'checkin_reminder') {
      await sendCheckInReminderEmail({
        guestName: payload.guestName,
        guestEmail: payload.guestEmail,
        checkIn: new Date(payload.checkIn),
        property: payload.property,
      });
      return NextResponse.json({ success: true, type: 'checkin_reminder', to: payload.guestEmail });
    }

    return NextResponse.json({ error: 'Type inconnu' }, { status: 400 });

  } catch (error) {
    console.error('❌ /api/gmail-import/notify error:', error);
    return NextResponse.json(
      { error: 'Erreur envoi email', detail: String(error) },
      { status: 500 }
    );
  }
}

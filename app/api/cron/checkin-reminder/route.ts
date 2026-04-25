export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { sendCheckInReminderEmail } from '../../../../lib/email-notifications';
import { getAllSubscriptions } from '../../../../lib/push-subscriptions';
import { sendPushToMany } from '../../../../lib/web-push';

export const runtime = 'nodejs';

// GET /api/cron/checkin-reminder
// Appelé toutes les heures par Vercel Cron (vercel.json)
// Envoie un email + push aux guests qui arrivent dans 24h
export async function GET(request: Request) {
  // Vérification clé cron (sécurité)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    // Fenêtre : check-ins entre maintenant+23h et maintenant+25h
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const bookings = await prisma.booking.findMany({
      where: {
        checkIn: { gte: windowStart, lte: windowEnd },
        status: 'CONFIRMED',
      },
      include: {
        property: {
          select: { name: true, address: true, city: true },
        },
      },
    });

    if (bookings.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: 'Aucun check-in dans 24h' });
    }

    let emailSent = 0;
    let emailFailed = 0;
    let pushSent = 0;

    for (const booking of bookings) {
      // 1. Email de rappel au guest
      if (booking.guestEmail) {
        try {
          await sendCheckInReminderEmail({
            guestName: booking.guestName,
            guestEmail: booking.guestEmail,
            checkIn: booking.checkIn,
            property: booking.property,
          });
          emailSent++;
        } catch (err) {
          console.error(`❌ Email rappel pour booking ${booking.id}:`, err);
          emailFailed++;
        }
      }

      // 2. Log envoi (pas de champ reminderSent en DB, le cron est horaire donc peu de risque de doublon)

      // 3. Notification push à l'admin (arrivée prévue)
      const allSubs = getAllSubscriptions();
      if (allSubs.length > 0) {
        const result = await sendPushToMany(
          allSubs.map(s => s.sub),
          {
            title: '🏠 Arrivée demain',
            body: `${booking.guestName} arrive demain à ${booking.property.name}`,
            url: '/bookings',
            tag: `checkin-${booking.id}`,
          }
        );
        pushSent += result.sent;
      }
    }

    console.log(`✅ Cron check-in reminder: ${emailSent} emails envoyés, ${pushSent} push envoyés`);

    return NextResponse.json({
      success: true,
      processed: bookings.length,
      emailSent,
      emailFailed,
      pushSent,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('❌ Erreur cron check-in reminder:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

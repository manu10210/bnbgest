// Cron Job : Rappels check-in 48h avant
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendCheckInReminderEmail } from '@/lib/email-notifications';

export async function GET(request: Request) {
  try {
    // Vérifier le cron secret pour sécuriser
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🕐 Cron: Envoi des rappels check-in...');

    // Trouver les réservations avec check-in dans 48h
    const now = new Date();
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const in47Hours = new Date(now.getTime() + 47 * 60 * 60 * 1000);

    const upcomingBookings = await prisma.booking.findMany({
      where: {
        checkIn: {
          gte: in47Hours,
          lte: in48Hours,
        },
        status: 'CONFIRMED',
      },
      include: {
        property: {
          select: {
            name: true,
            address: true,
            city: true,
          },
        },
      },
    });

    console.log(`📋 ${upcomingBookings.length} réservations trouvées`);

    // Envoyer les rappels
    const results = [];
    for (const booking of upcomingBookings) {
      try {
        await sendCheckInReminderEmail({
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          checkIn: booking.checkIn,
          property: {
            name: booking.property.name,
            address: booking.property.address,
            city: booking.property.city,
          },
        });

        results.push({
          bookingId: booking.id,
          guestEmail: booking.guestEmail,
          status: 'sent',
        });

        console.log(`✅ Rappel envoyé: Réservation #${booking.id}`);
      } catch (error) {
        console.error(`❌ Erreur rappel #${booking.id}:`, error);
        results.push({
          bookingId: booking.id,
          guestEmail: booking.guestEmail,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.status === 'sent').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    return NextResponse.json({
      success: true,
      message: `Rappels check-in envoyés: ${successCount} succès, ${failedCount} échecs`,
      total: upcomingBookings.length,
      sent: successCount,
      failed: failedCount,
      results,
    });
  } catch (error) {
    console.error('❌ Erreur cron check-in reminders:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Cron job failed' 
      },
      { status: 500 }
    );
  }
}

// API Route pour envoyer des emails de test
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { 
  sendBookingConfirmationEmail,
  sendCheckInReminderEmail,
  sendWelcomeEmail,
} from '@/lib/email-notifications';

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await auth();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, testEmail } = body;

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Email de test requis' },
        { status: 400 }
      );
    }

    // Envoyer un email de test selon le type
    switch (type) {
      case 'booking-confirmation':
        await sendBookingConfirmationEmail({
          id: 999,
          guestName: 'Test User',
          guestEmail: testEmail,
          checkIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 jours
          checkOut: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // +10 jours
          guests: 2,
          totalPrice: 350,
          property: {
            name: 'Villa Test Paradise',
            address: '123 Rue de Test',
            city: 'Paris',
          },
        });
        break;

      case 'checkin-reminder':
        await sendCheckInReminderEmail({
          guestName: 'Test User',
          guestEmail: testEmail,
          checkIn: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // +2 jours
          property: {
            name: 'Villa Test Paradise',
            address: '123 Rue de Test',
            city: 'Paris',
          },
        });
        break;

      case 'welcome':
        await sendWelcomeEmail({
          name: 'Test User',
          email: testEmail,
          role: 'CLIENT',
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Type d\'email invalide' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Email de test ${type} envoyé à ${testEmail}`,
    });
  } catch (error) {
    console.error('Erreur envoi email test:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de l\'email de test' },
      { status: 500 }
    );
  }
}

// GET pour obtenir les types d'emails disponibles
export async function GET() {
  return NextResponse.json({
    emailTypes: [
      {
        type: 'booking-confirmation',
        name: 'Confirmation de réservation',
        description: 'Email envoyé au client après confirmation d\'une réservation',
      },
      {
        type: 'checkin-reminder',
        name: 'Rappel check-in',
        description: 'Email de rappel envoyé 48h avant le check-in',
      },
      {
        type: 'welcome',
        name: 'Email de bienvenue',
        description: 'Email envoyé aux nouveaux utilisateurs',
      },
    ],
    note: 'Configurez RESEND_API_KEY et RESEND_FROM_EMAIL dans les variables d\'environnement',
  });
}

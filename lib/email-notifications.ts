// Service de notifications email pour BNBGest
import { render } from '@react-email/render';
import { sendEmail } from './email';
import {
  BookingConfirmationEmail,
  CheckInReminderEmail,
  CleaningNotificationEmail,
  ReviewReceivedEmail,
} from './email-templates';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Envoyer email de confirmation de réservation
 */
export async function sendBookingConfirmationEmail(booking: {
  id: number;
  guestName: string;
  guestEmail: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  totalPrice: number;
  property: {
    name: string;
    address?: string;
    city?: string;
  };
}) {
  try {
    const checkInFormatted = format(booking.checkIn, 'EEEE d MMMM yyyy', { locale: fr });
    const checkOutFormatted = format(booking.checkOut, 'EEEE d MMMM yyyy', { locale: fr });
    
    const propertyAddress = booking.property.address 
      ? `${booking.property.address}, ${booking.property.city}`
      : booking.property.city || 'Non spécifiée';

    const emailHtml = await render(
      BookingConfirmationEmail({
        guestName: booking.guestName,
        propertyName: booking.property.name,
        checkIn: checkInFormatted,
        checkOut: checkOutFormatted,
        guests: booking.guests,
        totalPrice: booking.totalPrice,
        bookingId: booking.id,
        propertyAddress,
      })
    );

    await sendEmail({
      to: booking.guestEmail,
      subject: `Confirmation de réservation - ${booking.property.name}`,
      html: emailHtml,
    });

    console.log(`✅ Email de confirmation envoyé à ${booking.guestEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur envoi email confirmation:', error);
    throw error;
  }
}

/**
 * Envoyer email de rappel check-in (48h avant)
 */
export async function sendCheckInReminderEmail(booking: {
  guestName: string;
  guestEmail: string;
  checkIn: Date;
  property: {
    name: string;
    address?: string;
    city?: string;
  };
}) {
  try {
    const checkInFormatted = format(booking.checkIn, 'EEEE d MMMM yyyy à 15h00', { locale: fr });
    const propertyAddress = booking.property.address 
      ? `${booking.property.address}, ${booking.property.city}`
      : booking.property.city || 'Non spécifiée';

    const emailHtml = await render(
      CheckInReminderEmail({
        guestName: booking.guestName,
        propertyName: booking.property.name,
        checkIn: checkInFormatted,
        propertyAddress,
        accessInstructions: 'Les instructions d\'accès détaillées vous seront envoyées le jour de votre arrivée.',
      })
    );

    await sendEmail({
      to: booking.guestEmail,
      subject: `Rappel : Votre arrivée demain chez ${booking.property.name}`,
      html: emailHtml,
    });

    console.log(`✅ Email de rappel check-in envoyé à ${booking.guestEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur envoi email rappel:', error);
    throw error;
  }
}

/**
 * Envoyer notification de nettoyage assigné
 */
export async function sendCleaningAssignedEmail(cleaning: {
  scheduledDate: Date;
  assignedTo: string;
  assignedToEmail?: string;
  property: {
    name: string;
    address?: string;
    city?: string;
  };
  notes?: string | null;
}) {
  try {
    if (!cleaning.assignedToEmail) {
      console.warn('⚠️ Pas d\'email pour l\'assigné du nettoyage');
      return { success: false, reason: 'No email' };
    }

    const scheduledDateFormatted = format(cleaning.scheduledDate, 'EEEE d MMMM yyyy', { locale: fr });
    const propertyAddress = cleaning.property.address 
      ? `${cleaning.property.address}, ${cleaning.property.city}`
      : cleaning.property.city || 'Non spécifiée';

    const emailHtml = await render(
      CleaningNotificationEmail({
        cleanerName: cleaning.assignedTo,
        propertyName: cleaning.property.name,
        scheduledDate: scheduledDateFormatted,
        propertyAddress,
        notes: cleaning.notes || undefined,
      })
    );

    await sendEmail({
      to: cleaning.assignedToEmail,
      subject: `Nouveau nettoyage assigné - ${cleaning.property.name}`,
      html: emailHtml,
    });

    console.log(`✅ Email nettoyage envoyé à ${cleaning.assignedToEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur envoi email nettoyage:', error);
    throw error;
  }
}

/**
 * Envoyer notification d'avis reçu au propriétaire
 */
export async function sendReviewReceivedEmail(review: {
  id: number;
  rating: number;
  comment: string;
  booking: {
    guestName: string;
    property: {
      name: string;
      user: {
        name: string | null;
        email: string | null;
      };
    };
  };
}) {
  try {
    const ownerEmail = review.booking.property.user.email;
    
    if (!ownerEmail) {
      console.warn('⚠️ Pas d\'email pour le propriétaire');
      return { success: false, reason: 'No owner email' };
    }

    const emailHtml = await render(
      ReviewReceivedEmail({
        ownerName: review.booking.property.user.name || 'Propriétaire',
        propertyName: review.booking.property.name,
        guestName: review.booking.guestName,
        rating: review.rating,
        comment: review.comment,
        reviewId: review.id,
      })
    );

    await sendEmail({
      to: ownerEmail,
      subject: `Nouvel avis reçu pour ${review.booking.property.name}`,
      html: emailHtml,
    });

    console.log(`✅ Email avis envoyé à ${ownerEmail}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur envoi email avis:', error);
    throw error;
  }
}

/**
 * Envoyer email de bienvenue à un nouvel utilisateur
 */
export async function sendWelcomeEmail(user: {
  name: string | null;
  email: string;
  role: string;
}) {
  try {
    const userName = user.name || 'Utilisateur';
    const roleText = {
      ADMIN: 'Administrateur',
      MANAGER: 'Gestionnaire',
      EMPLOYEE: 'Employé',
      CLIENT: 'Client',
    }[user.role] || user.role;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #FF385C; color: white; padding: 20px; text-align: center;">
            <h1>Bienvenue sur BNBGest !</h1>
          </div>
          
          <div style="padding: 32px; background: #f8f9fa;">
            <p style="font-size: 18px;">Bonjour ${userName},</p>
            
            <p>Nous sommes ravis de vous accueillir sur BNBGest ! 🎉</p>
            
            <p>Votre compte a été créé avec le rôle : <strong>${roleText}</strong></p>
            
            <p>Vous pouvez maintenant accéder à la plateforme et commencer à gérer vos locations courte durée.</p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${process.env.NEXTAUTH_URL}/login" 
                 style="background: #FF385C; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                Se connecter
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Si vous avez des questions, n'hésitez pas à nous contacter.
            </p>
            
            <p style="color: #666; font-size: 14px;">
              L'équipe BNBGest
            </p>
          </div>
        </body>
      </html>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Bienvenue sur BNBGest !',
      html: emailHtml,
    });

    console.log(`✅ Email de bienvenue envoyé à ${user.email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur envoi email bienvenue:', error);
    throw error;
  }
}

// Templates Email pour BNBGest
import { Html, Head, Body, Container, Section, Text, Button, Hr, Img } from '@react-email/components';

interface BookingConfirmationEmailProps {
  guestName: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  bookingId: number;
  propertyAddress?: string;
}

/**
 * Template: Confirmation de réservation
 */
export function BookingConfirmationEmail({
  guestName,
  propertyName,
  checkIn,
  checkOut,
  guests,
  totalPrice,
  bookingId,
  propertyAddress,
}: BookingConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header avec logo */}
          <Section style={styles.header}>
            <Text style={styles.headerTitle}>BNBGest</Text>
          </Section>

          {/* Contenu principal */}
          <Section style={styles.content}>
            <Text style={styles.greeting}>Bonjour {guestName},</Text>
            
            <Text style={styles.paragraph}>
              Votre réservation a été confirmée avec succès ! 🎉
            </Text>

            {/* Détails de la réservation */}
            <Section style={styles.bookingDetails}>
              <Text style={styles.sectionTitle}>Détails de la réservation</Text>
              
              <table style={styles.detailsTable}>
                <tr>
                  <td style={styles.detailLabel}>Propriété :</td>
                  <td style={styles.detailValue}>{propertyName}</td>
                </tr>
                {propertyAddress && (
                  <tr>
                    <td style={styles.detailLabel}>Adresse :</td>
                    <td style={styles.detailValue}>{propertyAddress}</td>
                  </tr>
                )}
                <tr>
                  <td style={styles.detailLabel}>Arrivée :</td>
                  <td style={styles.detailValue}>{checkIn}</td>
                </tr>
                <tr>
                  <td style={styles.detailLabel}>Départ :</td>
                  <td style={styles.detailValue}>{checkOut}</td>
                </tr>
                <tr>
                  <td style={styles.detailLabel}>Voyageurs :</td>
                  <td style={styles.detailValue}>{guests} personne{guests > 1 ? 's' : ''}</td>
                </tr>
                <tr>
                  <td style={styles.detailLabel}>Prix total :</td>
                  <td style={styles.detailValue}><strong>{totalPrice}€</strong></td>
                </tr>
                <tr>
                  <td style={styles.detailLabel}>N° réservation :</td>
                  <td style={styles.detailValue}>#{bookingId}</td>
                </tr>
              </table>
            </Section>

            {/* Bouton d'action */}
            <Section style={styles.buttonSection}>
              <Button
                href={`${process.env.NEXTAUTH_URL}/bookings/${bookingId}`}
                style={styles.button}
              >
                Voir ma réservation
              </Button>
            </Section>

            <Hr style={styles.hr} />

            {/* Informations pratiques */}
            <Text style={styles.paragraph}>
              <strong>Informations importantes :</strong>
            </Text>
            <Text style={styles.bulletPoint}>• Check-in à partir de 15h00</Text>
            <Text style={styles.bulletPoint}>• Check-out avant 11h00</Text>
            <Text style={styles.bulletPoint}>• Un email de rappel vous sera envoyé 48h avant votre arrivée</Text>

            <Hr style={styles.hr} />

            {/* Footer */}
            <Text style={styles.footer}>
              Si vous avez des questions, n'hésitez pas à nous contacter.
            </Text>
            <Text style={styles.footer}>
              L'équipe BNBGest
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

interface CheckInReminderEmailProps {
  guestName: string;
  propertyName: string;
  checkIn: string;
  propertyAddress: string;
  accessInstructions?: string;
}

/**
 * Template: Rappel check-in (48h avant)
 */
export function CheckInReminderEmail({
  guestName,
  propertyName,
  checkIn,
  propertyAddress,
  accessInstructions,
}: CheckInReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.headerTitle}>BNBGest</Text>
          </Section>

          <Section style={styles.content}>
            <Text style={styles.greeting}>Bonjour {guestName},</Text>
            
            <Text style={styles.paragraph}>
              Votre séjour chez <strong>{propertyName}</strong> approche ! ⏰
            </Text>

            <Section style={styles.reminderBox}>
              <Text style={styles.reminderTitle}>Votre arrivée : {checkIn}</Text>
              <Text style={styles.reminderSubtitle}>Check-in à partir de 15h00</Text>
            </Section>

            <Text style={styles.sectionTitle}>Adresse de la propriété</Text>
            <Text style={styles.paragraph}>{propertyAddress}</Text>

            {accessInstructions && (
              <>
                <Text style={styles.sectionTitle}>Instructions d'accès</Text>
                <Text style={styles.paragraph}>{accessInstructions}</Text>
              </>
            )}

            <Hr style={styles.hr} />

            <Text style={styles.footer}>
              Nous vous souhaitons un excellent séjour !<br />
              L'équipe BNBGest
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

interface CleaningNotificationEmailProps {
  cleanerName: string;
  propertyName: string;
  scheduledDate: string;
  propertyAddress: string;
  notes?: string;
}

/**
 * Template: Notification nettoyage assigné
 */
export function CleaningNotificationEmail({
  cleanerName,
  propertyName,
  scheduledDate,
  propertyAddress,
  notes,
}: CleaningNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.headerTitle}>BNBGest</Text>
          </Section>

          <Section style={styles.content}>
            <Text style={styles.greeting}>Bonjour {cleanerName},</Text>
            
            <Text style={styles.paragraph}>
              Un nouveau nettoyage vous a été assigné. 🧹
            </Text>

            <Section style={styles.bookingDetails}>
              <table style={styles.detailsTable}>
                <tr>
                  <td style={styles.detailLabel}>Propriété :</td>
                  <td style={styles.detailValue}>{propertyName}</td>
                </tr>
                <tr>
                  <td style={styles.detailLabel}>Adresse :</td>
                  <td style={styles.detailValue}>{propertyAddress}</td>
                </tr>
                <tr>
                  <td style={styles.detailLabel}>Date prévue :</td>
                  <td style={styles.detailValue}><strong>{scheduledDate}</strong></td>
                </tr>
              </table>
            </Section>

            {notes && (
              <>
                <Text style={styles.sectionTitle}>Notes importantes</Text>
                <Text style={styles.paragraph}>{notes}</Text>
              </>
            )}

            <Section style={styles.buttonSection}>
              <Button
                href={`${process.env.NEXTAUTH_URL}/employee`}
                style={styles.button}
              >
                Voir mes tâches
              </Button>
            </Section>

            <Hr style={styles.hr} />

            <Text style={styles.footer}>
              L'équipe BNBGest
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

interface ReviewReceivedEmailProps {
  ownerName: string;
  propertyName: string;
  guestName: string;
  rating: number;
  comment: string;
  reviewId: number;
}

/**
 * Template: Nouveau avis reçu
 */
export function ReviewReceivedEmail({
  ownerName,
  propertyName,
  guestName,
  rating,
  comment,
  reviewId,
}: ReviewReceivedEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.headerTitle}>BNBGest</Text>
          </Section>

          <Section style={styles.content}>
            <Text style={styles.greeting}>Bonjour {ownerName},</Text>
            
            <Text style={styles.paragraph}>
              Vous avez reçu un nouvel avis pour <strong>{propertyName}</strong> ! ⭐
            </Text>

            <Section style={styles.reviewBox}>
              <Text style={styles.ratingText}>
                {'⭐'.repeat(rating)} ({rating}/5)
              </Text>
              <Text style={styles.reviewAuthor}>Par {guestName}</Text>
              <Text style={styles.reviewComment}>"{comment}"</Text>
            </Section>

            <Section style={styles.buttonSection}>
              <Button
                href={`${process.env.NEXTAUTH_URL}/admin/reviews`}
                style={styles.button}
              >
                Répondre à l'avis
              </Button>
            </Section>

            <Hr style={styles.hr} />

            <Text style={styles.footer}>
              L'équipe BNBGest
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles communs pour tous les templates
const styles = {
  body: {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  container: {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0',
    maxWidth: '600px',
  },
  header: {
    backgroundColor: '#FF385C',
    padding: '20px',
    textAlign: 'center' as const,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0',
  },
  content: {
    padding: '32px',
  },
  greeting: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
  },
  paragraph: {
    fontSize: '16px',
    lineHeight: '24px',
    marginBottom: '16px',
    color: '#333333',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginTop: '24px',
    marginBottom: '12px',
    color: '#333333',
  },
  bookingDetails: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    marginTop: '16px',
    marginBottom: '16px',
  },
  detailsTable: {
    width: '100%',
    borderSpacing: '0',
  },
  detailLabel: {
    fontSize: '14px',
    color: '#666666',
    paddingBottom: '8px',
    paddingRight: '16px',
  },
  detailValue: {
    fontSize: '14px',
    color: '#333333',
    paddingBottom: '8px',
    fontWeight: '500',
  },
  buttonSection: {
    textAlign: 'center' as const,
    marginTop: '32px',
    marginBottom: '32px',
  },
  button: {
    backgroundColor: '#FF385C',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 32px',
  },
  hr: {
    borderColor: '#e6e6e6',
    margin: '24px 0',
  },
  bulletPoint: {
    fontSize: '14px',
    lineHeight: '20px',
    marginBottom: '8px',
    color: '#666666',
  },
  footer: {
    fontSize: '14px',
    color: '#999999',
    textAlign: 'center' as const,
    marginTop: '16px',
  },
  reminderBox: {
    backgroundColor: '#fff3cd',
    border: '2px solid #ffc107',
    borderRadius: '8px',
    padding: '20px',
    marginTop: '16px',
    marginBottom: '16px',
    textAlign: 'center' as const,
  },
  reminderTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: '8px',
  },
  reminderSubtitle: {
    fontSize: '14px',
    color: '#856404',
  },
  reviewBox: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '20px',
    marginTop: '16px',
    marginBottom: '16px',
  },
  ratingText: {
    fontSize: '24px',
    marginBottom: '8px',
  },
  reviewAuthor: {
    fontSize: '14px',
    color: '#666666',
    marginBottom: '12px',
  },
  reviewComment: {
    fontSize: '16px',
    fontStyle: 'italic',
    color: '#333333',
    lineHeight: '24px',
  },
};

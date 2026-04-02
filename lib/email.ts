// Service Email avec Resend
import { Resend } from 'resend';

// Vérifier que la clé API est configurée
if (!process.env.RESEND_API_KEY) {
  console.warn('⚠️ RESEND_API_KEY non configurée - Les emails ne seront pas envoyés');
}

// Initialiser Resend seulement si la clé existe
let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

// Email de l'expéditeur (doit être vérifié dans Resend)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'BNBGest <noreply@bnbgest.com>';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Envoyer un email via Resend
 */
export async function sendEmail(options: EmailOptions) {
  try {
    if (!process.env.RESEND_API_KEY || !resend) {
      console.log('📧 [DEV] Email simulé:', {
        to: options.to,
        subject: options.subject,
      });
      return { success: true, id: 'dev-mode' };
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error('❌ Erreur envoi email:', error);
      throw error;
    }

    console.log('✅ Email envoyé:', data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
    throw error;
  }
}

/**
 * Envoyer plusieurs emails en batch
 */
export async function sendBatchEmails(emails: EmailOptions[]) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log('📧 [DEV] Batch emails simulé:', emails.length, 'emails');
      return { success: true, count: emails.length };
    }

    const results = await Promise.all(
      emails.map(email => sendEmail(email))
    );

    return {
      success: true,
      count: results.length,
      results,
    };
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi batch:', error);
    throw error;
  }
}

export { resend };

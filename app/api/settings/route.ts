export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { prisma } from '../../../lib/prisma';
import { Prisma } from '@prisma/client';

export const runtime = 'nodejs';

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  }
  return { session };
}

function buildResponse(user: {
  name: string | null;
  email: string;
  profile: {
    phone: string | null;
    company: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
    website: string | null;
    bio: string | null;
    timezone: string;
    language: string;
    currency: string;
  } | null;
  settings: {
    twoFactorEnabled: boolean;
    autoBackupEnabled: boolean;
    backupFrequency: string;
    backupTime: string;
    retentionDays: number;
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    dateFormat: string;
    timeFormat: string;
    numberFormat: string;
    firstDayOfWeek: number;
    notificationsMatrix?: Prisma.JsonValue | null;
    notificationContacts?: Prisma.JsonValue | null;
    customAlerts?: Prisma.JsonValue | null;
    securitySessions?: Prisma.JsonValue | null;
    securityApiKeys?: Prisma.JsonValue | null;
    backupHistory?: Prisma.JsonValue | null;
  } | null;
}) {
  return {
    profile: {
      name: user.name ?? '',
      email: user.email,
      phone: user.profile?.phone ?? '',
      company: user.profile?.company ?? '',
      address: user.profile?.address ?? '',
      city: user.profile?.city ?? '',
      postalCode: user.profile?.postalCode ?? '',
      country: user.profile?.country ?? 'France',
      website: user.profile?.website ?? '',
      bio: user.profile?.bio ?? '',
      timezone: user.profile?.timezone ?? 'Europe/Paris',
      language: user.profile?.language ?? 'fr',
      currency: user.profile?.currency ?? 'EUR',
    },
    language: {
      language: user.profile?.language ?? 'fr',
      timezone: user.profile?.timezone ?? 'Europe/Paris',
      currency: user.profile?.currency ?? 'EUR',
      dateFormat: user.settings?.dateFormat ?? 'DD/MM/YYYY',
      timeFormat: user.settings?.timeFormat ?? '24h',
      numberFormat: user.settings?.numberFormat ?? 'space',
      firstDayOfWeek: String(user.settings?.firstDayOfWeek ?? 1),
    },
    notifications: {
      emailNotifications: user.settings?.emailNotifications ?? true,
      smsNotifications: user.settings?.smsNotifications ?? false,
      pushNotifications: user.settings?.pushNotifications ?? true,
      matrix: user.settings?.notificationsMatrix ?? null,
      contacts: user.settings?.notificationContacts ?? null,
    },
    security: {
      twoFactorEnabled: user.settings?.twoFactorEnabled ?? false,
      sessions: user.settings?.securitySessions ?? null,
      apiKeys: user.settings?.securityApiKeys ?? null,
    },
    database: {
      autoBackup: user.settings?.autoBackupEnabled ?? true,
      backupFrequency: user.settings?.backupFrequency ?? 'daily',
      backupTime: user.settings?.backupTime ?? '03:00',
      retentionDays: String(user.settings?.retentionDays ?? 30),
      backups: user.settings?.backupHistory ?? null,
    },
    alerts: {
      items: user.settings?.customAlerts ?? null,
    },
  };
}

// GET /api/settings
export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const email = session!.user!.email!.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        settings: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    return NextResponse.json(buildResponse(user));
  } catch (err) {
    console.error('GET /api/settings error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/settings
export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const email = session!.user!.email!.toLowerCase().trim();

    const currentUser = await prisma.user.findUnique({ where: { email } });
    if (!currentUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      if (body.profile) {
        const profile = body.profile;

        if (profile.name || profile.name === '') {
          await tx.user.update({
            where: { id: currentUser.id },
            data: { name: profile.name || null },
          });
        }

        if (profile.email && profile.email !== currentUser.email) {
          await tx.user.update({
            where: { id: currentUser.id },
            data: { email: String(profile.email).toLowerCase().trim() },
          });
        }

        await tx.userProfile.upsert({
          where: { userId: currentUser.id },
          create: {
            userId: currentUser.id,
            phone: profile.phone || null,
            company: profile.company || null,
            address: profile.address || null,
            city: profile.city || null,
            postalCode: profile.postalCode || null,
            country: profile.country || null,
            website: profile.website || null,
            bio: profile.bio || null,
            timezone: profile.timezone || 'Europe/Paris',
            language: profile.language || 'fr',
            currency: profile.currency || 'EUR',
          },
          update: {
            phone: profile.phone || null,
            company: profile.company || null,
            address: profile.address || null,
            city: profile.city || null,
            postalCode: profile.postalCode || null,
            country: profile.country || null,
            website: profile.website || null,
            bio: profile.bio || null,
            timezone: profile.timezone || 'Europe/Paris',
            language: profile.language || 'fr',
            currency: profile.currency || 'EUR',
          },
        });
      }

      const shouldUpdateSettings = Boolean(body.language || body.notifications || body.security || body.database);

      if (shouldUpdateSettings) {
        const language = body.language || {};
        const notifications = body.notifications || {};
        const security = body.security || {};
        const database = body.database || {};
  const alerts = body.alerts || {};

        await tx.userSettings.upsert({
          where: { userId: currentUser.id },
          create: {
            userId: currentUser.id,
            twoFactorEnabled: Boolean(security.twoFactorEnabled ?? false),
            autoBackupEnabled: Boolean(database.autoBackup ?? true),
            backupFrequency: database.backupFrequency || 'daily',
            backupTime: database.backupTime || '03:00',
            retentionDays: Number(database.retentionDays ?? 30),
            emailNotifications: Boolean(notifications.emailNotifications ?? true),
            smsNotifications: Boolean(notifications.smsNotifications ?? false),
            pushNotifications: Boolean(notifications.pushNotifications ?? true),
            dateFormat: language.dateFormat || 'DD/MM/YYYY',
            timeFormat: language.timeFormat || '24h',
            numberFormat: language.numberFormat || 'space',
            firstDayOfWeek: Number(language.firstDayOfWeek ?? 1),
            notificationsMatrix: notifications.matrix
              ? (notifications.matrix as Prisma.InputJsonValue)
              : undefined,
            notificationContacts: notifications.contacts
              ? (notifications.contacts as Prisma.InputJsonValue)
              : undefined,
            customAlerts: alerts.items
              ? (alerts.items as Prisma.InputJsonValue)
              : undefined,
            securitySessions: security.sessions
              ? (security.sessions as Prisma.InputJsonValue)
              : undefined,
            securityApiKeys: security.apiKeys
              ? (security.apiKeys as Prisma.InputJsonValue)
              : undefined,
            backupHistory: database.backups
              ? (database.backups as Prisma.InputJsonValue)
              : undefined,
          } as Prisma.UserSettingsUncheckedCreateInput,
          update: {
            ...(security.twoFactorEnabled !== undefined ? { twoFactorEnabled: Boolean(security.twoFactorEnabled) } : {}),
            ...(database.autoBackup !== undefined ? { autoBackupEnabled: Boolean(database.autoBackup) } : {}),
            ...(database.backupFrequency ? { backupFrequency: database.backupFrequency } : {}),
            ...(database.backupTime ? { backupTime: database.backupTime } : {}),
            ...(database.retentionDays !== undefined ? { retentionDays: Number(database.retentionDays) } : {}),
            ...(notifications.emailNotifications !== undefined
              ? { emailNotifications: Boolean(notifications.emailNotifications) }
              : {}),
            ...(notifications.smsNotifications !== undefined
              ? { smsNotifications: Boolean(notifications.smsNotifications) }
              : {}),
            ...(notifications.pushNotifications !== undefined
              ? { pushNotifications: Boolean(notifications.pushNotifications) }
              : {}),
            ...(language.dateFormat ? { dateFormat: language.dateFormat } : {}),
            ...(language.timeFormat ? { timeFormat: language.timeFormat } : {}),
            ...(language.numberFormat ? { numberFormat: language.numberFormat } : {}),
            ...(language.firstDayOfWeek !== undefined ? { firstDayOfWeek: Number(language.firstDayOfWeek) } : {}),
            ...(notifications.matrix !== undefined
              ? { notificationsMatrix: notifications.matrix as Prisma.InputJsonValue }
              : {}),
            ...(notifications.contacts !== undefined
              ? { notificationContacts: notifications.contacts as Prisma.InputJsonValue }
              : {}),
            ...(alerts.items !== undefined
              ? { customAlerts: alerts.items as Prisma.InputJsonValue }
              : {}),
            ...(security.sessions !== undefined
              ? { securitySessions: security.sessions as Prisma.InputJsonValue }
              : {}),
            ...(security.apiKeys !== undefined
              ? { securityApiKeys: security.apiKeys as Prisma.InputJsonValue }
              : {}),
            ...(database.backups !== undefined
              ? { backupHistory: database.backups as Prisma.InputJsonValue }
              : {}),
          } as Prisma.UserSettingsUncheckedUpdateInput,
        });

        if (body.language) {
          await tx.userProfile.upsert({
            where: { userId: currentUser.id },
            create: {
              userId: currentUser.id,
              timezone: language.timezone || 'Europe/Paris',
              language: language.language || 'fr',
              currency: language.currency || 'EUR',
            },
            update: {
              ...(language.timezone ? { timezone: language.timezone } : {}),
              ...(language.language ? { language: language.language } : {}),
              ...(language.currency ? { currency: language.currency } : {}),
            },
          });
        }
      }
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { profile: true, settings: true },
    });

    return NextResponse.json({
      success: true,
      settings: updatedUser ? buildResponse(updatedUser) : null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    if (message.includes('Unique constraint failed') && message.toLowerCase().includes('email')) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
    }
    console.error('POST /api/settings error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

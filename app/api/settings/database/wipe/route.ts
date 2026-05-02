import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const REQUIRED_CONFIRMATION = 'VIDER MA BASE';

const ALL_APP_TABLES = [
  'guest_profiles',
  'accounts',
  'sessions',
  'verification_tokens',
  'password_reset_tokens',
  'app_credentials',
  'user_profiles',
  'user_settings',
  'properties',
  'bookings',
  'payments',
  'reviews',
  'photos',
  'videos',
  'cleanings',
  'maintenance_tasks',
  'inventory_items',
  'contracts',
  'integration_settings',
  'notification_preferences',
  'notification_logs',
  'backups',
  'analytics_events',
  'audit_logs',
  'expenses',
  'property_inspections',
  'access_codes',
  'message_threads',
  'messages',
  'web_vitals',
  'invoices',
  'invoice_lines',
  'users',
] as const;

const KEEP_AUTH_TABLES = new Set<string>([
  'users',
  'accounts',
  'sessions',
  'app_credentials',
  'user_profiles',
  'user_settings',
]);

function quoteIdentifier(identifier: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Identifiant SQL invalide: ${identifier}`);
  }
  return `"${identifier}"`;
}

// POST /api/settings/database/wipe
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const confirmation = String(body?.confirmation ?? '').trim();
    const preserveCurrentUser = Boolean(body?.preserveCurrentUser ?? true);

    if (confirmation !== REQUIRED_CONFIRMATION) {
      return NextResponse.json(
        { error: `Confirmation invalide. Entrez exactement: ${REQUIRED_CONFIRMATION}` },
        { status: 400 }
      );
    }

    const existing = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `;

    const existingSet = new Set(existing.map((row) => row.tablename));
    const targetTables = ALL_APP_TABLES.filter((tableName) => {
      if (!existingSet.has(tableName)) return false;
      if (preserveCurrentUser && KEEP_AUTH_TABLES.has(tableName)) return false;
      return true;
    });

    if (targetTables.length > 0) {
      const tableList = targetTables.map(quoteIdentifier).join(', ');
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`
      );
    }

    return NextResponse.json({
      success: true,
      truncatedTables: targetTables,
      preservedAuthData: preserveCurrentUser,
    });
  } catch (error) {
    console.error('POST /api/settings/database/wipe error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
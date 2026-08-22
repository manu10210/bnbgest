import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { mergeIdentity, normalizeLabel, readIdentity } from '@/lib/property-identity';

export async function POST(request: Request) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const sessionUser = authResult.user as {
      id?: string | null;
      email?: string | null;
      name?: string | null;
      role?: string | null;
    };

    const normalizedEmail = (sessionUser.email || '').trim().toLowerCase();
    const normalizedRole = String(sessionUser.role || 'USER').toUpperCase();
    const dbRole = normalizedRole === 'ADMIN' || normalizedRole === 'EMPLOYEE' || normalizedRole === 'USER'
      ? normalizedRole
      : 'USER';

    let owner = sessionUser.id
      ? await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { id: true } })
      : null;

    if (!owner && normalizedEmail) {
      owner = await prisma.user.upsert({
        where: { email: normalizedEmail },
        update: {
          ...(sessionUser.name ? { name: sessionUser.name } : {}),
        },
        create: {
          email: normalizedEmail,
          name: sessionUser.name || normalizedEmail.split('@')[0],
          role: dbRole,
        },
        select: { id: true },
      });
    }

    if (!owner) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { propertyIds, newName, mainPropertyId } = await request.json();

    const normalizedPropertyIds = Array.isArray(propertyIds)
      ? Array.from(new Set(propertyIds.map((id: unknown) => Number(id)).filter((id: number) => Number.isInteger(id) && id > 0)))
      : [];

    if (normalizedPropertyIds.length < 2) {
      return NextResponse.json({ success: false, error: 'Veuillez fournir au moins deux propriétés à fusionner' }, { status: 400 });
    }

    // Fetch all properties with their latest booking
    const properties = await prisma.property.findMany({
      where: { 
        id: { in: normalizedPropertyIds },
        userId: owner.id
      },
      include: {
        bookings: {
          orderBy: { checkIn: 'desc' },
          take: 1
        }
      }
    });

    if (properties.length !== normalizedPropertyIds.length) {
      return NextResponse.json({ success: false, error: 'Certaines propriétés sont introuvables ou ne vous appartiennent pas' }, { status: 404 });
    }

    // Find the one with the most recent booking (fallback: most recent property creation date)
    const getReferenceTs = (property: typeof properties[number]) => {
      if (property.bookings.length > 0) {
        return new Date(property.bookings[0].checkIn).getTime();
      }
      return new Date(property.createdAt).getTime();
    };

    const requestedMain = Number(mainPropertyId);
    const mainProperty = properties.find(p => p.id === requestedMain) ?? properties.reduce((best, candidate) => {
      return getReferenceTs(candidate) > getReferenceTs(best) ? candidate : best;
    }, properties[0]);

    const sourcePropertyIds = properties.filter(p => p.id !== mainProperty.id).map(p => p.id);

    if (sourcePropertyIds.length === 0) {
      return NextResponse.json({
        success: true,
        mainPropertyId: mainProperty.id,
        mergedIds: [],
      });
    }

    // Transaction for merging
    await prisma.$transaction(async (tx) => {
      // 1. Move Bookings
      await tx.booking.updateMany({
        where: { propertyId: { in: sourcePropertyIds } },
        data: { propertyId: mainProperty.id }
      });

      // 2. Move Expenses
      await tx.expense.updateMany({
        where: { propertyId: { in: sourcePropertyIds } },
        data: { propertyId: mainProperty.id }
      });

      // 3. Move Inspections
      await tx.propertyInspection.updateMany({
        where: { propertyId: { in: sourcePropertyIds } },
        data: { propertyId: mainProperty.id }
      });

      // 4. Move all other useful linked business entities
      await tx.cleaning.updateMany({
        where: { propertyId: { in: sourcePropertyIds } },
        data: { propertyId: mainProperty.id }
      });

      await tx.maintenanceTask.updateMany({
        where: { propertyId: { in: sourcePropertyIds } },
        data: { propertyId: mainProperty.id }
      });

      await tx.inventoryItem.updateMany({
        where: { propertyId: { in: sourcePropertyIds } },
        data: { propertyId: mainProperty.id }
      });

      await tx.contract.updateMany({
        where: { propertyId: { in: sourcePropertyIds } },
        data: { propertyId: mainProperty.id }
      });

      await tx.review.updateMany({
        where: { propertyId: { in: sourcePropertyIds } },
        data: { propertyId: mainProperty.id }
      });

      await tx.photo.updateMany({
        where: { propertyId: { in: sourcePropertyIds } },
        data: { propertyId: mainProperty.id }
      });

      await tx.video.updateMany({
        where: { propertyId: { in: sourcePropertyIds } },
        data: { propertyId: mainProperty.id }
      });

      await tx.accessCode.updateMany({
        where: { propertyId: { in: sourcePropertyIds } },
        data: { propertyId: mainProperty.id }
      });

      await tx.messageThread.updateMany({
        where: { propertyId: { in: sourcePropertyIds } },
        data: { propertyId: mainProperty.id }
      });

      await tx.invoice.updateMany({
        where: { propertyId: { in: sourcePropertyIds } },
        data: { propertyId: mainProperty.id }
      });

      // 5. Mark old properties as INACTIVE
      await tx.property.updateMany({
        where: { id: { in: sourcePropertyIds } },
        data: { status: 'INACTIVE' }
      });

      // 5b. La principale hérite des noms, alias et identifiants d'annonce des
      // doublons : le prochain mail portant l'ancien nom ira au bon logement.
      const sources = properties.filter(p => p.id !== mainProperty.id);
      const inherited = mergeIdentity(mainProperty.metadata, {
        aliases: sources.flatMap(p => [p.name, ...readIdentity(p.metadata).aliases]),
        airbnbListingIds: sources.flatMap(p => readIdentity(p.metadata).airbnbListingIds),
      });
      await tx.property.update({ where: { id: mainProperty.id }, data: { metadata: inherited } });

      // 5c. Et l'importateur Gmail apprend l'alias (table de décisions).
      const platform = `gmail_property_decisions:${owner.id}`;
      const decisions = await tx.integrationSetting.findUnique({ where: { platform } });
      const cfg = (decisions?.config && typeof decisions.config === 'object' ? decisions.config : {}) as { aliases?: Record<string, string>; rejectedLabels?: string[] };
      const aliases = { ...(cfg.aliases || {}) };
      for (const p of sources) aliases[normalizeLabel(p.name)] = newName || mainProperty.name;
      await tx.integrationSetting.upsert({
        where: { platform },
        update: { config: { ...cfg, aliases, updatedAt: new Date().toISOString() } },
        create: { platform, enabled: true, syncStatus: 'manual', lastSyncAt: new Date(), config: { aliases, rejectedLabels: cfg.rejectedLabels || [], updatedAt: new Date().toISOString() } },
      });

      // 6. Update main property name if requested
      if (newName) {
        await tx.property.update({
          where: { id: mainProperty.id },
          data: { name: newName }
        });
      }
    });

    return NextResponse.json({ success: true, mainPropertyId: mainProperty.id, mergedIds: sourcePropertyIds });
  } catch (error) {
    console.error('Merge error:', error);
    return NextResponse.json({ success: false, error: 'Une erreur est survenue lors de la fusion' }, { status: 500 });
  }
}

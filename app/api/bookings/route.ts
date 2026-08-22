export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { BookingSource, BookingStatus, Role } from '@prisma/client';
import { sendBookingConfirmationEmail } from '@/lib/email-notifications';
import { requireAuth } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';
import { BookingSchema, validateRequest } from '@/lib/validations';
import {
  bookingContainsConfirmationCode,
  computeGuestIdentityCandidates,
  normalizeConfirmationCode,
  normalizeGuestEmail,
  normalizeGuestPhone,
} from '@/lib/guest-identity';
import { cleanGuestName, extractConfirmationCode, findByListingId, learnListingId, loadIdentities } from '@/lib/property-identity';

/**
 * GET /api/bookings
 * Récupère toutes les réservations avec filtres
 * ✅ Protected: Auth required, Rate limited (relaxed: 100/10s)
 */
export async function GET(request: Request) {
  // 1. Rate limiting
  const rateLimitResult = await rateLimit(request, 'relaxed');
  if (rateLimitResult) return rateLimitResult;

  // 2. Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const confirmationCodeFilter = searchParams.get('confirmationCode');
  const externalIdFilter = searchParams.get('externalId');

    const bookings = await prisma.booking.findMany({
      where: {
        ...(propertyId && { propertyId: parseInt(propertyId) }),
        ...(status && { status: status as BookingStatus }),
        ...(source && { source: source as BookingSource }),
        ...(startDate && endDate && {
          AND: [
            { checkIn:  { lt: new Date(endDate)   } },
            { checkOut: { gt: new Date(startDate) } },
          ],
        }),
        ...(confirmationCodeFilter && {
          OR: [
            { confirmationCode: { equals: confirmationCodeFilter, mode: 'insensitive' } },
            { specialRequests: { contains: confirmationCodeFilter, mode: 'insensitive' } },
          ],
        }),
        ...(externalIdFilter && {
          externalId: externalIdFilter,
        }),
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
        payments: true,
        reviews: true,
      },
      orderBy: {
        checkIn: 'desc',
      },
    });

    // Calculer les statistiques
    const stats = {
      total: bookings.length,
      confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
      pending: bookings.filter(b => b.status === 'PENDING').length,
      checkedIn: bookings.filter(b => b.status === 'CHECKED_IN').length,
      checkedOut: bookings.filter(b => b.status === 'CHECKED_OUT').length,
      cancelled: bookings.filter(b => b.status === 'CANCELLED').length,
      totalRevenue: bookings
        .filter(b => b.status === 'CHECKED_OUT')
        .reduce((sum, b) => sum + b.totalPrice, 0),
    };

    return NextResponse.json({
      success: true,
      count: bookings.length,
      bookings,
      stats,
    });
  } catch (error) {
    console.error('GET /api/bookings error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch bookings' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings
 * Crée une nouvelle réservation
 * ✅ Protected: Auth required, Rate limited (strict: 10/10s), Validated
 */
export async function POST(request: Request) {
  // 1. Rate limiting
  const rateLimitResult = await rateLimit(request, 'relaxed');
  if (rateLimitResult) return rateLimitResult;

  // 2. Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    // 3. Validation with Zod
    const validatedData = await validateRequest(BookingSchema, request);
    const sessionUser = authResult.user as {
      id?: string | null;
      email?: string | null;
      name?: string | null;
      role?: string | null;
    };

    const normalizedEmail = (sessionUser.email || '').trim().toLowerCase();
    
    // Resolve the effective DB owner user
    let owner = sessionUser.id
      ? await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { id: true } })
      : null;

    if (!owner && normalizedEmail) {
      const dbRole = String(sessionUser.role || 'USER').toUpperCase();
      const validRole = dbRole === 'ADMIN' || dbRole === 'EMPLOYEE' || dbRole === 'USER' ? dbRole : 'USER';
      owner = await prisma.user.upsert({
        where: { email: normalizedEmail },
        update: {
          ...(sessionUser.name ? { name: sessionUser.name } : {}),
        },
        create: {
          email: normalizedEmail,
          name: sessionUser.name || normalizedEmail.split('@')[0],
          role: validRole as Role,
        },
        select: { id: true },
      });
    }

    if (!owner) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - unable to resolve authenticated DB user' },
        { status: 403 },
      );
    }
    
    const sessionUserId = owner.id;

    const normalizedGuestName = cleanGuestName(validatedData.guestName);
    const normalizedGuestEmail = normalizeGuestEmail(validatedData.guestEmail) || '';
    const normalizedGuestPhone = normalizeGuestPhone(validatedData.guestPhone);
    // Code de confirmation : champ dédié, sinon récupéré dans les notes
    // (les imports de versements le laissaient uniquement dans specialRequests).
    const normalizedConfirmationCode = normalizeConfirmationCode(validatedData.confirmationCode)
      || extractConfirmationCode(validatedData.specialRequests, validatedData.notes);
    const normalizedExternalId = typeof validatedData.externalId === 'string' && validatedData.externalId.trim().length > 0
      ? validatedData.externalId.trim()
      : null;

    // Ancre stable : si l'identifiant d'annonce Airbnb est déjà connu sur une
    // propriété, c'est ELLE qui reçoit la réservation, quel que soit le nom
    // deviné côté client. Sinon on l'apprend sur la propriété choisie.
    const listingId = typeof validatedData.airbnbListingId === 'string' ? validatedData.airbnbListingId : null;
    let listingDecision: string | null = null;
    if (listingId) {
      const identities = await loadIdentities(prisma, owner.id);
      const known = findByListingId(identities, listingId);
      if (known && known.id !== validatedData.propertyId) {
        listingDecision = `property_redirected_by_listing_id:${validatedData.propertyId}=>${known.id}`;
        validatedData.propertyId = known.id;
      } else if (!known) {
        const learned = await learnListingId(prisma, owner.id, validatedData.propertyId, listingId);
        if (learned.learned) listingDecision = `listing_id_learned:${listingId}=>${validatedData.propertyId}`;
      }
    }

    // Déduplication idempotente primaire via ID externe (message Gmail)
    if (normalizedExternalId) {
      const duplicateByExternalId = await prisma.booking.findFirst({
        where: {
          propertyId: validatedData.propertyId,
          source: (validatedData.source as BookingSource) ?? 'AIRBNB',
          externalId: normalizedExternalId,
        },
        include: {
          property: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
              price: true,
            },
          },
        },
      });

      if (duplicateByExternalId) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          dedupeReason: 'external_id',
          booking: duplicateByExternalId,
        });
      }
    }

    // Déduplication primaire via code de confirmation Airbnb — un code Airbnb
    // est unique : on cherche sur TOUTES les propriétés (un doublon créé sur
    // une propriété renommée ne doit pas passer).
    if (normalizedConfirmationCode) {
      const duplicateByCode = await prisma.booking.findFirst({
        where: {
          property: { userId: owner.id },
          OR: [
            { confirmationCode: { equals: normalizedConfirmationCode, mode: 'insensitive' } },
            { specialRequests: { contains: normalizedConfirmationCode, mode: 'insensitive' } },
          ],
        },
        include: {
          property: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
              price: true,
            },
          },
        },
      });

      if (duplicateByCode) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          dedupeReason: duplicateByCode.propertyId === validatedData.propertyId ? 'confirmation_code' : 'confirmation_code_other_property',
          booking: duplicateByCode,
        });
      }
    }

    // Déduplication secondaire via identité voyageur + même plage de dates
    const incomingIdentityKeys = computeGuestIdentityCandidates({
      name: normalizedGuestName,
      email: normalizedGuestEmail,
      phone: normalizedGuestPhone,
    });

    if (incomingIdentityKeys.length > 0) {
      const sameRangeCandidates = await prisma.booking.findMany({
        where: {
          propertyId: validatedData.propertyId,
          checkIn: new Date(validatedData.checkIn),
          checkOut: new Date(validatedData.checkOut),
        },
        include: {
          property: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
              price: true,
            },
          },
        },
      });

      const duplicateByIdentity = sameRangeCandidates.find((candidate) => {
        const candidateIdentityKeys = computeGuestIdentityCandidates({
          name: candidate.guestName,
          email: candidate.guestEmail,
          phone: candidate.guestPhone,
        });

        const hasIdentityMatch = candidateIdentityKeys.some((key) => incomingIdentityKeys.includes(key));
        if (hasIdentityMatch) return true;

        return (
          !!normalizedConfirmationCode
          && (
            normalizeConfirmationCode(candidate.confirmationCode) === normalizedConfirmationCode
            || bookingContainsConfirmationCode(candidate.specialRequests, normalizedConfirmationCode)
          )
        );
      });

      if (duplicateByIdentity) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          dedupeReason: 'identity_and_date_range',
          booking: duplicateByIdentity,
        });
      }
    }

    // Vérifier disponibilité
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        propertyId: validatedData.propertyId,
        status: {
          in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'],
        },
        OR: [
          {
            checkIn: {
              lte: new Date(validatedData.checkOut),
            },
            checkOut: {
              gte: new Date(validatedData.checkIn),
            },
          },
        ],
      },
    });

    if (overlappingBookings.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Property not available for selected dates' },
        { status: 409 }
      );
    }

    const booking = await prisma.booking.create({
      data: {
        userId: sessionUserId,
        propertyId: validatedData.propertyId,
        guestName: normalizedGuestName,
        guestEmail: normalizedGuestEmail,
        guestPhone: normalizedGuestPhone,
        checkIn: new Date(validatedData.checkIn),
        checkOut: new Date(validatedData.checkOut),
        guests: validatedData.guests,
        totalPrice: validatedData.totalPrice,
        notes: validatedData.notes ?? null,
        specialRequests: validatedData.specialRequests ?? null,
        confirmationCode: normalizedConfirmationCode,
  externalId: normalizedExternalId,
        status: (validatedData.status as BookingStatus) ?? 'PENDING',
        source: (validatedData.source as BookingSource) ?? 'DIRECT',
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            price: true,
          },
        },
      },
    });

    // Envoyer email de confirmation si status CONFIRMED
    if (booking.status === 'CONFIRMED') {
      try {
        const prop = booking.property;
        await sendBookingConfirmationEmail({
          id: booking.id,
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          guests: booking.guests,
          totalPrice: booking.totalPrice,
          property: {
            name: prop?.name ?? '',
            address: prop?.address ?? '',
            city: prop?.city ?? '',
          },
        });
        console.log('✅ Email de confirmation envoyé');
      } catch (emailError) {
        console.error('⚠️ Erreur envoi email (non bloquant):', emailError);
        // Ne pas bloquer la création si l'email échoue
      }
    }

    return NextResponse.json(
      {
        success: true,
        ...(listingDecision ? { listingDecision } : {}),
        booking,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/bookings error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create booking' 
      },
      { status: 500 }
    );
  }
}

/**
 * Authentication Middleware
 * Protège les routes API et vérifie les permissions
 */

import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Vérifie si l'utilisateur est authentifié
 * @returns Session si authentifié, NextResponse 401 sinon
 */
export async function requireAuth(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized - Authentication required' 
        },
        { 
          status: 401,
          headers: {
            'WWW-Authenticate': 'Bearer realm="API"'
          }
        }
      );
    }
    
    return session;
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Authentication failed' 
      },
      { status: 401 }
    );
  }
}

/**
 * Vérifie si l'utilisateur a un rôle spécifique
 * @param role - Rôle requis (ADMIN, OWNER, EMPLOYEE, etc.)
 */
export async function requireRole(request: Request, role: string | string[]) {
  const session = await requireAuth(request);
  
  // Si déjà une erreur (401), la retourner
  if (session instanceof NextResponse) {
    return session;
  }
  
  const allowedRoles = Array.isArray(role) ? role : [role];
  const userRole = session.user.role || 'USER';
  
  // ADMIN a accès à tout
  if (userRole === 'ADMIN') {
    return session;
  }
  
  // Vérifier si le rôle est autorisé
  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json(
      { 
        success: false,
        error: `Forbidden - ${allowedRoles.join(' or ')} role required`,
        currentRole: userRole
      },
      { status: 403 }
    );
  }
  
  return session;
}

/**
 * Vérifie si l'utilisateur est propriétaire d'une ressource
 * @param resourceId - ID de la ressource (Number pour property/booking/cleaning, String pour autres)
 * @param resourceType - Type de ressource (property, booking, cleaning, maintenance)
 */
export async function requireOwnership(
  request: Request,
  resourceId: number | string,
  resourceType: 'property' | 'booking' | 'cleaning' | 'maintenance'
) {
  const session = await requireAuth(request);
  
  if (session instanceof NextResponse) {
    return session;
  }
  
  // ADMIN bypass ownership check
  if (session.user.role === 'ADMIN') {
    return session;
  }
  
  try {
    let resource: { userId: string } | null = null;
    
    // Récupérer la ressource selon le type
    switch (resourceType) {
      case 'property':
        const property = await prisma.property.findUnique({
          where: { id: Number(resourceId) },
          select: { userId: true }
        });
        resource = property;
        break;
        
      case 'booking':
        const booking = await prisma.booking.findUnique({
          where: { id: Number(resourceId) },
          include: { 
            property: {
              select: { userId: true }
            }
          }
        });
        // Pour booking, vérifier le owner de la property
        if (booking) {
          resource = { userId: booking.property.userId };
        }
        break;
        
      case 'cleaning':
        const cleaning = await prisma.cleaning.findUnique({
          where: { id: Number(resourceId) },
          include: { 
            property: {
              select: { userId: true }
            }
          }
        });
        if (cleaning) {
          resource = { userId: cleaning.property.userId };
        }
        break;
        
      case 'maintenance':
        const maintenance = await prisma.maintenanceTask.findUnique({
          where: { id: Number(resourceId) },
          include: { 
            property: {
              select: { userId: true }
            }
          }
        });
        if (maintenance) {
          resource = { userId: maintenance.property.userId };
        }
        break;
        
      default:
        return NextResponse.json(
          { 
            success: false,
            error: 'Invalid resource type' 
          },
          { status: 400 }
        );
    }
    
    // Ressource non trouvée
    if (!resource) {
      return NextResponse.json(
        { 
          success: false,
          error: `${resourceType} not found` 
        },
        { status: 404 }
      );
    }
    
    // Vérifier ownership
    if (resource.userId !== session.user.id) {
      return NextResponse.json(
        { 
          success: false,
          error: `Forbidden - You don't own this ${resourceType}` 
        },
        { status: 403 }
      );
    }
    
    return session;
    
  } catch (error) {
    console.error(`Ownership check error (${resourceType}):`, error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Ownership verification failed' 
      },
      { status: 500 }
    );
  }
}

/**
 * Vérifie si l'utilisateur peut accéder à une property
 * (Owner, ADMIN, ou EMPLOYEE assigné)
 */
export async function requirePropertyAccess(request: Request, propertyId: number | string) {
  const session = await requireAuth(request);
  
  if (session instanceof NextResponse) {
    return session;
  }
  
  // ADMIN a accès à tout
  if (session.user.role === 'ADMIN') {
    return session;
  }
  
  try {
    const property = await prisma.property.findUnique({
      where: { id: Number(propertyId) },
      select: { 
        userId: true,
        // TODO: Ajouter employeeIds si vous avez une relation employees
      }
    });
    
    if (!property) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Property not found' 
        },
        { status: 404 }
      );
    }
    
    // Owner a accès
    if (property.userId === session.user.id) {
      return session;
    }
    
    // TODO: Vérifier si user est un employee assigné
    // if (session.user.role === 'EMPLOYEE' && property.employeeIds?.includes(session.user.id)) {
    //   return session;
    // }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Forbidden - No access to this property' 
      },
      { status: 403 }
    );
    
  } catch (error) {
    console.error('Property access check error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Access verification failed' 
      },
      { status: 500 }
    );
  }
}

/**
 * Helper pour extraire userId de session
 */
export function getUserIdFromSession(session: any): string | null {
  if (session instanceof NextResponse) {
    return null;
  }
  return session?.user?.id || null;
}

/**
 * Helper pour vérifier si session est une erreur
 */
export function isAuthError(session: any): session is NextResponse {
  return session instanceof NextResponse;
}

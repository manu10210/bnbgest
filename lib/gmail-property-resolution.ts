export interface GmailPropertyResolutionBookingLike {
  propertyName?: string;
  subject?: string;
}

export interface GmailPropertyResolutionPropertyLike {
  id: number;
  name: string;
  city?: string;
  address?: string;
}

export interface GmailPropertyResolutionEvent {
  action: string;
  reason?: string;
}

export interface GmailPropertyCandidateResult<TProperty> {
  property?: TProperty;
  score: number;
  secondScore: number;
  ambiguous: boolean;
}

export interface ResolvePropertyAssignmentOptions<
  TBooking extends GmailPropertyResolutionBookingLike,
  TProperty extends GmailPropertyResolutionPropertyLike,
  TLocalBooking,
> {
  booking: TBooking;
  runtimeProperties: TProperty[];
  localBookings: TLocalBooking[];
  defaultProperty?: TProperty;
  overridePropertyId?: number;
  expertModeAggressive: boolean;
  useFallback: boolean;
  normalizeForMatch: (value: string) => string;
  resolvePropertyAliasTarget: (rawLabel: string) => string | undefined;
  findMatchingProperty: (propertyName: string | undefined, properties: TProperty[]) => TProperty | undefined;
  inferPropertyFromContext: (booking: TBooking, properties: TProperty[], existingBookings: TLocalBooking[]) => TProperty | undefined;
  findBestPropertyCandidate: (text: string, properties: TProperty[]) => GmailPropertyCandidateResult<TProperty>;
}

export interface ResolvePropertyAssignmentResult<TProperty> {
  property?: TProperty;
  rescuedAggressive: number;
  rescuedSingleProperty: number;
  events: GmailPropertyResolutionEvent[];
}

export function resolvePropertyAssignment<
  TBooking extends GmailPropertyResolutionBookingLike,
  TProperty extends GmailPropertyResolutionPropertyLike,
  TLocalBooking,
>(
  options: ResolvePropertyAssignmentOptions<TBooking, TProperty, TLocalBooking>,
): ResolvePropertyAssignmentResult<TProperty> {
  const {
    booking,
    runtimeProperties,
    localBookings,
    defaultProperty,
    overridePropertyId,
    expertModeAggressive,
    useFallback,
    normalizeForMatch,
    resolvePropertyAliasTarget,
    findMatchingProperty,
    inferPropertyFromContext,
    findBestPropertyCandidate,
  } = options;

  const events: GmailPropertyResolutionEvent[] = [];
  let rescuedAggressive = 0;
  let rescuedSingleProperty = 0;

  const hasDetectedPropertyName = !!booking.propertyName?.trim();
  const aliasTarget = hasDetectedPropertyName
    ? resolvePropertyAliasTarget(booking.propertyName || '')
    : undefined;

  let property = overridePropertyId
    ? runtimeProperties.find((candidate) => candidate.id === overridePropertyId)
    : findMatchingProperty(booking.propertyName, runtimeProperties);

  if (overridePropertyId && property) {
    events.push({
      action: 'property_override_applied',
      reason: `property_id:${overridePropertyId}`,
    });
  }

  if (!overridePropertyId && property && aliasTarget && normalizeForMatch(property.name) === normalizeForMatch(aliasTarget)) {
    const aliasSource = (booking.propertyName || '').trim();
    events.push({
      action: 'property_alias_autofix',
      reason: `alias_match:${aliasSource}=>${property.name}`,
    });
  }

  if (!property) {
    const inferred = inferPropertyFromContext(booking, runtimeProperties, localBookings);
    if (inferred) {
      property = inferred;
      events.push({
        action: 'property_inferred_from_context',
        reason: hasDetectedPropertyName
          ? `property_name_unmatched_context_used:${inferred.name}`
          : `property_missing_context_used:${inferred.name}`,
      });
    }
  }

  // Mode expert agressif : si le matching standard échoue, tenter un rattachement
  // avec un seuil plus permissif mais contrôlé (score + ambiguïté).
  if (!property && expertModeAggressive && useFallback) {
    const candidateText = booking.propertyName || booking.subject || '';
    if (candidateText) {
      const aggressiveCandidate = findBestPropertyCandidate(candidateText, runtimeProperties);
      const scoreGap = aggressiveCandidate.score - aggressiveCandidate.secondScore;
      const hasStrongConfidence = aggressiveCandidate.score >= 25;
      const hasSafeLead = aggressiveCandidate.score >= 15 && !aggressiveCandidate.ambiguous && scoreGap >= 8;

      if (aggressiveCandidate.property && (hasStrongConfidence || hasSafeLead)) {
        property = aggressiveCandidate.property;
        rescuedAggressive++;
        events.push({
          action: 'property_aggressive_autofix',
          reason: `aggressive_match_score:${aggressiveCandidate.score}`,
        });
      }
    }
  }

  if (!property && !hasDetectedPropertyName && useFallback) {
    property = defaultProperty;
  }

  // Cas extrême mono-logement : on force le rattachement pour éviter les imports bloqués.
  if (!property && expertModeAggressive && useFallback && runtimeProperties.length === 1) {
    property = defaultProperty;
    if (property) {
      rescuedSingleProperty++;
      events.push({
        action: 'property_single_property_force',
        reason: `single_property_forced:${property.name}`,
      });
    }
  }

  return {
    property,
    rescuedAggressive,
    rescuedSingleProperty,
    events,
  };
}

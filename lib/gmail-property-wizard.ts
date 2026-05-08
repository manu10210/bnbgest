export interface WizardBookingLike {
  bookingType: string;
  propertyName?: string;
  subject?: string;
}

export interface DeriveWizardPropertySuggestionsParams<TBooking extends WizardBookingLike, TProperty> {
  bookings: TBooking[];
  runtimeProperties: TProperty[];
  skippedNoPropertyCount: number;
  rejectedPropertySet: Set<string>;
  getWizardPropertyCandidate: (booking: TBooking) => string | undefined;
  normalizeForMatch: (value: string) => string;
  normalizePropertyLabelForWizard: (value: string) => string;
  normalizeSubjectLabelForWizard: (value: string) => string;
  findMatchingProperty: (propertyName: string | undefined, properties: TProperty[]) => TProperty | undefined;
}

export interface DeriveWizardPropertySuggestionsResult {
  candidateNames: string[];
  fallbackNames: string[];
}

export function deriveWizardPropertySuggestions<TBooking extends WizardBookingLike, TProperty>(
  params: DeriveWizardPropertySuggestionsParams<TBooking, TProperty>,
): DeriveWizardPropertySuggestionsResult {
  const {
    bookings,
    runtimeProperties,
    skippedNoPropertyCount,
    rejectedPropertySet,
    getWizardPropertyCandidate,
    normalizeForMatch,
    normalizePropertyLabelForWizard,
    normalizeSubjectLabelForWizard,
    findMatchingProperty,
  } = params;

  const isKnownProperty = (name: string) => {
    const normalizedCandidate = normalizePropertyLabelForWizard(name);
    return findMatchingProperty(name, runtimeProperties) !== undefined
      || (!!normalizedCandidate && findMatchingProperty(normalizedCandidate, runtimeProperties) !== undefined);
  };

  // Tous les emails importés avec un propertyName détecté mais inconnu
  const allCandidates = bookings.filter((booking) => {
    if (booking.bookingType === 'review' || booking.bookingType === 'payout') return false;

    const candidateLabel = getWizardPropertyCandidate(booking);
    if (!candidateLabel) return false;
    if (isKnownProperty(candidateLabel)) return false;

    const normalizedLabel = normalizeForMatch(candidateLabel);
    return !rejectedPropertySet.has(normalizedLabel);
  });

  const candidateNames = allCandidates
    .map((booking) => getWizardPropertyCandidate(booking))
    .filter((name): name is string => typeof name === 'string' && !!name.trim());

  let fallbackNames: string[] = [];

  // Cas aucun logement configuré : si aucun nom extrait mais des emails sans logement,
  // proposer des noms uniques trouvés dans les sujets des emails skippés.
  if (candidateNames.length === 0 && skippedNoPropertyCount > 0) {
    fallbackNames = Array.from(
      new Set(
        bookings
          .filter((booking) => !booking.propertyName?.trim())
          .map((booking) => normalizeSubjectLabelForWizard(booking.subject || ''))
          .filter((name) => name.length >= 5 && !/[?=&%]|https?:/.test(name) && !(name.length > 50 && !name.includes(' ')))
          .filter((name) => !rejectedPropertySet.has(normalizeForMatch(name))),
      ),
    );
  }

  return {
    candidateNames,
    fallbackNames,
  };
}

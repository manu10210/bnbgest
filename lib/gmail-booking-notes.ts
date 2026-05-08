export interface BookingNotesSource {
  confirmationCode?: string;
  receivedAt: string;
  propertyName?: string;
  guestPhone?: string;
  airbnbListingId?: string;
  guestLanguage?: string;
  guestCountry?: string;
  guestAdults?: number;
  guestChildren?: number;
  guestInfants?: number;
  guestPets?: number;
}

function buildGuestCompositionLabel(source: BookingNotesSource): string {
  if (!source.guestAdults && !source.guestChildren && !source.guestInfants && !source.guestPets) {
    return '';
  }

  const parts = [
    source.guestAdults ? `${source.guestAdults} adulte${source.guestAdults > 1 ? 's' : ''}` : '',
    source.guestChildren ? `${source.guestChildren} enfant${source.guestChildren > 1 ? 's' : ''}` : '',
    source.guestInfants ? `${source.guestInfants} bébé${source.guestInfants > 1 ? 's' : ''}` : '',
    source.guestPets ? `${source.guestPets} animal${source.guestPets > 1 ? 'aux' : ''}` : '',
  ].filter(Boolean);

  return parts.length > 0 ? `Composition: ${parts.join(', ')}` : '';
}

export function buildBookingImportNotes(
  source: BookingNotesSource,
  formatDateLabel: (isoLikeDate: string) => string,
): string {
  return [
    source.confirmationCode ? `Code Airbnb: ${source.confirmationCode}` : '',
    `Importé depuis Gmail (${formatDateLabel(source.receivedAt)})`,
    source.propertyName ? `Logement: ${source.propertyName}` : '',
    source.guestPhone ? `Tél: ${source.guestPhone}` : '',
    source.airbnbListingId ? `Annonce Airbnb ID: ${source.airbnbListingId}` : '',
    source.guestLanguage ? `Langue: ${source.guestLanguage}` : '',
    source.guestCountry ? `Pays: ${source.guestCountry}` : '',
    buildGuestCompositionLabel(source),
  ]
    .filter(Boolean)
    .join(' | ');
}

export function buildReminderImportNotes(
  source: Pick<BookingNotesSource, 'confirmationCode' | 'receivedAt' | 'propertyName' | 'guestPhone'>,
  formatDateLabel: (isoLikeDate: string) => string,
): string {
  return [
    source.confirmationCode ? `Code Airbnb: ${source.confirmationCode}` : '',
    `Importé depuis rappel Gmail (${formatDateLabel(source.receivedAt)})`,
    source.propertyName ? `Logement: ${source.propertyName}` : '',
    source.guestPhone ? `Tél: ${source.guestPhone}` : '',
  ]
    .filter(Boolean)
    .join(' | ');
}

export function buildPayoutAttachmentSpecialRequests(
  existingSpecialRequests: string | undefined,
  payoutAmount: number,
  payoutDate: string,
): string {
  return [
    existingSpecialRequests || '',
    `[VERSEMENT ${payoutAmount}€ le ${payoutDate}]`,
  ]
    .filter(Boolean)
    .join(' | ');
}

export function buildPayoutFinancialBookingSpecialRequests(
  source: Pick<BookingNotesSource, 'confirmationCode' | 'receivedAt' | 'propertyName'>,
  payoutAmount: number,
  formatDateLabel: (isoLikeDate: string) => string,
): string {
  return [
    source.confirmationCode ? `Code Airbnb: ${source.confirmationCode}` : '',
    `Versement Airbnb ${payoutAmount}€ — importé Gmail (${formatDateLabel(source.receivedAt)})`,
    source.propertyName ? `Logement: ${source.propertyName}` : '',
  ]
    .filter(Boolean)
    .join(' | ');
}

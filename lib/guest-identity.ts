function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripInvisibleUnicode(value: string): string {
  return value
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '')
    .replace(/[\u00A0\u202F]/g, ' ');
}

export function normalizeGuestEmail(value?: string | null): string | null {
  if (!value) return null;
  const normalized = normalizeWhitespace(stripInvisibleUnicode(value).toLowerCase());
  return normalized.length > 0 ? normalized : null;
}

export function normalizeGuestPhone(value?: string | null): string | null {
  if (!value) return null;
  const normalized = stripInvisibleUnicode(value)
    .replace(/[\s().-]/g, '')
    .replace(/^00/, '+')
    .trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeGuestName(value?: string | null): string | null {
  if (!value) return null;
  const normalized = normalizeWhitespace(stripInvisibleUnicode(value).toLowerCase());
  return normalized.length > 0 ? normalized : null;
}

export function computeGuestIdentityKey(input: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}): string | null {
  const email = normalizeGuestEmail(input.email);
  if (email) return `email:${email}`;

  const phone = normalizeGuestPhone(input.phone);
  if (phone) return `phone:${phone}`;

  const name = normalizeGuestName(input.name);
  if (name) return `name:${name}`;

  return null;
}

// Compatibilité rétroactive avec les anciennes clés persisted en base.
export function computeLegacyGuestIdentityKey(input: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}): string | null {
  const email = normalizeGuestEmail(input.email);
  if (email) return `email:${email}`;

  const name = normalizeGuestName(input.name);
  if (!name) return null;

  const phone = normalizeGuestPhone(input.phone);
  return phone ? `name:${name}|phone:${phone}` : `name:${name}`;
}

export function computeGuestIdentityCandidates(input: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}): string[] {
  const canonical = computeGuestIdentityKey(input);
  const legacy = computeLegacyGuestIdentityKey(input);
  return Array.from(new Set([canonical, legacy].filter((value): value is string => !!value)));
}

export function normalizeConfirmationCode(value?: string | null): string | null {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return null;
  if (!/^HM[A-Z0-9]{6,12}$/i.test(normalized)) return null;
  return normalized;
}

export function bookingContainsConfirmationCode(specialRequests?: string | null, confirmationCode?: string | null): boolean {
  const code = normalizeConfirmationCode(confirmationCode);
  if (!code || !specialRequests) return false;
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(specialRequests);
}

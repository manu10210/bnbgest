// Shared in-memory store for password reset tokens
// This module is imported by both forgot-password and reset-password routes

export const resetTokens = new Map<string, { email: string; expires: number }>();

export function cleanExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of resetTokens.entries()) {
    if (data.expires < now) {
      resetTokens.delete(token);
    }
  }
}

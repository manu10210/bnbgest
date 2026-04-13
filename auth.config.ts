import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';

// Liste des emails autorisés pour l'accès admin
const AUTHORIZED_ADMINS = [
  'claustre.emmanuel@gmail.com',
  'employee@bnbgest.com'
];

// ─── Refresh automatique du token Google ────────────────────────────────────
// Quand l'accessToken expire (1h), on le renouvelle via le refreshToken
async function refreshGoogleAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: number;
} | null> {
  try {
    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID     ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        grant_type:    'refresh_token',
        refresh_token: refreshToken,
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as { access_token: string; expires_in: number };
    return {
      accessToken: data.access_token,
      expiresAt:   Math.floor(Date.now() / 1000) + data.expires_in,
    };
  } catch {
    return null;
  }
}

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
        }
      }
    }),
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      // authorize est implémenté dans auth.ts (Node.js runtime) — ici retourne null par défaut
      async authorize() {
        return null;
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Si connexion via Google, vérifier si l'email est autorisé
      if (account?.provider === 'google') {
        const email = (user.email || '').toLowerCase().trim();
        const allowed = AUTHORIZED_ADMINS.map(e => e.toLowerCase().trim());
        const isAllowed = allowed.includes(email);
        console.log(`[Auth] Google signIn: ${email} → ${isAllowed ? 'AUTORISÉ' : 'REFUSÉ'}`);
        return isAllowed;
      }
      // Si connexion via credentials, toujours autoriser (déjà vérifié dans authorize de auth.ts)
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.role = (user as { role?: string }).role || 'admin';
        token.id = user.id;
      }
      if (account) {
        token.provider = account.provider;
        // Stocker les tokens Google pour Gmail API
        if (account.provider === 'google') {
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.expiresAt = account.expires_at;
          // L'utilisateur Google est toujours admin s'il a passé signIn
          token.role = 'admin';
        }
      }

      // ── Refresh automatique du token Google ──────────────────────────────
      // Si le token expire dans moins de 5 minutes, le renouveler silencieusement
      if (
        token.provider === 'google' &&
        token.refreshToken &&
        token.expiresAt &&
        typeof token.expiresAt === 'number' &&
        Date.now() / 1000 > (token.expiresAt as number) - 300
      ) {
        console.log('[Auth] Token Google expiré ou proche expiration — refresh automatique');
        const refreshed = await refreshGoogleAccessToken(token.refreshToken as string);
        if (refreshed) {
          token.accessToken = refreshed.accessToken;
          token.expiresAt   = refreshed.expiresAt;
          token.tokenError  = undefined;
          console.log('[Auth] Token Google rafraîchi avec succès');
        } else {
          // Refresh échoué → signaler à l'UI pour forcer reconnexion manuelle
          token.tokenError = 'RefreshAccessTokenError';
          console.warn('[Auth] Échec du refresh token Google — reconnexion requise');
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.provider = token.provider as string;
      }
      // Exposer l'access token et l'erreur éventuelle dans la session (lecture côté API routes)
      (session as { accessToken?: unknown }).accessToken = token.accessToken;
      (session as { tokenError?: unknown }).tokenError   = token.tokenError;
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;

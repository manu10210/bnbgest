import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';

// Liste des emails autorisés pour l'accès admin
const AUTHORIZED_ADMINS = [
  'claustre.emmanuel@gmail.com',
  'employee@bnbgest.com'
];

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code'
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
        return AUTHORIZED_ADMINS.includes(user.email || '');
      }
      // Si connexion via credentials, toujours autoriser (déjà vérifié dans authorize de auth.ts)
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.role = (user as { role?: string }).role || 'client';
        token.id = user.id;
      }
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.provider = token.provider as string;
      }
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

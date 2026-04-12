import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma';

const AUTHORIZED_ADMINS = [
  'claustre.emmanuel@gmail.com',
  'employee@bnbgest.com'
];

const USERS = [
  {
    id: '1',
    email: (process.env.ADMIN_EMAIL || 'claustre.emmanuel@gmail.com').toLowerCase().trim(),
    password: process.env.ADMIN_PASSWORD,
    name: 'Emmanuel Claustre',
    role: 'admin',
    image: null
  },
  {
    id: '2',
    email: (process.env.EMPLOYEE_EMAIL || 'employee@bnbgest.com').toLowerCase().trim(),
    password: process.env.EMPLOYEE_PASSWORD,
    name: 'Employé Test',
    role: 'employee',
    image: null
  }
];

export const { handlers, signIn, signOut, auth } = NextAuth({
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const emailInput = (credentials.email as string).toLowerCase().trim();
        const passwordInput = credentials.password as string;

        const user = USERS.find(u => u.email === emailInput);
        if (!user) return null;

        // 1. Vérifier AppCredential en DB (mot de passe défini via reset)
        try {
          const dbCredential = await prisma.appCredential.findUnique({
            where: { email: emailInput },
          });
          if (dbCredential) {
            const valid = await bcrypt.compare(passwordInput, dbCredential.hashedPassword);
            if (valid) {
              return { id: user.id, email: user.email, name: user.name, role: user.role, image: user.image };
            }
            return null;
          }
        } catch (e) {
          console.error('DB credential check error:', e);
        }

        // 2. Fallback : mot de passe en variable d'environnement
        if (user.password && user.password === passwordInput) {
          return { id: user.id, email: user.email, name: user.name, role: user.role, image: user.image };
        }

        return null;
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const email = (user.email || '').toLowerCase().trim();
        const allowed = AUTHORIZED_ADMINS.map(e => e.toLowerCase().trim());
        const isAllowed = allowed.includes(email);
        console.log(`[Auth] Google signIn: ${email} → ${isAllowed ? 'AUTORISÉ' : 'REFUSÉ'}`);
        return isAllowed;
      }
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
          token.role = 'admin';
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
      // Exposer l'access token dans la session (lecture côté API routes)
      (session as { accessToken?: unknown }).accessToken = token.accessToken;
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
});


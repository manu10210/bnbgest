import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma';

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
  ...authConfig,
  providers: [
    ...authConfig.providers.filter(p => (p as { id?: string }).id !== 'credentials'),
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

        // 1. Vérifier d'abord AppCredential en DB (mot de passe défini via reset)
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

        // 2. Fallback : vérifier le mot de passe en variable d'environnement
        if (user.password && user.password === passwordInput) {
          return { id: user.id, email: user.email, name: user.name, role: user.role, image: user.image };
        }

        return null;
      }
    })
  ],
});


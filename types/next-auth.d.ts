import 'next-auth';

declare module 'next-auth' {
  interface User {
    role?: string;
    provider?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      role: string;
      provider: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    provider?: string;
    id?: string;
  }
}

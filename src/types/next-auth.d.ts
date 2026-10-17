import { DefaultSession, DefaultUser } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      hasCreatorProfile?: boolean;
      hasSupplierProfile?: boolean;
      creatorSlug?: string;
      supplierSlug?: string;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role?: string;
    hasCreatorProfile?: boolean;
    hasSupplierProfile?: boolean;
    creatorSlug?: string;
    supplierSlug?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    hasCreatorProfile?: boolean;
    hasSupplierProfile?: boolean;
    creatorSlug?: string;
    supplierSlug?: string;
  }
}

import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { authorizeCredentials } from "@/lib/authUtils"

export { authorizeCredentials }

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "ape-parel-development-secret-key-32chars-min!!",
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: authorizeCredentials,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as any).role || 'CUSTOMER';
        token.id = user.id;
      }
      if (trigger === 'update' && session?.role) {
        token.role = session.role;
        if (token.id) {
          try {
            await prisma.user.update({
              where: { id: token.id as string },
              data: { role: session.role },
            });
          } catch {
            // Ignore in test or mock environments
          }
        }
      }
      if (token.id) {
        try {
          const [dbUser, creator, supplier] = await Promise.all([
            prisma.user.findUnique({ where: { id: token.id as string } }),
            prisma.creatorProfile.findUnique({ where: { userId: token.id as string } }),
            prisma.supplierProfile.findUnique({ where: { userId: token.id as string } }),
          ]);
          if (dbUser?.role && (!session?.role || trigger !== 'update')) {
            token.role = dbUser.role;
          }
          token.hasCreatorProfile = !!creator;
          token.hasSupplierProfile = !!supplier;
          token.creatorSlug = creator?.slug;
          token.supplierSlug = supplier?.slug;
        } catch {
          // Ignore lookup errors in headless or mocked environments
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = (token.role as string) || 'CUSTOMER';
        (session.user as any).id = token.id as string;
        (session.user as any).hasCreatorProfile = !!token.hasCreatorProfile;
        (session.user as any).hasSupplierProfile = !!token.hasSupplierProfile;
        (session.user as any).creatorSlug = token.creatorSlug as string | undefined;
        (session.user as any).supplierSlug = token.supplierSlug as string | undefined;
      }
      return session;
    },
  },
})

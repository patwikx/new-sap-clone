import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import { UserAssignment } from "@/next-auth"; // Ensure this import path is correct

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/error",
  },
  ...authConfig, // Spreads in your providers
  callbacks: {
    // This callback checks if a user is active before allowing sign in
    async signIn({ user }) {
      if (!user?.id) return false;
      const existingUser = await prisma.user.findUnique({ where: { id: user.id } });
      return !!existingUser?.isActive; // Return true only if user is found and active
    },

    // This callback fetches assignments and adds them to the token
    async jwt({ token }) {
      if (!token.sub) return token;
      
      const userWithAssignments = await prisma.user.findUnique({
          where: { id: token.sub },
          include: { assignments: { include: { role: true, businessUnit: true } } }
      });

      if (!userWithAssignments) return token;

      const leanAssignments: UserAssignment[] = userWithAssignments.assignments.map((a) => ({
        businessUnitId: a.businessUnitId,
        businessUnit: { id: a.businessUnit.id, name: a.businessUnit.name },
        role: { id: a.role.id, role: a.role.role },
      }));

      token.id = userWithAssignments.id;
      token.name = userWithAssignments.name;
      token.isActive = userWithAssignments.isActive;
      token.assignments = leanAssignments;
      
      return token;
    },

    // This callback populates the session with data from the token
    async session({ token, session }) {
      if (token.sub && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.isActive = token.isActive as boolean;
        session.user.assignments = token.assignments;
      }
      return session;
    }
  },
});
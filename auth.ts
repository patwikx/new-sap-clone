import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { authConfig } from "./auth.config"
import type { UserAssignment } from "@/next-auth" // Ensure this import path is correct
import type { Roles } from "@prisma/client" // Import Roles type

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
      if (!user?.id) return false
      const existingUser = await prisma.user.findUnique({ where: { id: user.id } })
      return !!existingUser?.isActive // Return true only if user is found and active
    },
    // This callback fetches assignments and adds them to the token
    async jwt({ token }) {
      if (!token.sub) return token

      const userWithDetails = await prisma.user.findUnique({
        where: { id: token.sub },
        include: {
          assignments: { include: { role: true, businessUnit: true } },
          role: true, // Include the direct role relation from the User model
        },
      })

      if (!userWithDetails) return token

      const leanAssignments: UserAssignment[] = userWithDetails.assignments.map((a) => ({
        businessUnitId: a.businessUnitId,
        businessUnit: { id: a.businessUnit.id, name: a.businessUnit.name },
        role: { id: a.role.id, role: a.role.role },
      }))

      token.id = userWithDetails.id
      token.name = userWithDetails.name
      token.isActive = userWithDetails.isActive
      token.assignments = leanAssignments

      // --- MODIFICATION START ---
      // Prioritize the direct user.role, but fall back to the role from the first assignment
      if (userWithDetails.role) {
        token.role = userWithDetails.role as Roles
      } else if (userWithDetails.assignments.length > 0) {
        // If no direct role, use the role from the first assignment
        token.role = userWithDetails.assignments[0].role as Roles
      }
      // --- MODIFICATION END ---

      return token
    },
    // This callback populates the session with data from the token
    async session({ token, session }) {
      if (token.sub && session.user) {
        session.user.id = token.id as string
        session.user.name = token.name
        session.user.isActive = token.isActive as boolean
        session.user.assignments = token.assignments
        // Populate the primary role in the session
        if (token.role) {
          session.user.role = token.role as Roles
        }
      }
      return session
    },
  },
})

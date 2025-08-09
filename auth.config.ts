import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { LoginSchema } from "@/lib/validations/schemas"; // Assuming this exists
import { getUserByUsername } from "@/lib/auth-actions/auth-users";

export const authConfig = {
  providers: [
    Credentials({
      async authorize(credentials) {
        const validatedFields = LoginSchema.safeParse(credentials);

        if (validatedFields.success) {
          const { username, password } = validatedFields.data;
          const user = await getUserByUsername(username);

          if (!user || !user.password) return null;

          const passwordsMatch = await bcryptjs.compare(password, user.password);
          if (passwordsMatch) return user;
        }

        return null;
      },
    }),
  ],
} satisfies NextAuthConfig;
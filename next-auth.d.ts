// next-auth.d.ts

import { Roles } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

// --- HELPER TYPES TO DEFINE THE SESSION SHAPE ---

// The shape of the role object within an assignment
interface UserRole {
  id: string;
  role: string;
}

// The shape of the business unit object within an assignment
interface UserBusinessUnit {
  id: string;
  name: string;
}

// The shape of a single assignment object
interface UserAssignment {
  businessUnitId: string;
  businessUnit: UserBusinessUnit;
  role: UserRole;
  // You can also include other fields from the join table if needed, like assignedAt
}


// --- MODULE DECLARATIONS FOR NEXT-AUTH ---

declare module "next-auth" {
  /**
   * Returned by `auth`, `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string 
      name?: string | null;
      username?: string | null;
      image?: string | null;
      isActive?: boolean;
      role: Roles;
      businessUnitId?: string | null; // Optional, can be removed if not needed
      
      /** * A user's roles and business unit memberships.
       * This is an array because a user can be a member of multiple units with different roles.
       */
      assignments: UserAssignment[];

      // The old single properties are now gone:
      // businessUnitId?: string | null; (REMOVED)
      // role?: string | null; (REMOVED)
    }
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and sent to the `session` callback. */
  interface JWT {
    isActive?: boolean;
    
    /** A user's roles and business unit memberships. */
    assignments: UserAssignment[];
  }
}
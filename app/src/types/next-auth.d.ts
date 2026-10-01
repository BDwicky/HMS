/**
 * @file src/types/next-auth.d.ts
 * NextAuth v5 type augmentation.
 * Extends User and Session with HMS-specific fields.
 */

import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roleId: string;
      roleName: string;
      permissions: string[];
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    roleId: string;
    roleName: string;
    permissions: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    userId: string;
    roleId: string;
    roleName: string;
    permissions: string[];
  }
}

/**
 * @file src/lib/auth/config.ts
 * NextAuth v5 configuration.
 * Implements Credentials provider with email + password.
 * Session stores userId, roleId, and flat permissions[] array
 * to avoid per-request DB lookups (ADR-005).
 *
 * Phase 1 – UC-01 Login, BR-SEC-001 server-side authorization.
 */

import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "./validation";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "e8a71d93b3c58201fa49c30f40a1b2c3d4e5f6a7b8c9d0e1f2",
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // 1. Validate input shape
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email: identifier, password } = parsed.data;
        const normalized = identifier.toLowerCase().trim();
        const fallbackEmail = normalized.includes("@") ? normalized : `${normalized}@hotel.dev`;

        // 2. Load user with role + permissions (search by email or name/username)
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: normalized, mode: "insensitive" } },
              { email: { equals: fallbackEmail, mode: "insensitive" } },
              { name: { equals: identifier.trim(), mode: "insensitive" } },
            ],
          },
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        });

        if (!user || !user.isActive) return null;

        // 3. Verify password
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // 4. Update lastLoginAt
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        // 5. Build flat permissions array
        const permissions = user.role.rolePermissions.map(
          (rp) => rp.permission.code,
        );

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          roleId: user.roleId,
          roleName: user.role.name,
          permissions,
        };
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // Persist custom fields into JWT on sign-in
        token.userId = user.id!;  // id is guaranteed by authorize()
        token.roleId = (user as { roleId: string }).roleId;
        token.roleName = (user as { roleName: string }).roleName;
        token.permissions = (user as { permissions: string[] }).permissions;
      }
      return token;
    },

    session({ session, token }) {
      // Expose custom fields to session consumers
      session.user.id = token.userId as string;
      session.user.roleId = token.roleId as string;
      session.user.roleName = token.roleName as string;
      session.user.permissions = token.permissions as string[];
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours (one shift)
  },
};

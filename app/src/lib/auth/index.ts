/**
 * @file src/lib/auth/index.ts
 * NextAuth v5 instance — exported as { auth, handlers, signIn, signOut }.
 * Import { auth } for server-side session access.
 * Import { handlers } for the API route.
 *
 * BR-SEC-001: backend authorization mandatory on every protected endpoint.
 */

import NextAuth from "next-auth";
import { authConfig } from "./config";

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);

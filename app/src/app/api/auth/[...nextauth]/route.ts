/**
 * @file src/app/api/auth/[...nextauth]/route.ts
 * NextAuth v5 catch-all API handler.
 */

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;

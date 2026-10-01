# HMS Architecture Decision Log

Create an entry here before changing major architecture or business behavior.

Template:

## ADR-XXX: Title
Date: YYYY-MM-DD
Status: Accepted | Superseded

### Context
What problem exists?

### Decision
What was chosen?

### Alternatives
What alternatives were considered?

### Consequences
What becomes easier/harder?

### Affected modules
List modules.

---

## ADR-001: Next.js App Router with Server Components
Date: 2026-10-01
Status: Accepted (amended by ADR-007)

### Context
The project requires both a public guest booking portal (mobile-first) and an internal staff operations dashboard (desktop-first). We need a framework that supports SSR, API routes, and TypeScript natively.

### Decision
Use Next.js 16 App Router with React Server Components. All API routes live under `src/app/api/`. Pages and layouts use the file-system router.

### Alternatives
- Pages Router: Simpler but misses Server Components and layouts nesting.
- Separate frontend + Express API: More ops overhead, overkill for single-property scope.

### Consequences
- Server Components reduce client JS bundle for initial loads.
- API Routes and Server Actions co-locate business logic with the UI layer; domain services in `src/features/` and `src/lib/` keep business logic out of components.
- Some React libraries not yet compatible with Server Components must use `"use client"` directives.

### Affected modules
All modules.

---

## ADR-007: Downgrade from Next.js 16 to Next.js 15.5.x
Date: 2026-10-01
Status: Accepted

### Context
Next.js 16.3.8 (installed by the scaffold) uses Turbopack as the default build bundler. On this Windows machine the `react-server-dom-turbopack` package was not included in the npm install, causing `next build` to fail with "Module not found: Can't resolve 'react-server-dom-webpack/client'".

### Decision
Downgrade to Next.js 15.5.27 (latest stable 15.x), which uses Webpack for production builds (Turbopack is opt-in dev-only). This resolves the build error.

### Alternatives
- Install `react-server-dom-turbopack` manually: unclear which version is compatible with Next.js 16.3.8; fragile approach.
- Keep 16.x and document the build failure: not acceptable — build must pass per Phase 0 requirements.

### Consequences
- Next.js 15 is a stable LTS-class release; App Router, Server Components, and all planned HMS features are fully supported.
- `eslint-config-next` bumped to `15.5.27` to match.
- `eslint.config.mjs` migrated to `FlatCompat` to bridge the legacy eslint-config-next format with ESLint 9 flat config.

### Affected modules
All modules (framework-level change).

---

## ADR-002: Prisma ORM with PostgreSQL
Date: 2026-10-01
Status: Accepted

### Context
Need a type-safe ORM that supports complex relational queries, migrations, and works well with TypeScript and Next.js.

### Decision
Use Prisma ORM with a PostgreSQL database. Schema lives in `prisma/schema.prisma`. Migrations managed by `prisma migrate dev` in development and `prisma migrate deploy` in production.

### Alternatives
- Drizzle ORM: Lighter but less mature ecosystem and tooling.
- Raw SQL (pg / postgres.js): More control, but no type safety without code-gen.
- TypeORM: Decorator-based, heavier, less ergonomic with Next.js.

### Consequences
- Schema-first development with auto-generated types.
- `prisma generate` must be run after any schema change.
- Prisma Client is a singleton (`src/lib/db/index.ts`) to avoid connection pool exhaustion in Next.js dev mode.

### Affected modules
All data access in `src/lib/db/`, all feature services.

---

## ADR-003: Zod for input validation
Date: 2026-10-01
Status: Accepted

### Context
All API endpoints must validate input at the boundary (docs/API.md). Need a runtime validation library that integrates with TypeScript types.

### Decision
Use Zod for schema definition and validation across all API routes and server actions. Validation schemas live in each feature's `schemas.ts` file.

### Alternatives
- Yup: Less TypeScript-ergonomic, slower inference.
- class-validator: Decorator-based, requires reflect-metadata.
- Manual validation: Error-prone and inconsistent.

### Consequences
- Type inference from Zod schemas eliminates duplicated type definitions.
- Server-side validation errors produce the standard `ValidationError` response from `src/lib/errors/`.

### Affected modules
All API routes in `src/app/api/`, server actions.

---

## ADR-004: Vitest for unit and integration testing
Date: 2026-10-01
Status: Accepted

### Context
Need a fast test runner compatible with the Next.js + TypeScript stack, supporting ES modules natively.

### Decision
Use Vitest with `@vitejs/plugin-react` for React component tests and Node environment for service/domain tests. Coverage via `@vitest/coverage-v8`.

### Alternatives
- Jest: Requires more configuration for ESM support; slower with large codebases.
- Playwright alone: E2E only, cannot unit-test business logic directly.

### Consequences
- Fast test runs using Vite's transform pipeline.
- Path alias `@/` works via `vitest.config.ts` resolver.
- Separate Playwright setup needed in Phase 10 for E2E tests.

### Affected modules
`src/lib/`, `src/features/` services.

---

## ADR-005: next-auth v5 (Beta) for authentication
Date: 2026-10-01
Status: Accepted

### Context
Staff must authenticate with email + password (SRS §4 Auth/RBAC). No guest account is required — guests use booking reference + email.

### Decision
Use next-auth v5 beta with a Credentials provider. Session tokens are JWT-based. Permission checking uses a granular permission code system (not role-name checks) implemented in Phase 1.

### Alternatives
- next-auth v4: Stable but deprecated App Router support; v5 is the App Router-first version.
- Custom JWT: More control but reinvents auth primitives.
- Clerk / Auth0: External dependency, adds cost, reduces control.

### Consequences
- Auth module fully implemented in Phase 1.
- `NEXTAUTH_SECRET` must be set in all environments.
- Session contains `userId`, `roleId`, and a flat `permissions[]` array to avoid database roundtrips on every request.

### Affected modules
`src/lib/auth/`, `src/features/auth/`, all protected API routes.

---

## ADR-006: Decimal for all monetary values
Date: 2026-10-01
Status: Accepted

### Context
Floating-point arithmetic is not safe for financial calculations (BR-RES-005, BR-SEC-005).

### Decision
All monetary columns in the Prisma schema use `@db.Decimal(15, 2)`. When passed to the frontend, amounts are serialized as strings. Server-side arithmetic uses the `Decimal` type from Prisma or a library like `decimal.js`.

### Alternatives
- Integer (cents): Effective but requires conversion at every layer.
- `float`: Unsafe for money.

### Consequences
- Prisma returns `Decimal` objects; must be converted to `string` before JSON serialization.
- Arithmetic operations must use Decimal-aware methods.

### Affected modules
`src/features/reservations/`, `src/features/folios/`, `src/features/payments/`, `src/features/invoices/`.

# HMS Implementation Roadmap

## Phase 0
Repository, Next.js/TS, PostgreSQL, Prisma, env, lint, format, test, base structure, docs.

## Phase 1
Auth, RBAC, protected routes, application shell, navigation, notifications, error/loading/empty states.

## Phase 2
Hotel settings, room types, rooms, rate plans, policies, room rates.

## Phase 3
Guests, guest documents, availability engine, overlap rules, capacity, inventory concurrency.

## Phase 4
Reservation engine, online booking, confirmation, manage booking, modification, cancellation, no-show.

## Phase 5
Walk-in, phone reservation, check-in, identity verification, room assignment, room changes, upgrades, stay extension.

## Phase 6
Folios, room/additional charges, payments, refunds, checkout, invoice/PDF.

## Phase 7
Housekeeping, room state machine, inspections, maintenance/out-of-service.

## Phase 8
Dashboard, reports, audit logs.

## Phase 9
Email provider, notifications, scheduler, payment expiration, no-show automation.

## Phase 10
Unit/integration/E2E tests, security, performance, indexes, backup/restore docs, deployment.

## Coding Rules
1. Do not invent requirements.
2. Do not silently expand scope.
3. Never trust frontend financial totals.
4. Never hard-delete historical financial/reservation data.
5. Backend validates state transitions.
6. Complex business logic is not placed in giant page components.
7. Critical multi-step operations use transactions.
8. Add tests for critical rules.
9. Run typecheck, lint, tests, and build at milestones.
10. Update docs when behavior changes.

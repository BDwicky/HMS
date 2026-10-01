# MASTER PROMPT: IMPLEMENT THE HOTEL MANAGEMENT SYSTEM

You are the lead software engineer. Implement the HMS in this repository.

## Source of truth
Read these files first:
- docs/SRS.md
- docs/ARCHITECTURE.md
- docs/DATABASE.md
- docs/API.md
- docs/TRACEABILITY.md
- docs/ROADMAP.md
- docs/TESTING.md
- docs/DECISIONS.md

Do not code before understanding them.

## Target stack
Next.js + TypeScript + PostgreSQL + Prisma + Tailwind CSS + shadcn/ui.

## Mission
Build a coherent single-property hotel system with a public guest booking portal and internal staff operations for Receptionist, Housekeeping, Manager, and Admin.

## Non-negotiable engineering rules
1. Do not invent or silently expand requirements.
2. Server is authoritative for availability, pricing, tax, discount, payment, refund, folio, and state transitions.
3. Never hard-delete historical reservations, stays, payments, refunds, invoices, or audit records.
4. Use transactions for critical multi-record operations.
5. Payment webhook handling must be idempotent.
6. Room state transitions must be validated by backend services.
7. Authorization must be enforced server-side using permissions.
8. Keep business logic out of giant React components.
9. Add automated tests for every critical business rule.
10. Update documentation when behavior or architecture changes.

## Availability
Treat stays as [check_in, check_out). Checkout date is exclusive. Recheck inventory at final reservation creation and protect against concurrent last-room booking.

## Pricing
Calculate all totals server-side. Store nightly reservation price snapshots so historical bookings do not change when master rates change.

## Payments
Never trust client payment amounts. Verify provider callbacks server-side. Repeated callbacks must not duplicate effects. Corrections use refunds/adjustments, not mutation of finalized payments.

## Checkout
Validate active stay, load final folio, include charges, calculate outstanding, settle according to hotel setting, issue invoice if configured, close stay, set room DIRTY, create housekeeping task, and close reservation only when all relevant stays are finished.

## Room lifecycle
AVAILABLE -> RESERVED -> OCCUPIED -> DIRTY -> CLEANING -> INSPECTION -> AVAILABLE.
Inspection failure returns to CLEANING. Damage can enter MAINTENANCE -> OUT_OF_SERVICE -> AVAILABLE.

## UI
Guest: mobile-first. Reception: desktop-first and fast. Housekeeping: mobile-friendly. Manager: dashboard/report oriented. Admin: configuration oriented. Every important screen has loading, empty, validation-error, server-error, success, and permission-denied states.

## Development method
Work one roadmap phase at a time.
For each feature:
1. Identify FR/BR/UC IDs.
2. Design schema/migration.
3. Implement service/domain rules.
4. Implement API.
5. Implement UI.
6. Implement permission and audit requirements.
7. Add tests.
8. Run typecheck, lint, tests, and build.
9. Update docs/IMPLEMENTATION_STATUS.md.
10. Commit-ready only after checks pass.

## Repository initialization
If empty, initialize the project and create docs/IMPLEMENTATION_STATUS.md. If existing, inspect it and preserve working code.

## First action
Do not implement the whole product in one change. Inspect the repository, compare it with the docs, then implement Phase 0 and establish the foundation. Report what exists, what is missing, and the exact first milestone before making large changes.

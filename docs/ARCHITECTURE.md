# HMS Architecture

## Target
Next.js + TypeScript + PostgreSQL + Prisma + Tailwind + shadcn/ui.

Browser -> Next.js UI/API -> Application Services -> Prisma -> PostgreSQL
External integrations: Payment Gateway, Email Service, Scheduler.

## Modules
- auth
- users/roles/permissions
- guests
- rooms/room-types
- availability
- pricing/rate-plans
- reservations
- stays/check-in
- folios/billing
- payments/refunds
- invoices
- housekeeping
- maintenance
- reports
- settings
- audit
- notifications

## Rules
Complex business logic belongs in application/domain services, not page components.
Use transactions for reservation creation, check-in, checkout, payment effects, refunds, and state transitions where multiple records must remain consistent.
Use a provider interface for payment/email integrations. Development adapters are acceptable until real credentials exist, but must not pretend a payment was verified by a real provider.

## Suggested structure
src/
  app/
  components/
  features/
    auth/
    guests/
    rooms/
    availability/
    pricing/
    reservations/
    stays/
    folios/
    payments/
    invoices/
    housekeeping/
    maintenance/
    reports/
    settings/
  lib/
    db/
    auth/
    permissions/
    validation/
    errors/
    audit/
    notifications/
prisma/
docs/

Use the actual Next.js App Router conventions chosen by the project version.

# HMS Testing Plan

## Unit
Availability overlap, checkout-exclusive dates, room capacity, cancellation fee, refund limits, outstanding balance, tax/service charge, ADR, RevPAR, state transitions.

## Integration
Reservation + payment; check-in + stay + occupied room; checkout + folio + invoice + dirty room + housekeeping; payment webhook idempotency; authorization.

## E2E
1. Online booking -> payment -> confirmation.
2. Walk-in -> existing guest -> identity -> payment -> check-in.
3. Checkout -> additional charge -> payment -> invoice -> room dirty.
4. Housekeeping cleaning -> inspection -> available.
5. Concurrent booking for final inventory.

## Definition of Done
Requirement implemented, business rules enforced, DB migration complete, API complete, authorization complete, UI complete, loading/empty/error/success states complete, audit where required, tests added, regression checks pass, typecheck/lint/build pass.

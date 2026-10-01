# Hotel Management System (HMS) - SRS v1.0

## 1. Overview
Single-property medium-sized Hotel Management System for internal hotel operations and a public guest booking portal. Portfolio scope, not enterprise ERP.

Stack target: Next.js, TypeScript, PostgreSQL, Prisma, Tailwind CSS, shadcn/ui.

## 2. Actors
- Guest
- Receptionist
- Housekeeping
- Manager
- Admin
- Payment Gateway
- Email Service
- Scheduler

## 3. Core Scope
Guest management, rooms, room types, rate plans, availability, online/walk-in/phone reservations, modification, cancellation, no-show, check-in, room assignment, stay management, folio, charges, payments, refunds, checkout, invoice, housekeeping, maintenance, reports, RBAC, audit, email notifications.

## 4. Functional Requirements

### Authentication/RBAC
- Staff login with email/password.
- Protected staff routes.
- Granular permissions, not scattered role-name checks.
- Guest booking management uses booking reference + email and requires no guest account.

### Guest
- Search by name, phone, email.
- Create/reuse guest.
- Warn on duplicate phone/email.
- Store identity documents: KTP, SIM, Passport, Other.
- Restrict document access.

### Rooms
- Manage room types and physical rooms.
- Room belongs to one room type.
- Backend validates room state transitions.
- Preserve room assignment history.

### Pricing
- Rate plans, date-based rates, cancellation/modification/no-show policies.
- Server-side pricing.
- Snapshot nightly price at reservation time.

### Availability
Search inputs: check-in, check-out, adults, children, rooms.
- Interval is `[check_in, check_out)`.
- Physical inventory and overlapping reservations are considered.
- Maintenance/out-of-service rooms are excluded.
- Recheck at review and creation.
- Concurrent last-room booking must not overbook.

### Reservations
Sources: ONLINE, WALK_IN, PHONE, STAFF.
- Shared reservation engine for all channels.
- Multiple room types/quantities per reservation.
- Special request is guest-visible; internal note is staff-only.
- Modification/cancellation/no-show are policy-driven.
- Reservations are never hard-deleted.

### Check-in / Stay
- Identity verification at check-in.
- Eligible room assignment.
- Final availability validation.
- Check-in creates active stay and OCCUPIED room state.
- Multi-room reservations can have independent stays.
- Room change, upgrade, and stay extension are supported.

### Folio / Billing
Folio contains room charges, additional charges, tax, service charge, discounts/adjustments, payments.
Additional charge categories may include Breakfast, Extra Bed, Laundry, Minibar, Restaurant, Service, Late Checkout, Early Check-in, Other.

### Payments / Refunds
- Multiple payments supported.
- Server-side calculation and verification.
- Payment webhook idempotency required.
- Refund is a separate transaction.
- Finalized payments are not directly edited.

### Checkout
1. Validate active stay.
2. Include all applicable charges.
3. Calculate final folio server-side.
4. Settle payment according to hotel configuration.
5. Generate invoice if configured.
6. Close stay.
7. Room becomes DIRTY.
8. Create housekeeping task.
9. Reservation closes only after all active stays are checked out.

### Invoice
- Final invoice from finalized folio.
- Unique invoice number.
- Snapshot guest and financial values.
- PDF output.
- Issued invoice is not silently edited.

### Housekeeping
Flow: OCCUPIED -> DIRTY -> CLEANING -> INSPECTION -> AVAILABLE.
Inspection failure returns to CLEANING. Damage can lead to MAINTENANCE -> OUT_OF_SERVICE.

### Maintenance
Room issue reporting with category, description, priority, status, optional photo.

### Reports
Occupancy, arrivals, departures, in-house guests, room status, reservations, revenue, payment methods, ADR, RevPAR.

### Audit / Notification
Audit sensitive actions. MVP email notifications for booking/payment/modification/cancellation/pre-arrival/checkout reminders and useful internal events.

## 5. Statuses
Reservation: PENDING_PAYMENT, CONFIRMED, EXPIRED, CANCELLED, CHECKED_IN, CHECKED_OUT, NO_SHOW.

Room: AVAILABLE, RESERVED, OCCUPIED, DIRTY, CLEANING, INSPECTION, MAINTENANCE, OUT_OF_SERVICE.

Payment: PENDING, PAID, FAILED, EXPIRED, CANCELLED, PARTIALLY_REFUNDED, REFUNDED.

Refund: PENDING, PROCESSING, SUCCESS, FAILED.

Stay: ACTIVE, CHECKED_OUT.

## 6. Business Rules
- BR-RES-001 booking reference unique.
- BR-RES-002 checkout date exclusive.
- BR-RES-003 check-in < check-out.
- BR-RES-004 capacity must be satisfied.
- BR-RES-005 price calculated server-side.
- BR-RES-006 nightly price snapshot retained.
- BR-RES-007 no hard delete of reservations.
- BR-RES-008 modification rechecks availability.
- BR-RES-009 current reservation excluded from its own conflict check.
- BR-AVL-001 overlapping reservations consume inventory.
- BR-AVL-002 maintenance/out-of-service unavailable for sale.
- BR-AVL-003 final availability recheck required.
- BR-AVL-004 concurrent last-room booking must consume inventory safely.
- BR-PAY-001 never trust client payment amount.
- BR-PAY-002 webhook idempotent.
- BR-PAY-003 multiple payments allowed.
- BR-PAY-004 valid payments reduce outstanding.
- BR-PAY-005 finalized payments immutable.
- BR-REF-001 refund is separate transaction.
- BR-REF-002 original payment remains immutable.
- BR-REF-003 refund <= refundable amount.
- BR-CAN-001 cancellation policy driven.
- BR-CAN-002 cancellation does not delete reservation.
- BR-CAN-003 cancellation stores fee/refund.
- BR-CAN-004 checked-in reservation uses early checkout, not cancellation.
- BR-NS-001 no-show follows configured cutoff.
- BR-NS-002 authorized manual no-show supported.
- BR-NS-003 scheduler can process no-show.
- BR-NS-004 no-show fee/refund follows policy.
- BR-CIN-001 identity verification required at check-in.
- BR-CIN-002 assigned room must be eligible.
- BR-CIN-003 final room availability check.
- BR-CIN-004 check-in creates active stay.
- BR-CIN-005 OCCUPIED room requires active stay.
- BR-OUT-001 checkout requires active stay.
- BR-OUT-002 all applicable charges included.
- BR-OUT-003 room charge uses reservation snapshot.
- BR-OUT-004 checkout date not charged as a night.
- BR-OUT-005 additional charges are separate folio items.
- BR-OUT-006 outstanding = folio total - valid payments.
- BR-OUT-007 outstanding checkout follows hotel configuration.
- BR-OUT-008 invoice follows hotel configuration.
- BR-OUT-009 invoice snapshots guest/transaction values.
- BR-OUT-010 no deletion of checkout history.
- BR-OUT-011 checked-out room becomes DIRTY.
- BR-OUT-012 checkout creates housekeeping task.
- BR-OUT-013 multi-room reservation closes only when all stays complete.
- BR-OUT-014 early checkout is not cancellation.
- BR-OUT-015 late checkout follows policy.
- BR-OUT-016 paid payment is not directly edited.
- BR-GST-001 existing guest can be reused.
- BR-GST-002 duplicate contact data warns staff.
- BR-GST-003 identity documents are restricted.
- BR-SEC-001 backend authorization mandatory.
- BR-SEC-002 guest access requires reference + email.
- BR-SEC-003 uploads validate type/size.
- BR-SEC-004 identity documents role-restricted.
- BR-SEC-005 financial calculations server-side.

## 7. Database Entities
users, roles, permissions, role_permissions, hotel_settings, guests, guest_documents, room_types, rooms, room_assignment_history, rate_plans, room_rates, cancellation_policies, modification_policies, no_show_policies, reservations, reservation_items, reservation_item_nights, reservation_room_assignments, reservation_change_logs, reservation_cancellations, stays, folios, folio_items, additional_charge_categories, payments, refunds, invoices, housekeeping_tasks, maintenance_requests, audit_logs, notifications.

## 8. API Domains
/api/auth/*, /api/guests, /api/availability, /api/reservations, /api/reservations/[id]/modify, /api/reservations/[id]/cancel, /api/reservations/[id]/no-show, /api/check-ins, /api/check-outs, /api/rooms, /api/room-types, /api/rate-plans, /api/room-rates, /api/policies, /api/folios, /api/payments, /api/payments/webhook, /api/refunds, /api/invoices, /api/housekeeping/tasks, /api/maintenance, /api/reports/*, /api/users, /api/roles, /api/settings, /api/audit-logs.

## 9. Non-functional
- Normal page target <2s.
- Availability target <2s.
- Dashboard target <3s.
- Guest portal mobile-first.
- Reception desktop-first.
- Housekeeping mobile-friendly.
- Asia/Jakarta business timezone.
- Indonesian first, translation-ready.
- Practical WCAG 2.1 AA principles.
- Friendly production errors, no stack traces.
- Daily DB backup strategy documented.
- Critical operations transactional.

## 10. Security
Secure password hashing, protected sessions, API validation, authorization, upload validation, restricted identity documents, server-side payment verification, idempotency, rate limiting where appropriate, safe logging.

## 11. Out of Scope
Multi-property, full restaurant POS, full laundry, warehouse inventory, payroll, accounting GL, procurement, revenue AI, dynamic pricing AI, channel manager, OTA sync, loyalty, corporate contracts, events/banquet, spa, airport transfer, vehicle management.

## 12. Future Scope
Guest accounts, OTP manage-booking, WhatsApp, production payment gateway, multiple payment providers, advanced invoices, restaurant POS, inventory, accounting, channel manager, OTA, multi-property.

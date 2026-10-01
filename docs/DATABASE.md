# HMS Database Blueprint

## Identity
users, roles, permissions, role_permissions

## Hotel
hotel_settings

## Guest
 guests, guest_documents

## Room
room_types, rooms, room_assignment_history

## Pricing
rate_plans, room_rates, cancellation_policies, modification_policies, no_show_policies

## Reservation
reservations, reservation_items, reservation_item_nights, reservation_room_assignments, reservation_change_logs, reservation_cancellations

## Stay
stays

## Billing
folios, folio_items, additional_charge_categories, payments, refunds, invoices

## Operations
housekeeping_tasks, maintenance_requests

## System
audit_logs, notifications

## Important fields
reservations: id, booking_reference, guest_id, source, status, check_in, check_out, adults, children, guest snapshots, special_request, internal_note, subtotal, tax_amount, service_charge, discount_amount, total_amount, created_by, timestamps.

reservation_items: reservation_id, room_type_id, rate_plan_id, quantity, price_per_night, nights, subtotal.

reservation_item_nights: reservation_item_id, stay_date, room_rate, tax_amount, subtotal.

reservation_room_assignments: reservation_id, reservation_item_id, room_id, assigned_at, assigned_by, released_at.

stays: reservation_id, reservation_item_id, guest_id, room_id, checked_in_at, checked_in_by, expected_check_out, actual_check_out, status.

folios: reservation_id, status, currency, subtotal, tax_amount, service_charge, discount_amount, total_amount, balance_amount, created_at, closed_at.

folio_items: folio_id, type, category, description, quantity, unit_price, subtotal, created_at.

payments: reservation_id, folio_id, amount, method, provider, provider_transaction_id, status, paid_at, expires_at, created_by.

refunds: payment_id, reservation_id, folio_id, amount, reason, status, provider_refund_id, refunded_at.

invoices: folio_id, invoice_number, status, issued_at, guest snapshot, subtotal, tax_amount, service_charge, discount_amount, total_amount.

## Constraints
Unique booking reference, invoice number, room number, room type code, rate plan code. Foreign keys. Non-negative monetary values. Date validity. Index reservation date/status, guest contact, room status/type, provider transaction ID. Payment webhook idempotency key must be unique.

Historical reservation/financial data must not be cascade-deleted.

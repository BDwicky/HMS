# HMS API Contract Guidelines

Use consistent JSON responses.

Success example:
{ "data": {}, "meta": {} }

Error example:
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": {} } }

## Domains
GET/POST /api/availability
GET/POST /api/reservations
GET/PATCH /api/reservations/[id]
POST /api/reservations/[id]/modify
POST /api/reservations/[id]/cancel
POST /api/reservations/[id]/no-show
GET/POST /api/guests
GET/POST /api/check-ins
GET/POST /api/check-outs
GET/PATCH /api/rooms
GET/POST /api/room-types
GET/POST /api/rate-plans
GET/POST /api/room-rates
GET/POST /api/policies
GET/POST /api/folios
POST /api/payments
POST /api/payments/webhook
POST /api/refunds
GET/POST /api/invoices
GET/PATCH /api/housekeeping/tasks
GET/POST /api/maintenance
GET /api/reports/occupancy
GET /api/reports/revenue
GET /api/reports/reservations
GET /api/reports/payments
GET/POST /api/users
GET/POST /api/roles
GET/PATCH /api/settings
GET /api/audit-logs

Every protected endpoint must authenticate and authorize.
Validate input at the boundary. Business rules remain server-side.

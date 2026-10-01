# HMS Traceability

## Business Processes
BP-001 Guest Reservation
BP-002 Walk-in Reservation
BP-003 Phone Reservation
BP-004 Reservation Modification
BP-005 Reservation Cancellation
BP-006 No-show Processing
BP-007 Check-in
BP-008 Stay Management
BP-009 Billing
BP-010 Payment
BP-011 Check-out
BP-012 Invoice
BP-013 Housekeeping
BP-014 Room Maintenance
BP-015 Guest Management
BP-016 Rate & Inventory Management
BP-017 Reporting
BP-018 User & Access Management

## Use Cases
UC-01 Login
UC-02 Manage Guest
UC-03 Manage Guest Identity
UC-04 Search Availability
UC-05 Create Online Reservation
UC-06 Create Walk-in Reservation
UC-07 Create Phone Reservation
UC-08 Modify Reservation
UC-09 Cancel Reservation
UC-10 Process No-show
UC-11 Check-in Guest
UC-12 Assign Room
UC-13 Change Room
UC-14 Extend Stay
UC-15 Add Additional Charge
UC-16 Process Payment
UC-17 Process Refund
UC-18 Check-out Guest
UC-19 Generate Invoice
UC-20 Manage Rooms
UC-21 Manage Room Types
UC-22 Manage Rate Plans
UC-23 Manage Room Rates
UC-24 Manage Policies
UC-25 Manage Housekeeping Task
UC-26 Clean Room
UC-27 Inspect Room
UC-28 Report Room Damage
UC-29 Manage Maintenance
UC-30 View Dashboard
UC-31 View Reports
UC-32 Manage Users
UC-33 Manage Roles/Permissions
UC-34 Manage Hotel Settings
UC-35 View Audit Logs

## Traceability rule
Every implementation task must record: BR/FR/UC IDs, DB entities, API endpoint, UI route/component, permission, audit requirement, and test IDs.

Example:
UC-18 -> FR checkout -> BR-OUT-001..016 -> stays/folios/folio_items/payments/invoices/rooms/housekeeping_tasks -> POST /api/check-outs -> reception checkout UI -> TC-OUT-*.

## Test naming
TC-AUTH-*, TC-GUEST-*, TC-AVL-*, TC-RES-*, TC-PAY-*, TC-CIN-*, TC-STAY-*, TC-FOL-*, TC-OUT-*, TC-INV-*, TC-HK-*, TC-MNT-*, TC-REPORT-*, TC-SEC-*.

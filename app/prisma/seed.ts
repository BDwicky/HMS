/**
 * @file prisma/seed.ts
 * Development seed: creates base roles, permissions, and an admin user.
 * Run: npm run db:seed
 *
 * NEVER run against production with dummy data.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ALL_PERMISSIONS } from "../src/lib/permissions/index";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── 1. Permissions ──────────────────────────────────────────────────────
  for (const code of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, description: code },
    });
  }
  console.log(`  ✓ ${ALL_PERMISSIONS.length} permissions upserted`);

  // ── 2. Roles ────────────────────────────────────────────────────────────
  const roles = [
    {
      name: "Admin",
      description: "Full system access",
      permissions: ALL_PERMISSIONS as unknown as string[],
    },
    {
      name: "Manager",
      description: "Hotel manager – reports, settings, limited admin",
      permissions: [
        "auth:login",
        "guests:view",
        "guests:create",
        "guests:update",
        "rooms:view",
        "rooms:manage",
        "room_types:manage",
        "reservations:view",
        "reservations:create",
        "reservations:modify",
        "reservations:cancel",
        "reservations:no_show",
        "reservations:view_internal",
        "checkin:process",
        "stays:manage",
        "folios:view",
        "folios:add_charge",
        "folios:apply_discount",
        "payments:view",
        "payments:process",
        "refunds:process",
        "checkout:process",
        "invoices:view",
        "invoices:generate",
        "housekeeping:view",
        "housekeeping:manage",
        "maintenance:view",
        "maintenance:manage",
        "reports:view",
        "settings:view",
        "settings:manage",
        "rate_plans:manage",
        "policies:manage",
        "audit_logs:view",
        "users:view",
      ],
    },
    {
      name: "Receptionist",
      description: "Front desk operations",
      permissions: [
        "auth:login",
        "guests:view",
        "guests:create",
        "guests:update",
        "rooms:view",
        "reservations:view",
        "reservations:create",
        "reservations:modify",
        "reservations:cancel",
        "reservations:no_show",
        "reservations:view_internal",
        "checkin:process",
        "stays:manage",
        "folios:view",
        "folios:add_charge",
        "payments:view",
        "payments:process",
        "checkout:process",
        "invoices:view",
        "invoices:generate",
        "housekeeping:view",
        "maintenance:view",
        "maintenance:manage",
      ],
    },
    {
      name: "Housekeeping",
      description: "Room cleaning and inspection",
      permissions: [
        "auth:login",
        "rooms:view",
        "housekeeping:view",
        "housekeeping:update_status",
        "maintenance:view",
        "maintenance:manage",
      ],
    },
  ];

  for (const roleDef of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description },
      create: { name: roleDef.name, description: roleDef.description },
    });

    // Attach permissions
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const code of roleDef.permissions) {
      const perm = await prisma.permission.findUnique({ where: { code } });
      if (perm) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId: perm.id },
        });
      }
    }
    console.log(`  ✓ Role "${roleDef.name}" upserted with ${roleDef.permissions.length} permissions`);
  }

  // ── 3. Admin user ────────────────────────────────────────────────────────
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: "Admin" },
  });

  const passwordHash = await bcrypt.hash("admin123!", 12);
  await prisma.user.upsert({
    where: { email: "admin@hotel.dev" },
    update: {},
    create: {
      name: "System Admin",
      email: "admin@hotel.dev",
      passwordHash,
      roleId: adminRole.id,
      isActive: true,
    },
  });
  console.log("  ✓ Admin user upserted (admin@hotel.dev / admin123!)");

  // ── 4. Default hotel settings ────────────────────────────────────────────
  const existing = await prisma.hotelSetting.count();
  if (existing === 0) {
    await prisma.hotelSetting.create({
      data: {
        hotelName: "Grand Hotel",
        currency: "IDR",
        timezone: "Asia/Jakarta",
        checkInTime: "14:00",
        checkOutTime: "12:00",
        taxPercent: 11,
        serviceChargePercent: 10,
        generateInvoiceOnCheckout: true,
        allowOutstandingCheckout: false,
      },
    });
    console.log("  ✓ Default hotel settings created");
  }

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AppShell
      userPermissions={session.user.permissions ?? []}
      userName={session.user.name ?? "User"}
      roleName={session.user.roleName ?? ""}
    >
      {children}
    </AppShell>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke panel operasional Hotel Management System",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense>{children}</Suspense>;
}

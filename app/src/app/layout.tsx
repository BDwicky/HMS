import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MARINA BAY SANDS | Luxury Hotel & Integrated Resort",
    template: "%s | MARINA BAY SANDS",
  },
  description:
    "Nikmati kemewahan legendaris di Marina Bay Sands: Infinity pool rooftop tertinggi di dunia, kamar & suite mewah, serta kuliner kelas dunia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}

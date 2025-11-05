import type { Metadata } from "next";
import "./globals.css";
import { AppLayout } from "@/app/components/AppLayout";

export const metadata: Metadata = {
  title: "Kadha Cafe - Inventory Management",
  description: "Inventory management system for Kadha Cafe",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}

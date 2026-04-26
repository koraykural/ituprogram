import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ITU Program",
  description: "Course schedule creator for ITU students",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}

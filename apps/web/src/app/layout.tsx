import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WasteX — AI-Powered Smart Municipal Waste Management",
  description: "User-friendly municipal waste operations with role-based dashboards for Admin, Supervisor, Driver, and Citizens.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}

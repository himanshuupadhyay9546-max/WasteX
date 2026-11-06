import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WasteX — Smart Municipal Waste Management Platform",
  description: "User-friendly AI waste management platform with role-based dashboards for Municipal Admins, Zone Supervisors, Truck Drivers, and Citizens.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <body className="bg-slate-50 text-slate-800 min-h-screen antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

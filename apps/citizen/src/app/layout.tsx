import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WasteX Citizen — Smart Bins & Eco-Rewards",
  description: "Citizen portal for smart bin discovery, 1-tap illegal dumping reporting, and green eco-rewards.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}

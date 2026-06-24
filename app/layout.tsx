import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Bright Idea AI",
  description: "AI-powered marketing consulting platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-950 text-slate-100">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">{children}</main>
      </body>
    </html>
  );
}

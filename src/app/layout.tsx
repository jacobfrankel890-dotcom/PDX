import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "PDX Expense Reports | Parts Distribution Xpress",
  description: "Submit and manage expense reports for Parts Distribution Xpress regional managers and KAMs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased min-h-screen`}>{children}</body>
    </html>
  );
}

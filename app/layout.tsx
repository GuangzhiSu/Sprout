import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sprout · Adaptive Playground Practice",
  description: "Structured, adaptive playground communication practice with gradual prompts and multiple valid ways to respond.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

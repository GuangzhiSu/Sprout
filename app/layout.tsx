import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Play Together · Playground Communication Practice",
  description: "Scenario-based communication practice, reply suggestions, and supportive visual safety alerts for autistic children.",
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

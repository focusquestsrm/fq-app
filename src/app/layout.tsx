import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FocusQuest Strata",
  description: "Enrollment Intelligence Operating System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

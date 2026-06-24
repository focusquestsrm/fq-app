import "./globals.css";
import type { Metadata } from "next";
import { Public_Sans, Montserrat } from "next/font/google";

// Brand fonts (self-hosted by next/font): Montserrat for display/headings,
// Public Sans for body/UI. Exposed as CSS variables consumed in globals.css.
const publicSans = Public_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-public-sans",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "FocusQuest Strata",
  description: "Enrollment Intelligence Operating System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${publicSans.variable} ${montserrat.variable}`}>
      <body>{children}</body>
    </html>
  );
}

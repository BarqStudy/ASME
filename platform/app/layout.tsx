import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
const thmanyah = localFont({
  src: [
    {
      path: "../public/fonts/thmanyahserifdisplay-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/thmanyahserifdisplay-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/thmanyahserifdisplay-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/thmanyahserifdisplay-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/thmanyahserifdisplay-Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-thmanyah",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: { default: "ASME NU — Engineering Hub", template: "%s | ASME NU" },
  description:
    "نادي الهندسة الميكانيكية بجامعة نجران — Mechanical Engineering Club at Najran University",
  robots: { index: true, follow: true },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={thmanyah.variable}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import AuthBootstrap from "@/components/providers/AuthBootstrap";
import "./globals.css";
import "./(onboarding)/onboarding.css";

const poppinsDisplay = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const poppinsBody = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KKB App Buting",
  description:
    "KKB App Buting is the official youth portal for Barangay Buting KK profiling, verification, digital ID, points, vouchers, and rewards.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KKB App Buting",
  },
};

export const viewport: Viewport = {
  themeColor: "#1B4FD8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${poppinsDisplay.variable} ${poppinsBody.variable}`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <AuthBootstrap />
        {children}
      </body>
    </html>
  );
}

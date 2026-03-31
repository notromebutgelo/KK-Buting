import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
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
  title: "KK Buting",
  description: "Sangguniang Kabataan Barangay Buting - Youth Digital ID & Rewards",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KK Buting",
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
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import LenisProvider from "@/components/ui/Lenis/LenisProvider";
import { AuthProvider } from "@/components/contexts/AuthContext";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import PageViewTracker from "@/components/analytics/PageViewTracker";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"]
})

export const metadata: Metadata = {
  title: "KnightyBuilds - Premium Minecraft Builds",
  description: "Premium Minecraft builds by KnightyBuilds",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${outfit.variable}`} lang="en">
      <body>
        <GoogleAnalytics />
        <AuthProvider>
          <LenisProvider>
            <PageViewTracker />
            {children}
          </LenisProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

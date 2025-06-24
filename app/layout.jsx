import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { initializeAuth } from "@/lib/auth";
import { Suspense } from "react";
import VersionAlert from "@/components/UpdateAlert";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { ChatProvider } from "@/components/chat/ChatContext";
import { ChatInterface } from "@/components/chat/ChatInterface";
import "@/logging/logger";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "ALPR Database",
  description: "algertc/alpr-database",
  icons: {
    icon: [
      {
        url: "/1024.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
    ],
    apple: [{ url: "/1024.png" }],
  },
  appleTouchIcon: "/1024.png",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    startupImage: [
      {
        url: "splash_screens/iPhone_16_Pro_Max_portrait.png",
        media:
          "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        url: "splash_screens/iPhone_16_Pro_landscape.png",
        media:
          "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)",
      },
      {
        url: "splash_screens/iPhone_16_Plus__iPhone_15_Pro_Max__iPhone_15_Plus__iPhone_14_Pro_Max_landscape.png",
        media:
          "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)",
      },
      {
        url: "splash_screens/iPhone_16__iPhone_15_Pro__iPhone_15__iPhone_14_Pro_landscape.png",
        media:
          "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)",
      },
      {
        url: "splash_screens/12.9__iPad_Pro_portrait.png",
        media:
          "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        url: "splash_screens/12.9__iPad_Pro_landscape.png",
        media:
          "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)",
      },
      {
        url: "splash_screens/11__iPad_Pro_M4_portrait.png",
        media:
          "(device-width: 834px) and (device-height: 1210px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        url: "splash_screens/11__iPad_Pro_M4_landscape.png",
        media:
          "(device-width: 834px) and (device-height: 1210px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)",
      },
      {
        url: "splash_screens/10.5__iPad_Air_portrait.png",
        media:
          "(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        url: "splash_screens/10.5__iPad_Air_landscape.png",
        media:
          "(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)",
      },
      {
        url: "splash_screens/8.3__iPad_Mini_portrait.png",
        media:
          "(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        url: "splash_screens/8.3__iPad_Mini_landscape.png",
        media:
          "(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)",
      },
    ],
  },
};

export const viewport = {
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense fallback={<DashboardSkeleton />}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <ChatProvider>
              <VersionAlert />
              {children}
              <ChatInterface />
            </ChatProvider>
          </ThemeProvider>
        </Suspense>
      </body>
    </html>
  );
}

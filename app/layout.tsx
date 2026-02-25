import type { Metadata, Viewport } from "next";
import "../styles/globals.css";
import CertificationPayRedirect from "@/components/CertificationPayRedirect";

export const metadata: Metadata = {
  title: "Florida Real Estate Sales Associate Course",
  description: "63 hour pre-license education course for sales associates, approved by Florida Real Estate Commission",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a1a2e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#0a1a2e" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <CertificationPayRedirect />
        {children}
      </body>
    </html>
  );
}


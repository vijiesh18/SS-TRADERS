import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";

export const metadata: Metadata = {
  title: "S.S Traders Smart POS",
  description:
    "Enterprise GST Billing, Inventory, and Analytics platform for S.S Traders - Paint Shop, Motors, Borewell Materials & Hardware",
  manifest: "/manifest.json",
  themeColor: "#2c2820",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SS Traders",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}

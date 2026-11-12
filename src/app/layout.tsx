import type { Metadata, Viewport } from "next";
import { Dancing_Script, Playfair_Display, Poppins } from "next/font/google";
import BottomNav from "../../components/BottomNav";
import Header from "../../components/Header";
import PwaInstallButton from "../../components/PwaInstallButton";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});
const dancingScript = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-dancing-script",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Guia Betesda",
  description: "Encontre negócios e serviços da comunidade Betesda.",
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Guia Betesda",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0D0D0C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${poppins.variable} ${playfairDisplay.variable} ${dancingScript.variable} antialiased`}>
        <Header />
        <div className="pb-20 md:pb-0">{children}</div>
        <BottomNav />
        <PwaInstallButton />
      </body>
    </html>
  );
}

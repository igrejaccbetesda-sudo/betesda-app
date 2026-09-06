import type { Metadata } from "next";
import { Dancing_Script, Playfair_Display, Poppins } from "next/font/google";
import BottomNav from "../../components/BottomNav";
import Header from "../../components/Header";
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
  title: "Guia de Negócios & Serviços Betesda",
  description: "Encontre negócios e serviços da comunidade Betesda.",
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
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import EnTete from "@/components/EnTete";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Escapade · Planificateur de vacances",
  description:
    "Décrivez votre voyage, l'IA prépare un itinéraire jour par jour et votre liste de bagages.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <EnTete />
        <div className="flex-1">{children}</div>
        <footer className="py-6 text-center text-xs text-slate-400">
          Escapade · Suggestions générées par IA, à vérifier avant de réserver.
        </footer>
      </body>
    </html>
  );
}
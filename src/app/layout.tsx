import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import EnTete from "@/components/EnTete";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
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
    <html lang="fr" className={`${dmSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <EnTete />
        <div className="flex-1">{children}</div>
        <footer className="border-t">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
            <span>Escapade, planificateur de vacances</span>
            <span>Suggestions générées par IA, à vérifier avant de réserver.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}

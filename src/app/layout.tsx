import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "SalonHub — онлайн-запись в салоны красоты",
  description:
    "Единая платформа для поиска и онлайн-записи в лучшие салоны красоты, парикмахерские и барбершопы вашего города.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} ${playfair.variable} h-full`}>
      <body className="min-h-full bg-background text-onBackground font-sans antialiased selection:bg-primary/30 selection:text-primary">
        {children}
      </body>
    </html>
  );
}

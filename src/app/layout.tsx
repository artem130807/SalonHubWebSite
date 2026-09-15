import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/ThemeProvider";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html
      lang="ru"
      data-theme={theme}
      className={`${inter.variable} ${playfair.variable} h-full`}
      style={{ colorScheme: theme }}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-onBackground font-sans antialiased selection:bg-primary/30 selection:text-primary">
        <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}

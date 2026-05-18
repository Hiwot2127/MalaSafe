import type { Metadata } from "next";
import { Fraunces, Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";

// Display: Fraunces variable serif — opinionated optical sizing, journal feel.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT", "WONK"],
  display: "swap",
});

// Body: Manrope variable — distinct from Inter, modern proportions, has good
// tabular numeric variants. Open-source from Mikhail Sharanda.
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

// Mono: IBM Plex Mono — tabular numerals with character. Used for IDs, counts,
// status pills, the validation table, the timeline durations.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MalaSafe — Malaria Surveillance",
  description: "Malaria surveillance and prediction system for Ethiopia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${manrope.variable} ${plexMono.variable}`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              classNames: {
                toast: "border border-border bg-background text-foreground rounded-sm shadow-xs",
                title: "font-sans text-sm",
                description: "font-sans text-xs text-muted-foreground",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}

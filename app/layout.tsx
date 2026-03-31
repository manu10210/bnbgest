import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import { CustomizationProvider } from "../contexts/CustomizationContext";
import { BNBProvider } from "../contexts/BNBContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { LanguageProvider } from "../contexts/LanguageContext";
import ThemeWrapper from "../components/ThemeWrapper";
import AuthSessionProvider from "../components/AuthSessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://bnbgest.vercel.app'),
  title: {
    default: "BNBGest - Gestion Location Courte Durée Airbnb & Booking",
    template: "%s | BNBGest"
  },
  description: "Plateforme complète de gestion pour locations courte durée : Airbnb, Booking.com. Calendrier, réservations, nettoyage, contrats, inventaire et plus.",
  keywords: ["airbnb", "booking", "gestion location", "location courte durée", "calendrier réservation", "gestion propriété", "nettoyage", "contrats location"],
  authors: [{ name: "BNBGest Team" }],
  creator: "BNBGest",
  publisher: "BNBGest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://bnbgest.vercel.app',
    siteName: 'BNBGest',
    title: 'BNBGest - Gestion Location Courte Durée',
    description: 'Plateforme complète de gestion pour locations Airbnb et Booking.com',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BNBGest Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BNBGest - Gestion Location Courte Durée',
    description: 'Plateforme complète de gestion pour locations Airbnb et Booking.com',
    images: ['/og-image.png'],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BNBGest",
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  verification: {
    // À ajouter plus tard si besoin
    // google: 'votre-code-verification-google',
    // yandex: 'votre-code-verification-yandex',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
        <meta name="theme-color" content="#FF385C" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BNBGest" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              var t = localStorage.getItem('bnbgest_theme');
              if (t === 'light') {
                document.documentElement.classList.remove('dark');
                document.documentElement.classList.add('light');
              } else {
                document.documentElement.classList.add('dark');
                document.documentElement.classList.remove('light');
              }
            } catch(e) {}
          `
        }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <LanguageProvider>
            <AuthSessionProvider>
              <AuthProvider>
                <CustomizationProvider>
                  <BNBProvider>
                    <ThemeWrapper>
                      {children}
                    </ThemeWrapper>
                  </BNBProvider>
                </CustomizationProvider>
              </AuthProvider>
            </AuthSessionProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Anek_Latin, Anek_Devanagari, IBM_Plex_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { InkFilter } from "@/components/brand";
import { site } from "@/lib/site";
import "./globals.css";

// One Indian type family across both scripts (Ek Type's Anek), with the width
// axis so headlines can run condensed like platform signage. Mono for data.
const anek = Anek_Latin({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-anek",
  display: "swap",
});

// The same family again for headlines, with fallbacks tuned to its condensed
// width (see "PKC Display" faces in globals.css). The automatic fallback is
// sized for normal-width text, so headlines set at 76% width re-wrapped from
// four lines to two when the web font arrived.
const anekDisplay = Anek_Latin({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-anek-display",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["PKC Display Impact", "PKC Display Narrow", "PKC Display Arial", "sans-serif"],
});

const anekDeva = Anek_Devanagari({
  subsets: ["devanagari"],
  axes: ["wdth"],
  variable: "--font-anek-deva",
  display: "swap",
  preload: false,
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

const title = "Plan Karo Chalo · Get the trip out of the group chat";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: title,
    template: "%s · Plan Karo Chalo",
  },
  description: site.description,
  applicationName: site.name,
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
  openGraph: {
    title,
    description: site.description,
    type: "website",
    siteName: site.name,
    locale: "en_IN",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Plan Karo Chalo: a group trip ticket marked confirmed" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: site.description,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F3EE" },
    { media: "(prefers-color-scheme: dark)", color: "#12110D" },
  ],
};

// Applies the saved theme before first paint so there is no flash.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme:dark)").matches);if(d)document.documentElement.classList.add("dark")}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-IN"
      className={`${anek.variable} ${anekDisplay.variable} ${anekDeva.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased grain">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] btn btn-brand btn-sm"
        >
          Skip to content
        </a>
        <InkFilter />
        {children}
        <Analytics />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plan Karo Chalo — Group Trip Planner",
  description:
    "Turn WhatsApp chaos into a confirmed trip. Vote on dates, destinations & budget together — all from one link. No app download needed.",
  metadataBase: new URL("https://plankarochalo.com"),
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "Plan Karo Chalo — Group Trip Planner",
    description:
      "Turn WhatsApp chaos into a confirmed trip. Vote on dates, destinations & budget together.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Plan Karo Chalo",
    description: "Turn WhatsApp chaos into a confirmed trip.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme:dark)").matches);if(d)document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#FAF9F7" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#141316" media="(prefers-color-scheme: dark)" />
      </head>
      <body className="antialiased min-h-screen grain">
        <div className="phone-frame-wrapper">
          <div className="phone-frame">
            <div className="phone-content">
              {children}
            </div>
            <div className="phone-home" />
          </div>
        </div>
        <Analytics />
      </body>
    </html>
  );
}

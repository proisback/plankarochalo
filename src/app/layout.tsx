import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plan Karo Chalo — Group Trip Coordination",
  description:
    "Stop drowning in WhatsApp messages. Align dates, pick a destination, and lock in your group trip — all from one link.",
  metadataBase: new URL("https://plankarochalo.com"),
  openGraph: {
    title: "Plan Karo Chalo",
    description:
      "Align dates, pick a destination, and lock in your group trip — all from one link.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Outfit:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}

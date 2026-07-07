import type { Metadata } from "next";
import { Outfit, Space_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "The Darkroom",
  description:
    "A Room Score built from real proof: social, builder, and work. Not follower counts. Free for builders.",
  metadataBase: new URL("https://www.thedarkroom.xyz"),
  openGraph: {
    title: "The Darkroom",
    description:
      "A Room Score built from real proof: social, builder, and work. Not follower counts. Free for builders.",
    url: "https://www.thedarkroom.xyz",
    siteName: "The Darkroom",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Darkroom",
    description:
      "A Room Score built from real proof: social, builder, and work. Not follower counts. Free for builders.",
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16' },
      { url: '/favicon-32x32.png', sizes: '32x32' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${spaceMono.variable}`}>
      <body className="bg-[#050508] text-white antialiased font-(family-name:--font-outfit)">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
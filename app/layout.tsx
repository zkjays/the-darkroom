import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Darkroom",
  description:
    "Enter the room. Build what matters. A space for builders, creators, and focused minds.",
  metadataBase: new URL("https://www.thedarkroom.xyz"),
  openGraph: {
    title: "The Darkroom",
    description:
      "Enter the room. Build what matters. A space for builders, creators, and focused minds.",
    url: "https://www.thedarkroom.xyz",
    siteName: "The Darkroom",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Darkroom",
    description:
      "Enter the room. Build what matters. A space for builders, creators, and focused minds.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#050508] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
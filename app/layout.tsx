import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Those Who Play",
  description:
    "A small publication about the people, frequencies, and fragments of culture worth paying attention to.",
  metadataBase: new URL("https://www.thosewhoplay.com"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&family=EB+Garamond:wght@400;500&family=Pinyon+Script&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

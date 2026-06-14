import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Review Scout — App Store & Google Play review scraper",
  description:
    "Pull App Store and Google Play reviews into a clean CSV in seconds. Search any app, scrape its star ratings and review text, and export.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

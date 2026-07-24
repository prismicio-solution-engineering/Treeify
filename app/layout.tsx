import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Treeify — Prismic Repo Tree",
  description:
    "Visualize a Prismic repository's Content Relationship hierarchy as an interactive tree.",
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

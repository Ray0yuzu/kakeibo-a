import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "複式家計簿 | Double Entry Kakeibo",
  description: "個人事業主にも使える複式簿記の家計簿アプリ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

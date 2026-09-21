import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SportBridge — сервис в разработке",
  description: "SportBridge — сервис выкупа и доставки спортивных товаров.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

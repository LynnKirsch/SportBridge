import type { Metadata } from "next";
import "../styles/tokens.css";
import "./globals.css";

import { druk, manrope } from "./fonts";

export const metadata: Metadata = {
  title: "SportBridge — выкуп спортивных товаров",
  description: "Пришлите ссылку на спортивный товар — SportBridge проверит его и подготовит заказ к выкупу.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${manrope.variable} ${druk.variable}`}>
      <body>{children}</body>
    </html>
  );
}

import localFont from "next/font/local";

export const druk = localFont({
  src: "../assets/fonts/DrukCyr-Bold.woff2",
  display: "swap",
  weight: "700",
  variable: "--font-druk",
});

export const manrope = localFont({
  src: [
    { path: "../assets/fonts/manrope-regular.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/manrope-medium.woff2", weight: "500", style: "normal" },
    { path: "../assets/fonts/manrope-semibold.woff2", weight: "600", style: "normal" },
    { path: "../assets/fonts/manrope-bold.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-manrope",
});

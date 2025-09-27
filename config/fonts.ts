import { Geist_Mono as FontMono, Geist } from "next/font/google";
import localFont from "next/font/local";

export const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const fontHeading = localFont({
  src: "../assets/CalSans-SemiBold.woff2",
  variable: "--font-heading",
});

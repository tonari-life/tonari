import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PwaRegister from "./pwa-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "となり｜ふたりの気持ちを、毎日そっとつなぐアプリ",
  description:
    "毎日のひとつの質問に、お互いの想いを答えるだけ。ふたりの気持ちが、もっと近くなる中年夫婦のためのアプリです。",

  applicationName: "となり",
  manifest: "/manifest.webmanifest",

  appleWebApp: {
    capable: true,
    title: "となり",
    statusBarStyle: "default",
  },

  formatDetection: {
    telephone: false,
  },

  icons: {
    icon: [
      {
        url: "/favicon.ico",
      },
      {
        url: "/icon-512.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    shortcut: "/favicon.ico",
    apple: [
      {
        url: "/apple-touch-icon.png",
        type: "image/png",
      },
    ],
  },

  openGraph: {
    title: "となり｜ふたりの気持ちを、毎日そっとつなぐアプリ",
    description:
      "毎日のひとつの質問に、お互いの想いを答えるだけ。ふたりの気持ちが、もっと近くなる中年夫婦のためのアプリです。",
    images: [
      {
        url: "/ogp-image.png",
        width: 1200,
        height: 630,
        alt: "となり",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "となり",
    description:
      "ふたりの気持ちを、毎日そっとつなぐアプリ",
    images: ["/ogp-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fbf6f1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
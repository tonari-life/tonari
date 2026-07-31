import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
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
        {children}
      </body>
    </html>
  );
}
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "となり｜ふたりの気持ちを、毎日そっとつなぐアプリ",
    short_name: "となり",
    description:
      "毎日のひとつの質問を通じて、ふたりの気持ちをそっとつなぐアプリです。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fbf6f1",
    theme_color: "#fbf6f1",
    orientation: "portrait",
    lang: "ja",
    icons: [
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WOD Compiler",
    short_name: "WOD Compiler",
    description: "1RM 기반 자동 크로스핏 월간 프로그램 생성 앱",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f6f3ec",
    theme_color: "#d9491d",
    lang: "ko",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

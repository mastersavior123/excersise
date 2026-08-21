import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "WOD Compiler",
  description: "1RM 기반 자동 크로스핏 월간 프로그램 생성 앱",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WOD Compiler",
  },
};

export const viewport: Viewport = {
  themeColor: "#d9491d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <ServiceWorkerRegister />
        <div className="page">{children}</div>
      </body>
    </html>
  );
}

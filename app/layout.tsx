import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WOD Compiler",
  description: "1RM 기반 자동 크로스핏 월간 프로그램 생성 앱",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="page">{children}</div>
      </body>
    </html>
  );
}

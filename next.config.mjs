/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // 서비스워커는 항상 최신 버전을 받아야 업데이트가 반영된다 — 브라우저/CDN 캐시 금지.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;

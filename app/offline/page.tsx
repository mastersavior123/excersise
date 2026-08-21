export default function OfflinePage() {
  return (
    <div className="container">
      <h1>오프라인 상태입니다</h1>
      <p className="lede">
        인터넷 연결이 끊겼습니다. 이 페이지는 서비스워커가 미리 캐시해둔 앱 셸이라 오프라인에서도
        열립니다 — 하지만 프로그램·로그 같은 실제 데이터는 서버에서만 받아오기 때문에 다시
        연결되면 새로고침해야 최신 내용을 볼 수 있습니다.
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import TeamScoreBoard from "./TeamScoreBoard";

export const metadata: Metadata = {
  title: "팀별 점수 대시보드",
  description: "워크샵 문제 정답 시 팀별 점수를 10점씩 올리는 실시간 대시보드",
};

export default function TeamScorePage() {
  return <TeamScoreBoard />;
}

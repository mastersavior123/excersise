"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./team-score.module.css";

type Team = {
  id: string;
  name: string;
  score: number;
};

const MIN_TEAMS = 2;
const MAX_TEAMS = 8;
const POINTS_PER_CORRECT = 10;
const STORAGE_KEY = "workshop-team-score-board";

function createTeam(index: number): Team {
  return { id: `team-${Date.now()}-${index}`, name: `${index}팀`, score: 0 };
}

function defaultTeams(): Team[] {
  return [createTeam(1), createTeam(2)];
}

export default function TeamScoreBoard() {
  const [teams, setTeams] = useState<Team[] | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Team[];
        if (Array.isArray(parsed) && parsed.length >= MIN_TEAMS) {
          setTeams(parsed);
          return;
        }
      }
    } catch {
      // ignore corrupt storage and fall back to defaults
    }
    setTeams(defaultTeams());
  }, []);

  useEffect(() => {
    if (teams) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
    }
  }, [teams]);

  const leaderScore = useMemo(() => {
    if (!teams || teams.length === 0) return 0;
    return Math.max(...teams.map((t) => t.score));
  }, [teams]);

  if (!teams) {
    return <div className={styles.loading}>불러오는 중...</div>;
  }

  const addTeam = () => {
    if (teams.length >= MAX_TEAMS) return;
    setTeams([...teams, createTeam(teams.length + 1)]);
  };

  const removeTeam = () => {
    if (teams.length <= MIN_TEAMS) return;
    setTeams(teams.slice(0, -1));
  };

  const renameTeam = (id: string, name: string) => {
    setTeams(teams.map((t) => (t.id === id ? { ...t, name } : t)));
  };

  const addScore = (id: string, delta: number) => {
    setTeams(teams.map((t) => (t.id === id ? { ...t, score: Math.max(0, t.score + delta) } : t)));
  };

  const resetAll = () => {
    if (!window.confirm("모든 팀의 점수를 0점으로 초기화할까요?")) return;
    setTeams(teams.map((t) => ({ ...t, score: 0 })));
  };

  return (
    <div className={styles.board}>
      <header className={styles.header}>
        <h1 className={styles.title}>워크샵 팀별 점수 대시보드</h1>
        <div className={styles.controls}>
          <div className={styles.teamCountControl}>
            <span className={styles.teamCountLabel}>팀 수</span>
            <button
              type="button"
              className={styles.stepButton}
              onClick={removeTeam}
              disabled={teams.length <= MIN_TEAMS}
              aria-label="팀 수 줄이기"
            >
              −
            </button>
            <span className={styles.teamCount}>{teams.length}</span>
            <button
              type="button"
              className={styles.stepButton}
              onClick={addTeam}
              disabled={teams.length >= MAX_TEAMS}
              aria-label="팀 수 늘리기"
            >
              +
            </button>
          </div>
          <button type="button" className={styles.resetButton} onClick={resetAll}>
            전체 초기화
          </button>
        </div>
      </header>

      <div className={styles.grid} data-count={teams.length}>
        {teams.map((team) => (
          <div key={team.id} className={styles.card} data-leader={team.score === leaderScore && leaderScore > 0}>
            <input
              className={styles.nameInput}
              value={team.name}
              onChange={(e) => renameTeam(team.id, e.target.value)}
              maxLength={20}
              aria-label="팀 이름"
            />
            <div className={styles.score}>{team.score}</div>
            <div className={styles.scoreButtons}>
              <button
                type="button"
                className={styles.minusButton}
                onClick={() => addScore(team.id, -POINTS_PER_CORRECT)}
                aria-label={`${team.name} 점수 10점 감점`}
              >
                −10
              </button>
              <button
                type="button"
                className={styles.plusButton}
                onClick={() => addScore(team.id, POINTS_PER_CORRECT)}
                aria-label={`${team.name} 정답, 10점 추가`}
              >
                정답 +10
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

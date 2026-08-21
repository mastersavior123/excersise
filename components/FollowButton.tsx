"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FollowButton({
  followeeId,
  initialFollowing,
}: {
  followeeId: string;
  initialFollowing: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [submitting, setSubmitting] = useState(false);

  async function toggle() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/follow", {
        method: following ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followeeId }),
      });
      if (res.ok) {
        setFollowing(!following);
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button type="button" className={following ? "secondary" : undefined} disabled={submitting} onClick={toggle}>
      {following ? "팔로우 취소" : "팔로우"}
    </button>
  );
}

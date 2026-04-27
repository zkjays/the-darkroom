"use client";

import { useState, useEffect, useCallback } from "react";

export interface Goal {
  id: string;
  handle: string;
  goal_text: string;
  proof_type: "link" | "screenshot";
  proof_value?: string;
  target_stat: "focus" | "consistency" | "reliability" | "growth";
  is_public: boolean;
  xp_reward: number;
  status: "pending" | "completed" | "failed";
  created_at: string;
  completed_at?: string;
  goal_date: string;
}

export function useGoals(handle: string | null) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!handle) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/goals?handle=${encodeURIComponent(handle)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch goals");
      setGoals(data.goals ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [handle]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addGoal = useCallback(
    async (
      goal_text: string,
      proof_type: "link" | "screenshot",
      target_stat: Goal["target_stat"],
      is_public = false,
      template_id?: string
    ) => {
      if (!handle) return;
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, goal_text, proof_type, target_stat, is_public, template_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add goal");
      await refetch();
      return data.goal as Goal;
    },
    [handle, refetch]
  );

  const completeGoal = useCallback(
    async (goal_id: string, proof_value: string): Promise<{ xp_added: number; points_gained: number; xp_cost: number; new_stat_xp: number } | null> => {
      if (!handle) return null;
      const res = await fetch("/api/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, goal_id, proof_value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to complete goal");
      await refetch();
      return data.xp ?? null;
    },
    [handle, refetch]
  );

  return { goals, loading, error, addGoal, completeGoal, refetch };
}

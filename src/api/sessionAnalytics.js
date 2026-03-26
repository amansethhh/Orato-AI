/**
 * Session Analytics — Orato AI
 * Utility functions for computing session trends, averages, and suggestions.
 */

import { scoreToLevel } from "./aiService.js";

// ── Score Helpers ────────────────────────────────────────────────────────────

function numericScore(level) {
  if (typeof level === "number") return level;
  if (level === "high") return 80;
  if (level === "medium") return 55;
  if (level === "low") return 30;
  return 50;
}

function sessionAvgScore(session) {
  const s = session.scoring || {};
  const vals = ["clarity", "structure", "confidence"].map((k) => numericScore(s[k]));
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute average numeric scores across sessions.
 * @param {Array} sessions
 * @returns {{ clarity: number, confidence: number, structure: number, overall: number, count: number }}
 */
export function getAverageScores(sessions) {
  if (!sessions?.length) return { clarity: 0, confidence: 0, structure: 0, overall: 0, count: 0 };

  let clarity = 0, confidence = 0, structure = 0;
  sessions.forEach((s) => {
    const sc = s.scoring || {};
    clarity += numericScore(sc.clarity);
    confidence += numericScore(sc.confidence);
    structure += numericScore(sc.structure);
  });

  const n = sessions.length;
  return {
    clarity: Math.round(clarity / n),
    confidence: Math.round(confidence / n),
    structure: Math.round(structure / n),
    overall: Math.round((clarity + confidence + structure) / (n * 3)),
    count: n,
  };
}

/**
 * Compare recent sessions (first 3) vs older sessions (next 3).
 * @returns {{ trend: "improving" | "stable" | "declining", delta: number, recentAvg: number, olderAvg: number }}
 */
export function getImprovementTrend(sessions) {
  if (!sessions?.length || sessions.length < 2) {
    return { trend: "stable", delta: 0, recentAvg: 0, olderAvg: 0 };
  }

  const recent = sessions.slice(0, 3).map(sessionAvgScore);
  const older = sessions.slice(3, 6).map(sessionAvgScore);

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;

  if (older.length === 0) return { trend: "stable", delta: 0, recentAvg: Math.round(recentAvg), olderAvg: 0 };

  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  const delta = recentAvg - olderAvg;

  let trend = "stable";
  if (delta > 5) trend = "improving";
  else if (delta < -5) trend = "declining";

  return { trend, delta: Math.round(delta), recentAvg: Math.round(recentAvg), olderAvg: Math.round(olderAvg) };
}

/**
 * Find the weakest skill across recent sessions.
 * @returns {{ skill: string, avg: number, level: string }}
 */
export function getWeakestSkill(sessions) {
  const avgs = getAverageScores(sessions);
  const skills = [
    { skill: "clarity", avg: avgs.clarity },
    { skill: "confidence", avg: avgs.confidence },
    { skill: "structure", avg: avgs.structure },
  ];
  skills.sort((a, b) => a.avg - b.avg);
  const weakest = skills[0];
  return { ...weakest, level: scoreToLevel(weakest.avg) };
}

/**
 * Find the strongest skill across recent sessions.
 * @returns {{ skill: string, avg: number, level: string }}
 */
export function getStrongestSkill(sessions) {
  const avgs = getAverageScores(sessions);
  const skills = [
    { skill: "clarity", avg: avgs.clarity },
    { skill: "confidence", avg: avgs.confidence },
    { skill: "structure", avg: avgs.structure },
  ];
  skills.sort((a, b) => b.avg - a.avg);
  const strongest = skills[0];
  return { ...strongest, level: scoreToLevel(strongest.avg) };
}

/**
 * Suggest what to focus on next, based on weakest skill and recent retry_focus.
 * @returns {{ focus: string, reason: string }}
 */
export function suggestNextFocus(sessions) {
  if (!sessions?.length) return { focus: "confidence", reason: "Start by building confidence." };

  // Use the AI's retry_focus from the last session if available
  const lastFocus = sessions[0]?.retry_focus;
  const weakest = getWeakestSkill(sessions);

  // If the AI suggested something specific, prefer it
  if (lastFocus && lastFocus !== weakest.skill) {
    return { focus: lastFocus, reason: `Your coach suggested focusing on ${lastFocus}.` };
  }

  const reasons = {
    clarity: "Clarity is your growth area — focus on expressing ideas more simply.",
    confidence: "Building confidence will improve your overall delivery.",
    structure: "Structuring responses with beginning-middle-end will boost all scores.",
  };

  return { focus: weakest.skill, reason: reasons[weakest.skill] || "Keep practicing!" };
}

/**
 * Compute practice streak (consecutive recent days with at least 1 session).
 * @returns {{ streak: number, lastDate: string | null }}
 */
export function getStreakInfo(sessions) {
  if (!sessions?.length) return { streak: 0, lastDate: null };

  const dates = [...new Set(sessions.map((s) => {
    try { return new Date(s.created_date).toISOString().slice(0, 10); } catch { return null; }
  }).filter(Boolean))].sort().reverse();

  if (dates.length === 0) return { streak: 0, lastDate: null };

  let streak = 1;
  const today = new Date().toISOString().slice(0, 10);

  // Only count streak if most recent session is today or yesterday
  const daysDiff = Math.floor((new Date(today) - new Date(dates[0])) / (1000 * 60 * 60 * 24));
  if (daysDiff > 1) return { streak: 0, lastDate: dates[0] };

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = Math.floor((prev - curr) / (1000 * 60 * 60 * 24));
    if (diff === 1) streak++;
    else break;
  }

  return { streak, lastDate: dates[0] };
}

/**
 * Get recent previous scores as numeric array (for adaptive question difficulty).
 */
export function getRecentScoreArray(sessions, count = 5) {
  return sessions.slice(0, count).map(sessionAvgScore).map(Math.round);
}

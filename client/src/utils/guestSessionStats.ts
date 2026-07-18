export type GuestSessionStats = {
  wins: number;
  losses: number;
  draws: number;
};

const STORAGE_KEY = 'mpg_guest_session_stats';

const defaultStats = (): GuestSessionStats => ({ wins: 0, losses: 0, draws: 0 });

export const getGuestSessionStats = (): GuestSessionStats => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStats();
    const parsed = JSON.parse(raw) as GuestSessionStats;
    return {
      wins: parsed.wins ?? 0,
      losses: parsed.losses ?? 0,
      draws: parsed.draws ?? 0,
    };
  } catch {
    return defaultStats();
  }
};

export const recordGuestSessionOutcome = (
  outcome: 'win' | 'loss' | 'draw',
): GuestSessionStats => {
  const stats = getGuestSessionStats();
  if (outcome === 'win') stats.wins += 1;
  if (outcome === 'loss') stats.losses += 1;
  if (outcome === 'draw') stats.draws += 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  return stats;
};

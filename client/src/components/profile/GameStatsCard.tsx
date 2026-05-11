import type { GameStats } from '@mpg/shared/types/user';
import { Card } from '../ui';

type GameStatsCardProps = {
  gameLabel: string;
  stats: GameStats;
};

const GAME_TYPE_LABELS: Record<string, string> = {
  tictactoe: 'Tic Tac Toe',
  cardgame: 'Card Game',
};

export const getGameLabel = (gameType: string): string =>
  GAME_TYPE_LABELS[gameType] ?? gameType;

const calculateWinRate = (stats: GameStats): string => {
  if (stats.gamesPlayed === 0) return '0%';
  return `${((stats.wins / stats.gamesPlayed) * 100).toFixed(1)}%`;
};

export const GameStatsCard = ({ gameLabel, stats }: GameStatsCardProps) => {
  return (
    <Card className="space-y-3">
      <h3 className="text-base font-semibold text-fg">{gameLabel}</h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatItem label="Wins" value={stats.wins} color="text-success" />
        <StatItem label="Losses" value={stats.losses} color="text-danger" />
        <StatItem label="Draws" value={stats.draws} color="text-fg-muted" />
        <StatItem label="Played" value={stats.gamesPlayed} color="text-fg" />
        <StatItem label="Win Rate" value={calculateWinRate(stats)} color="text-primary" />
      </div>
    </Card>
  );
};

const StatItem = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) => (
  <div className="text-center">
    <p className={`text-xl font-bold ${color}`}>{value}</p>
    <p className="text-xs text-fg-muted">{label}</p>
  </div>
);

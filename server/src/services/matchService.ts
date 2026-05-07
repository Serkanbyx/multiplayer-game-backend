import { db } from '../db/index.js';
import { matches, type NewMatchRow, type MatchRow } from '../db/schema/index.js';
import { incrementStats } from './userService.js';
import type { GameType } from '@mpg/shared/types/games.js';
import type {
  MatchPlayerSnapshot,
  MatchResult,
  MatchMove,
} from '@mpg/shared/types/match.js';

export interface RecordMatchInput {
  gameType: GameType;
  roomCode: string;
  players: MatchPlayerSnapshot[];
  result: MatchResult;
  moves?: MatchMove[];
  duration: number;
  totalRounds?: number;
  startedAt: Date;
  endedAt: Date;
}

/**
 * Insert a finished match and atomically increment stats for every registered
 * (non-guest) player. The whole operation runs inside a transaction so a partial
 * failure rolls back the match insert as well, keeping stats and history consistent.
 */
export const recordMatch = async (input: RecordMatchInput): Promise<MatchRow> => {
  const winnerId =
    input.result.outcome === 'win' ? input.result.winnerId : null;

  return db.transaction(async (tx) => {
    const insertValues: NewMatchRow = {
      gameType: input.gameType,
      roomCode: input.roomCode,
      players: input.players,
      result: input.result,
      moves: input.moves ?? [],
      duration: input.duration,
      totalRounds: input.totalRounds ?? 1,
      winnerUserId: winnerId,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
    };

    const [row] = await tx.insert(matches).values(insertValues).returning();
    if (!row) throw new Error('Match insert returned no row');

    if (input.result.outcome !== 'forfeit') {
      for (const player of input.players) {
        if (player.isGuest || !player.userId) continue;

        let outcome: 'wins' | 'losses' | 'draws';
        if (input.result.outcome === 'draw') {
          outcome = 'draws';
        } else if (input.result.winnerId === player.userId) {
          outcome = 'wins';
        } else {
          outcome = 'losses';
        }

        await incrementStats(player.userId, input.gameType, outcome);
      }
    }

    return row;
  });
};

export const abortMatch = async (
  input: Omit<RecordMatchInput, 'result'> & { forfeitedBy: string },
): Promise<MatchRow> => {
  const insertValues: NewMatchRow = {
    gameType: input.gameType,
    roomCode: input.roomCode,
    players: input.players,
    result: { outcome: 'forfeit', forfeitedBy: input.forfeitedBy },
    moves: input.moves ?? [],
    duration: input.duration,
    totalRounds: input.totalRounds ?? 1,
    winnerUserId: null,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
  };

  const [row] = await db.insert(matches).values(insertValues).returning();
  if (!row) throw new Error('Match insert returned no row');
  return row;
};

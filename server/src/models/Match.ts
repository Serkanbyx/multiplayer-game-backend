import { Schema, model, type Document, type Types } from 'mongoose';
import type { GameType } from '@mpg/shared/types/games.js';
import type { MatchPlayerSnapshot, MatchResult } from '@mpg/shared/types/match.js';

/* ------------------------------------------------------------------ */
/*  Interface                                                          */
/* ------------------------------------------------------------------ */

export interface IMatch extends Document {
  roomCode: string;
  gameType: GameType;
  players: (MatchPlayerSnapshot & { userId: Types.ObjectId | string })[];
  result: MatchResult;
  duration: number;
  totalRounds: number;
  startedAt: Date;
  endedAt: Date;
}

/* ------------------------------------------------------------------ */
/*  Sub-schemas                                                        */
/* ------------------------------------------------------------------ */

const matchPlayerSnapshotSchema = new Schema(
  {
    userId: { type: Schema.Types.Mixed, required: true },
    displayName: { type: String, required: true },
    avatar: { type: String },
    isGuest: { type: Boolean, default: false },
    score: { type: Number, default: 0 },
  },
  { _id: false },
);

const matchResultSchema = new Schema(
  {
    outcome: {
      type: String,
      enum: ['win', 'draw', 'forfeit'],
      required: true,
    },
    winnerId: { type: String },
    forfeitedBy: { type: String },
  },
  { _id: false },
);

/* ------------------------------------------------------------------ */
/*  Match schema                                                       */
/* ------------------------------------------------------------------ */

const matchSchema = new Schema<IMatch>(
  {
    roomCode: { type: String, required: true },
    gameType: {
      type: String,
      enum: ['tic-tac-toe', 'card-game'],
      required: true,
    },
    players: { type: [matchPlayerSnapshotSchema], required: true },
    result: { type: matchResultSchema, required: true },
    duration: { type: Number, default: 0 },
    totalRounds: { type: Number, default: 1 },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

/* ------------------------------------------------------------------ */
/*  Indexes                                                            */
/* ------------------------------------------------------------------ */

matchSchema.index({ 'players.userId': 1, createdAt: -1 });
matchSchema.index({ roomCode: 1 });

const Match = model<IMatch>('Match', matchSchema);
export default Match;

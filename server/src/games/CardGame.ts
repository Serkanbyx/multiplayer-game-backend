import { BaseGame, type GameConfig, type ActionResult } from './BaseGame.js';
import type { CardGameState, Card, Suit, Rank } from '../../../shared/types/games.js';
import type { RoomPlayer } from '../../../shared/types/room.js';
import { shuffle } from '../utils/shuffle.js';
import { buildDeck } from '../utils/deck.js';

type MoveEntry = { userId: string; card: Card; trickNumber: number; t: number };

const SUITS: readonly Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: readonly Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUIT_ORDER: Record<Suit, number> = { '♠': 0, '♥': 1, '♦': 2, '♣': 3 };
const RANK_ORDER_MAP: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

/** Sorts a hand by suit (♠♥♦♣) then rank ascending for stable display. */
const sortHand = (hand: Card[]): Card[] =>
  hand.sort((a, b) => SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit] || RANK_ORDER_MAP[a.rank] - RANK_ORDER_MAP[b.rank]);

type PlayerData = {
  userId: string;
  displayName: string;
  position: 0 | 1 | 2 | 3;
  hand: Card[];
};

export class CardGame extends BaseGame<CardGameState> {
  private static readonly RANK_ORDER: Record<Rank, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  };

  private players: PlayerData[];
  private currentTurnIndex: 0 | 1 | 2 | 3;
  private currentTrick: { userId: string; card: Card }[];
  private leadSuit: Suit | null;
  private trickNumber: number;
  private tricksWon: Record<string, number>;
  private winner: string | null = null;
  private result: 'win' | 'draw' | null = null;
  private moves: MoveEntry[] = [];

  static override getConfig(): GameConfig {
    return { gameType: 'cardgame', minPlayers: 4, maxPlayers: 4 };
  }

  constructor({ players }: { players: RoomPlayer[] }) {
    super();

    if (players.length !== 4) {
      throw new Error('CardGame requires exactly 4 players');
    }

    const deck = buildDeck();
    const shuffled = shuffle(deck);

    this.players = players.map((p, i) => ({
      userId: p.userId,
      displayName: p.displayName,
      position: i as 0 | 1 | 2 | 3,
      hand: sortHand(shuffled.slice(i * 13, i * 13 + 13)),
    }));

    this.tricksWon = Object.fromEntries(this.players.map((p) => [p.userId, 0]));

    const startingIndex = this.players.findIndex((p) =>
      p.hand.some((c) => c.suit === '♣' && c.rank === '2'),
    );
    this.currentTurnIndex = (startingIndex !== -1 ? startingIndex : 0) as 0 | 1 | 2 | 3;

    this.currentTrick = [];
    this.leadSuit = null;
    this.trickNumber = 0;
  }

  /* ─── State Accessors ──────────────────────────────────────── */

  getStateFor(viewerUserId: string | null): CardGameState {
    const me = viewerUserId ? this.players.find((p) => p.userId === viewerUserId) : null;
    return {
      gameType: 'cardgame',
      players: this.players.map((p) => ({
        userId: p.userId,
        displayName: p.displayName,
        position: p.position,
        handCount: p.hand.length,
        tricksWon: this.tricksWon[p.userId] ?? 0,
      })),
      ...(me && { myHand: [...me.hand] }),
      currentTrick: this.currentTrick.map((c) => ({ userId: c.userId, card: c.card })),
      leadSuit: this.leadSuit,
      currentTurnUserId: this.players[this.currentTurnIndex]!.userId,
      trickNumber: this.trickNumber,
      result: this.result,
      winner: this.winner,
    };
  }

  getPublicState(): CardGameState {
    return this.getStateFor(null);
  }

  /* ─── Core Action Handler ──────────────────────────────────── */

  applyAction(userId: string, action: string, payload: unknown): ActionResult {
    if (this.result !== null) {
      throw new Error('GAME_OVER');
    }

    if (action !== 'play_card') {
      throw new Error('UNKNOWN_ACTION');
    }

    if (!this.#isValidPlayPayload(payload)) {
      throw new Error('INVALID_PAYLOAD');
    }

    const currentPlayer = this.players[this.currentTurnIndex]!;

    if (userId !== currentPlayer.userId) {
      throw new Error('NOT_YOUR_TURN');
    }

    const { card } = payload;
    const cardIndex = currentPlayer.hand.findIndex((c) => c.suit === card.suit && c.rank === card.rank);

    if (cardIndex === -1) {
      throw new Error('INVALID_CARD');
    }

    if (this.currentTrick.length > 0 && this.leadSuit !== null) {
      const hasLeadSuit = currentPlayer.hand.some((c) => c.suit === this.leadSuit);
      if (hasLeadSuit && card.suit !== this.leadSuit) {
        throw new Error('MUST_FOLLOW_SUIT');
      }
    }

    currentPlayer.hand.splice(cardIndex, 1);
    this.currentTrick.push({ userId, card });

    if (this.currentTrick.length === 1) {
      this.leadSuit = card.suit;
    }

    this.moves.push({ userId, card, trickNumber: this.trickNumber, t: Date.now() });

    if (this.currentTrick.length === 4) {
      this.#resolveTrick();
      return { stateChanged: true, gameOver: this.result !== null };
    }

    this.currentTurnIndex = ((this.currentTurnIndex + 1) % 4) as 0 | 1 | 2 | 3;
    return { stateChanged: true, gameOver: false };
  }

  /* ─── Helpers ──────────────────────────────────────────────── */

  getCurrentPlayerId(): string {
    return this.players[this.currentTurnIndex]!.userId;
  }

  isGameOver(): boolean {
    return this.result !== null;
  }

  getResult(): { result: 'win' | 'draw'; winnerId?: string } | null {
    if (this.result === null) return null;
    if (this.winner) return { result: this.result, winnerId: this.winner };
    return { result: this.result };
  }

  getMoveLog(): MoveEntry[] {
    return [...this.moves];
  }

  /* ─── Serialization ────────────────────────────────────────── */

  serialize(): unknown {
    return {
      players: this.players,
      currentTrick: this.currentTrick,
      leadSuit: this.leadSuit,
      currentTurnIndex: this.currentTurnIndex,
      tricksWon: this.tricksWon,
      trickNumber: this.trickNumber,
      result: this.result,
      winner: this.winner,
      moves: this.moves,
    };
  }

  static override deserialize(raw: unknown): CardGame {
    if (typeof raw !== 'object' || raw === null) {
      throw new Error('Invalid CardGame state: expected object');
    }

    const data = raw as Record<string, unknown>;

    if (!Array.isArray(data.players) || data.players.length !== 4) {
      throw new Error('Invalid CardGame state: players must be array of 4');
    }
    if (!Array.isArray(data.currentTrick)) {
      throw new Error('Invalid CardGame state: currentTrick must be array');
    }
    if (typeof data.currentTurnIndex !== 'number') {
      throw new Error('Invalid CardGame state: currentTurnIndex must be number');
    }
    if (typeof data.trickNumber !== 'number') {
      throw new Error('Invalid CardGame state: trickNumber must be number');
    }
    if (typeof data.tricksWon !== 'object' || data.tricksWon === null) {
      throw new Error('Invalid CardGame state: tricksWon must be object');
    }
    if (!Array.isArray(data.moves)) {
      throw new Error('Invalid CardGame state: moves must be array');
    }

    const validated = data as {
      players: PlayerData[];
      currentTurnIndex: 0 | 1 | 2 | 3;
      currentTrick: { userId: string; card: Card }[];
      leadSuit: Suit | null;
      trickNumber: number;
      tricksWon: Record<string, number>;
      winner: string | null;
      result: 'win' | 'draw' | null;
      moves: MoveEntry[];
    };

    const instance = Object.create(CardGame.prototype) as CardGame;
    instance.players = validated.players.map((p) => ({
      ...p,
      hand: p.hand.map((c) => ({ suit: c.suit, rank: c.rank })),
    }));
    instance.currentTurnIndex = validated.currentTurnIndex;
    instance.currentTrick = validated.currentTrick;
    instance.leadSuit = validated.leadSuit;
    instance.trickNumber = validated.trickNumber;
    instance.tricksWon = validated.tricksWon;
    instance.winner = validated.winner;
    instance.result = validated.result;
    instance.moves = validated.moves;
    return instance;
  }

  /* ─── Trick Resolution (JS private fields) ──────────────────── */

  #resolveTrick(): void {
    const lead = this.leadSuit!;
    const followingLeadSuit = this.currentTrick.filter((c) => c.card.suit === lead);
    const winningEntry = followingLeadSuit.reduce((best, cur) =>
      CardGame.RANK_ORDER[cur.card.rank] > CardGame.RANK_ORDER[best.card.rank] ? cur : best,
    );

    this.tricksWon[winningEntry.userId] = (this.tricksWon[winningEntry.userId] ?? 0) + 1;
    this.currentTurnIndex = this.players.findIndex((p) => p.userId === winningEntry.userId) as 0 | 1 | 2 | 3;

    this.currentTrick = [];
    this.leadSuit = null;
    this.trickNumber += 1;

    if (this.trickNumber >= 13) this.#finalize();
  }

  #finalize(): void {
    const entries = Object.entries(this.tricksWon);
    const maxTricks = Math.max(...entries.map(([, v]) => v));
    const topPlayers = entries.filter(([, v]) => v === maxTricks);

    if (topPlayers.length === 1) {
      this.result = 'win';
      this.winner = topPlayers[0]![0];
    } else {
      this.result = 'draw';
      this.winner = null;
    }
  }

  /* ─── Validation ───────────────────────────────────────────── */

  #isValidPlayPayload(payload: unknown): payload is { card: Card } {
    if (typeof payload !== 'object' || payload === null) return false;
    const p = payload as Record<string, unknown>;
    if (typeof p.card !== 'object' || p.card === null) return false;
    const card = p.card as Record<string, unknown>;
    return (
      typeof card.suit === 'string' &&
      SUITS.includes(card.suit as Suit) &&
      typeof card.rank === 'string' &&
      RANKS.includes(card.rank as Rank)
    );
  }
}

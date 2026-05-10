import { BaseGame, type GameConfig, type ActionResult } from './BaseGame.js';
import type { CardGameState, Card, Suit, Rank } from '../../../shared/types/games.js';
import type { RoomPlayer } from '../../../shared/types/room.js';
import { shuffle } from '../utils/shuffle.js';
import { buildDeck } from '../utils/deck.js';

type MoveEntry = { userId: string; card: Card; trickNumber: number; t: number };

const SUITS: readonly Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: readonly Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUIT_ORDER: Record<Suit, number> = { '♠': 0, '♥': 1, '♦': 2, '♣': 3 };
const RANK_ORDER: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

/** Sorts a hand by suit (♠♥♦♣) then rank ascending for stable display. */
const sortHand = (hand: Card[]): Card[] =>
  hand.sort((a, b) => SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit] || RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);

type PlayerData = {
  userId: string;
  displayName: string;
  position: 0 | 1 | 2 | 3;
  hand: Card[];
  tricksWon: number;
};

export class CardGame extends BaseGame<CardGameState> {
  private players: PlayerData[];
  private currentTurnIndex: 0 | 1 | 2 | 3;
  private currentTrick: { userId: string; card: Card }[];
  private leadSuit: Suit | null;
  private trickNumber: number;
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
      tricksWon: 0,
    }));

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
        tricksWon: p.tricksWon,
      })),
      myHand: me ? [...me.hand] : undefined,
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

    if (!this.isValidPlayPayload(payload)) {
      throw new Error('INVALID_PAYLOAD');
    }

    if (userId !== this.players[this.currentTurnIndex].userId) {
      throw new Error('NOT_YOUR_TURN');
    }

    const { card } = payload;
    const player = this.players[this.currentTurnIndex];
    const cardIndex = player.hand.findIndex((c) => c.suit === card.suit && c.rank === card.rank);

    if (cardIndex === -1) {
      throw new Error('INVALID_CARD');
    }

    if (this.currentTrick.length > 0 && this.leadSuit !== null) {
      const hasLeadSuit = player.hand.some((c) => c.suit === this.leadSuit);
      if (hasLeadSuit && card.suit !== this.leadSuit) {
        throw new Error('MUST_FOLLOW_SUIT');
      }
    }

    player.hand.splice(cardIndex, 1);
    this.currentTrick.push({ userId, card });

    if (this.currentTrick.length === 1) {
      this.leadSuit = card.suit;
    }

    this.moves.push({ userId, card, trickNumber: this.trickNumber, t: Date.now() });

    if (this.currentTrick.length === 4) {
      return this.resolveTrick();
    }

    this.currentTurnIndex = ((this.currentTurnIndex + 1) % 4) as 0 | 1 | 2 | 3;
    return { stateChanged: true, gameOver: this.result !== null };
  }

  /* ─── Helpers ──────────────────────────────────────────────── */

  getCurrentPlayerId(): string {
    return this.players[this.currentTurnIndex]!.userId;
  }

  isGameOver(): boolean {
    return this.result !== null;
  }

  getResult(): { result: 'win' | 'draw'; winnerId?: string } | null {
    if (!this.result) return null;
    return this.result === 'win'
      ? { result: 'win', winnerId: this.winner! }
      : { result: 'draw' };
  }

  getMoveLog(): MoveEntry[] {
    return [...this.moves];
  }

  /* ─── Serialization ────────────────────────────────────────── */

  serialize(): unknown {
    return {
      players: this.players,
      currentTurnIndex: this.currentTurnIndex,
      currentTrick: this.currentTrick,
      leadSuit: this.leadSuit,
      trickNumber: this.trickNumber,
      winner: this.winner,
      result: this.result,
      moves: this.moves,
    };
  }

  static override deserialize(raw: unknown): CardGame {
    const data = raw as {
      players: PlayerData[];
      currentTurnIndex: 0 | 1 | 2 | 3;
      currentTrick: { userId: string; card: Card }[];
      leadSuit: Suit | null;
      trickNumber: number;
      winner: string | null;
      result: 'win' | 'draw' | null;
      moves: MoveEntry[];
    };

    const instance = Object.create(CardGame.prototype) as CardGame;
    instance.players = data.players;
    instance.currentTurnIndex = data.currentTurnIndex;
    instance.currentTrick = data.currentTrick;
    instance.leadSuit = data.leadSuit;
    instance.trickNumber = data.trickNumber;
    instance.winner = data.winner;
    instance.result = data.result;
    instance.moves = data.moves;
    return instance;
  }

  /* ─── Trick Resolution ─────────────────────────────────────── */

  private resolveTrick(): ActionResult {
    const trickWinner = this.determineTrickWinner();
    const winnerIndex = this.players.findIndex((p) => p.userId === trickWinner);
    this.players[winnerIndex]!.tricksWon++;

    this.currentTrick = [];
    this.leadSuit = null;
    this.currentTurnIndex = winnerIndex as 0 | 1 | 2 | 3;

    const allHandsEmpty = this.players.every((p) => p.hand.length === 0);
    if (allHandsEmpty) {
      return this.determineGameResult();
    }

    this.trickNumber++;
    return { stateChanged: true, gameOver: false };
  }

  private determineTrickWinner(): string {
    const leadSuit = this.leadSuit!;
    const leadSuitCards = this.currentTrick.filter((entry) => entry.card.suit === leadSuit);

    let best = leadSuitCards[0]!;
    for (const entry of leadSuitCards) {
      if (RANK_ORDER[entry.card.rank] > RANK_ORDER[best.card.rank]) {
        best = entry;
      }
    }

    return best.userId;
  }

  private determineGameResult(): ActionResult {
    const maxTricks = Math.max(...this.players.map((p) => p.tricksWon));
    const winners = this.players.filter((p) => p.tricksWon === maxTricks);

    if (winners.length === 1) {
      this.winner = winners[0]!.userId;
      this.result = 'win';
      return { stateChanged: true, gameOver: true, result: 'win', winnerId: this.winner };
    }

    this.result = 'draw';
    return { stateChanged: true, gameOver: true, result: 'draw' };
  }

  /* ─── Validation ───────────────────────────────────────────── */

  private isValidPlayPayload(payload: unknown): payload is { card: Card } {
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

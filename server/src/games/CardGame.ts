import { BaseGame, type GameConfig, type ActionResult } from './BaseGame.js';
import type { CardGameState, Card, Suit, Rank } from '../../../shared/types/games.js';
import type { RoomPlayer } from '../../../shared/types/room.js';

type MoveEntry = { userId: string; card: Card; trickNumber: number; timestamp: number };

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_ORDER: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp;
  }
  return shuffled;
}

type PlayerData = {
  userId: string;
  displayName: string;
  position: 0 | 1 | 2 | 3;
  hand: Card[];
  tricksWon: number;
};

export class CardGame extends BaseGame<CardGameState> {
  private players: PlayerData[];
  private currentTurnIndex: number;
  private currentTrick: { userId: string; card: Card }[];
  private leadSuit: Suit | null;
  private trickNumber: number;
  private totalTricks: number;
  private winner: string | null = null;
  private result: 'win' | 'draw' | null = null;
  private moveLog: MoveEntry[] = [];

  constructor({ players }: { players: RoomPlayer[] }) {
    super();

    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const playerCount = shuffled.length;
    const deck = shuffleDeck(buildDeck());
    const cardsPerPlayer = Math.floor(deck.length / playerCount);

    this.players = shuffled.map((p, i) => ({
      userId: p.userId,
      displayName: p.displayName,
      position: i as 0 | 1 | 2 | 3,
      hand: deck.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer),
      tricksWon: 0,
    }));

    this.totalTricks = cardsPerPlayer;
    this.currentTurnIndex = 0;
    this.currentTrick = [];
    this.leadSuit = null;
    this.trickNumber = 1;
  }

  static override getConfig(): GameConfig {
    return { gameType: 'cardgame', minPlayers: 2, maxPlayers: 4 };
  }

  getStateFor(userId: string | null): CardGameState {
    const state = this.getPublicState();
    if (!userId) return state;

    const player = this.players.find((p) => p.userId === userId);
    if (player) {
      return { ...state, myHand: [...player.hand] };
    }
    return state;
  }

  getPublicState(): CardGameState {
    return {
      gameType: 'cardgame',
      players: this.players.map((p) => ({
        userId: p.userId,
        displayName: p.displayName,
        position: p.position,
        handCount: p.hand.length,
        tricksWon: p.tricksWon,
      })),
      currentTrick: [...this.currentTrick],
      leadSuit: this.leadSuit,
      currentTurnUserId: this.getCurrentPlayerId(),
      trickNumber: this.trickNumber,
      result: this.result,
      winner: this.winner,
    };
  }

  applyAction(userId: string, action: string, payload: unknown): ActionResult {
    if (this.isGameOver()) {
      throw new Error('GAME_ALREADY_OVER');
    }

    if (action !== 'play') {
      throw new Error('INVALID_ACTION');
    }

    if (userId !== this.getCurrentPlayerId()) {
      throw new Error('NOT_YOUR_TURN');
    }

    if (!this.isValidPlayPayload(payload)) {
      throw new Error('INVALID_PAYLOAD');
    }

    const { card } = payload;
    const player = this.players[this.currentTurnIndex]!;
    const cardIndex = player.hand.findIndex((c) => c.suit === card.suit && c.rank === card.rank);

    if (cardIndex === -1) {
      throw new Error('CARD_NOT_IN_HAND');
    }

    if (this.leadSuit && card.suit !== this.leadSuit) {
      const hasLeadSuit = player.hand.some((c) => c.suit === this.leadSuit);
      if (hasLeadSuit) {
        throw new Error('MUST_FOLLOW_SUIT');
      }
    }

    player.hand.splice(cardIndex, 1);
    this.currentTrick.push({ userId, card });
    this.moveLog.push({ userId, card, trickNumber: this.trickNumber, timestamp: Date.now() });

    if (this.currentTrick.length === 1) {
      this.leadSuit = card.suit;
    }

    if (this.currentTrick.length === this.players.length) {
      return this.resolveTrick();
    }

    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
    return { stateChanged: true, gameOver: false };
  }

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
    return [...this.moveLog];
  }

  serialize(): unknown {
    return {
      players: this.players,
      currentTurnIndex: this.currentTurnIndex,
      currentTrick: this.currentTrick,
      leadSuit: this.leadSuit,
      trickNumber: this.trickNumber,
      totalTricks: this.totalTricks,
      winner: this.winner,
      result: this.result,
      moveLog: this.moveLog,
    };
  }

  static override deserialize(raw: unknown): CardGame {
    const data = raw as {
      players: PlayerData[];
      currentTurnIndex: number;
      currentTrick: { userId: string; card: Card }[];
      leadSuit: Suit | null;
      trickNumber: number;
      totalTricks: number;
      winner: string | null;
      result: 'win' | 'draw' | null;
      moveLog: MoveEntry[];
    };

    const instance = Object.create(CardGame.prototype) as CardGame;
    instance.players = data.players;
    instance.currentTurnIndex = data.currentTurnIndex;
    instance.currentTrick = data.currentTrick;
    instance.leadSuit = data.leadSuit;
    instance.trickNumber = data.trickNumber;
    instance.totalTricks = data.totalTricks;
    instance.winner = data.winner;
    instance.result = data.result;
    instance.moveLog = data.moveLog;
    return instance;
  }

  private resolveTrick(): ActionResult {
    const trickWinner = this.determineTrickWinner();
    const winnerIndex = this.players.findIndex((p) => p.userId === trickWinner);
    this.players[winnerIndex]!.tricksWon++;

    this.currentTrick = [];
    this.leadSuit = null;
    this.currentTurnIndex = winnerIndex;

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

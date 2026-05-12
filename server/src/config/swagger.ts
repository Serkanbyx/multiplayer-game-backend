import { readFileSync } from 'node:fs';
import path from 'node:path';

const { version } = JSON.parse(
  readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'),
) as { version: string };

const bearerAuth: Record<string, unknown> = {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Enter your JWT token (e.g. `eyJhbGciOi...`)',
};

const paginationParams: Record<string, unknown>[] = [
  {
    name: 'page',
    in: 'query',
    schema: { type: 'integer', minimum: 1, default: 1 },
    description: 'Page number',
  },
  {
    name: 'limit',
    in: 'query',
    schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
    description: 'Items per page',
  },
];

/* ------------------------------------------------------------------ */
/*  Reusable Schemas                                                   */
/* ------------------------------------------------------------------ */

const GameStats: Record<string, unknown> = {
  type: 'object',
  properties: {
    wins: { type: 'integer', example: 12 },
    losses: { type: 'integer', example: 5 },
    draws: { type: 'integer', example: 3 },
    gamesPlayed: { type: 'integer', example: 20 },
  },
};

const UserPreferences: Record<string, unknown> = {
  type: 'object',
  properties: {
    theme: { type: 'string', enum: ['light', 'dark', 'system'], example: 'system' },
    fontSize: { type: 'string', enum: ['small', 'medium', 'large'], example: 'medium' },
    animations: { type: 'boolean', example: true },
    sounds: { type: 'boolean', example: true },
    soundVolume: { type: 'number', minimum: 0, maximum: 1, example: 0.7 },
    language: { type: 'string', example: 'en' },
    notifications: {
      type: 'object',
      properties: {
        matchInvite: { type: 'boolean', example: true },
        rematch: { type: 'boolean', example: true },
      },
    },
    privacy: {
      type: 'object',
      properties: {
        showStats: { type: 'boolean', example: true },
        showOnLeaderboard: { type: 'boolean', example: true },
      },
    },
  },
};

const PublicUser: Record<string, unknown> = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
    username: { type: 'string', example: 'player_one' },
    displayName: { type: 'string', example: 'Player One' },
    avatarUrl: { type: 'string', example: '/uploads/avatars/abc123.jpg' },
    bio: { type: 'string', example: 'I love tic-tac-toe!' },
    role: { type: 'string', enum: ['player', 'admin'], example: 'player' },
    createdAt: { type: 'string', format: 'date-time' },
    stats: GameStats,
    statsByGame: {
      type: 'object',
      additionalProperties: GameStats,
      example: { tictactoe: { wins: 8, losses: 2, draws: 1, gamesPlayed: 11 } },
    },
  },
};

const FullUser: Record<string, unknown> = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    username: { type: 'string', example: 'player_one' },
    email: { type: 'string', format: 'email', example: 'player@example.com' },
    displayName: { type: 'string', example: 'Player One' },
    avatarUrl: { type: 'string', example: '/uploads/avatars/abc123.jpg' },
    role: { type: 'string', enum: ['player', 'admin'], example: 'player' },
    isGuest: { type: 'boolean', example: false },
    bio: { type: 'string', example: 'I love tic-tac-toe!' },
    stats: GameStats,
    statsByGame: {
      type: 'object',
      additionalProperties: GameStats,
    },
    preferences: UserPreferences,
    lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const MatchPlayerSnapshot: Record<string, unknown> = {
  type: 'object',
  properties: {
    userId: { type: 'string', format: 'uuid', nullable: true },
    displayName: { type: 'string', example: 'Player One' },
    avatar: { type: 'string', nullable: true },
    isGuest: { type: 'boolean', example: false },
    score: { type: 'integer', example: 1 },
    position: { type: 'integer', nullable: true },
  },
};

const MatchResult: Record<string, unknown> = {
  type: 'object',
  description: 'Match result — one of: win (with winnerId), draw, or forfeit (with forfeitedBy)',
  properties: {
    outcome: { type: 'string', enum: ['win', 'draw', 'forfeit'], example: 'win' },
    winnerId: { type: 'string', format: 'uuid', description: 'Present when outcome is "win"' },
    forfeitedBy: { type: 'string', format: 'uuid', description: 'Present when outcome is "forfeit"' },
  },
  required: ['outcome'],
};

const MatchRecord: Record<string, unknown> = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    roomCode: { type: 'string', example: 'ABC123' },
    gameType: { type: 'string', enum: ['tictactoe', 'cardgame'], example: 'tictactoe' },
    players: { type: 'array', items: MatchPlayerSnapshot },
    result: MatchResult,
    moves: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          by: { type: 'string', format: 'uuid' },
          type: { type: 'string', example: 'tictactoe:play' },
          payload: { type: 'object' },
          at: { type: 'integer', description: 'Timestamp in milliseconds' },
        },
      },
    },
    winnerUserId: { type: 'string', format: 'uuid', nullable: true },
    duration: { type: 'integer', description: 'Duration in seconds', example: 45 },
    totalRounds: { type: 'integer', example: 1 },
    startedAt: { type: 'string', format: 'date-time' },
    endedAt: { type: 'string', format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

const Pagination: Record<string, unknown> = {
  type: 'object',
  properties: {
    page: { type: 'integer', example: 1 },
    limit: { type: 'integer', example: 20 },
    total: { type: 'integer', example: 150 },
    totalPages: { type: 'integer', example: 8 },
    hasNext: { type: 'boolean', example: true },
    hasPrev: { type: 'boolean', example: false },
  },
};

const ErrorResponse: Record<string, unknown> = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string', example: 'Validation failed' },
    errors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field: { type: 'string', example: 'email' },
          message: { type: 'string', example: 'Please provide a valid email' },
        },
      },
    },
  },
};

const ValidationError: Record<string, unknown> = {
  description: 'Validation error',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
};

const Unauthorized: Record<string, unknown> = {
  description: 'Not authenticated — missing or invalid token',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Not authenticated' },
        },
      },
    },
  },
};

const Forbidden: Record<string, unknown> = {
  description: 'Forbidden — insufficient permissions',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Forbidden — admin access required' },
        },
      },
    },
  },
};

const NotFound: Record<string, unknown> = {
  description: 'Resource not found',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Not found' },
        },
      },
    },
  },
};

/* ------------------------------------------------------------------ */
/*  OpenAPI Spec                                                       */
/* ------------------------------------------------------------------ */

export const swaggerSpec: Record<string, unknown> = {
  openapi: '3.0.3',
  info: {
    title: 'Multiplayer Game Backend API',
    version,
    description:
      'Real-time multiplayer game platform API with room management, matchmaking, spectators, chat, and leaderboard. ' +
      'Supports Tic-Tac-Toe and Card Game, extendable via GameFactory pattern.\n\n' +
      '**Authentication:** Most endpoints require a JWT Bearer token obtained from `/api/auth/login` or `/api/auth/register`. ' +
      'Guest tokens are available via `/api/auth/guest` with limited functionality.\n\n' +
      '**Real-time:** WebSocket events are documented separately — this spec covers only the REST API.',
    contact: {
      name: 'Serkanby',
      url: 'https://serkanbayraktar.com/',
    },
  },
  servers: [
    { url: '/', description: 'Current server' },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication & account management' },
    { name: 'Users', description: 'User profiles, avatars, and preferences' },
    { name: 'Matches', description: 'Match history and details' },
    { name: 'Leaderboard', description: 'Global rankings' },
    { name: 'Admin', description: 'Admin dashboard, user and room management' },
    { name: 'Health', description: 'Service health check' },
  ],
  components: {
    securitySchemes: { BearerAuth: bearerAuth },
    schemas: {
      GameStats,
      UserPreferences,
      PublicUser,
      FullUser,
      MatchPlayerSnapshot,
      MatchResult,
      MatchRecord,
      Pagination,
      ErrorResponse,
    },
    responses: {
      ValidationError,
      Unauthorized,
      Forbidden,
      NotFound,
    },
  },
  paths: {
    /* ============================================================== */
    /*  HEALTH                                                         */
    /* ============================================================== */
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns the service health status including database and Redis connectivity.',
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    uptime: { type: 'number', description: 'Server uptime in seconds', example: 12345.67 },
                    db: { type: 'boolean', description: 'PostgreSQL connection status', example: true },
                    redis: { type: 'boolean', description: 'Redis connection status', example: true },
                  },
                },
              },
            },
          },
        },
      },
    },

    /* ============================================================== */
    /*  AUTH                                                            */
    /* ============================================================== */
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new account',
        description: 'Creates a new user account and returns a JWT token with the user profile.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'email', 'password', 'displayName'],
                properties: {
                  username: {
                    type: 'string',
                    minLength: 3,
                    maxLength: 20,
                    pattern: '^[a-z0-9_]+$',
                    example: 'player_one',
                    description: 'Lowercase letters, numbers, and underscores only',
                  },
                  email: { type: 'string', format: 'email', example: 'player@example.com' },
                  password: {
                    type: 'string',
                    minLength: 8,
                    example: 'SecurePass1',
                    description: 'Min 8 chars, must include uppercase, lowercase, and a digit',
                  },
                  displayName: { type: 'string', minLength: 2, maxLength: 30, example: 'Player One' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Registration successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Registration successful' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/FullUser' },
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
                      },
                    },
                  },
                },
              },
            },
          },
          409: {
            description: 'Username or email already in use',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Username or email already in use' },
                  },
                },
              },
            },
          },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },

    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email & password',
        description: 'Authenticates a registered user and returns a JWT token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'player@example.com' },
                  password: { type: 'string', example: 'SecurePass1' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Login successful' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/FullUser' },
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'Invalid email or password' },
                  },
                },
              },
            },
          },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },

    '/api/auth/guest': {
      post: {
        tags: ['Auth'],
        summary: 'Login as a guest',
        description: 'Creates a temporary guest session with limited functionality (no leaderboard, no admin). Token expires in 2 hours.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['displayName'],
                properties: {
                  displayName: {
                    type: 'string',
                    minLength: 3,
                    maxLength: 20,
                    example: 'GuestPlayer',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Guest login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Guest login successful' },
                    data: {
                      type: 'object',
                      properties: {
                        user: {
                          type: 'object',
                          properties: {
                            _id: { type: 'string', format: 'uuid' },
                            displayName: { type: 'string', example: 'GuestPlayer' },
                            isGuest: { type: 'boolean', example: true },
                            role: { type: 'string', example: 'player' },
                          },
                        },
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
                      },
                    },
                  },
                },
              },
            },
          },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },

    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get authenticated user info',
        description: 'Returns the currently authenticated registered user profile.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'User profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: { user: { $ref: '#/components/schemas/FullUser' } },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      put: {
        tags: ['Auth'],
        summary: 'Update profile',
        description: 'Update display name, bio, or avatar URL for the authenticated user.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  displayName: { type: 'string', minLength: 2, maxLength: 30, example: 'New Name' },
                  bio: { type: 'string', maxLength: 200, example: 'Updated bio text' },
                  avatarUrl: { type: 'string', format: 'uri', example: 'https://example.com/avatar.jpg' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Profile updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Profile updated' },
                    data: {
                      type: 'object',
                      properties: { user: { $ref: '#/components/schemas/FullUser' } },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
      delete: {
        tags: ['Auth'],
        summary: 'Delete account',
        description: 'Permanently deletes the authenticated user account. Requires password confirmation.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: {
                  password: { type: 'string', example: 'SecurePass1', description: 'Current password for confirmation' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Account deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Account deleted successfully' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/api/auth/me/password': {
      put: {
        tags: ['Auth'],
        summary: 'Change password',
        description: 'Changes the password for the authenticated user. Requires the current password.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string', example: 'OldPass123' },
                  newPassword: {
                    type: 'string',
                    minLength: 8,
                    example: 'NewSecure1',
                    description: 'Min 8 characters',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Password changed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Password changed successfully' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },

    /* ============================================================== */
    /*  USERS                                                          */
    /* ============================================================== */
    '/api/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Get own profile',
        description: 'Returns the full profile of the authenticated user including preferences, stats, and email.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Own profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: { user: { $ref: '#/components/schemas/FullUser' } },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update own profile',
        description: 'Update display name or bio. Only whitelisted fields are accepted.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  displayName: { type: 'string', minLength: 2, maxLength: 30, example: 'New Name' },
                  bio: { type: 'string', maxLength: 200, example: 'Updated bio' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Profile updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Profile updated' },
                    data: {
                      type: 'object',
                      properties: { user: { $ref: '#/components/schemas/FullUser' } },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },

    '/api/users/me/avatar': {
      post: {
        tags: ['Users'],
        summary: 'Upload avatar',
        description: 'Upload a new avatar image. Accepts JPEG, PNG, and WebP (max 5 MB). Replaces existing avatar if present.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['avatar'],
                properties: {
                  avatar: {
                    type: 'string',
                    format: 'binary',
                    description: 'Image file (jpeg, png, webp — max 5 MB)',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Avatar uploaded',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Avatar uploaded' },
                    data: {
                      type: 'object',
                      properties: {
                        avatarUrl: { type: 'string', example: '/uploads/avatars/uuid-avatar.jpg' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'No file uploaded or invalid file type',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Remove avatar',
        description: 'Removes the current avatar and resets to default.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Avatar removed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Avatar removed' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/api/users/me/preferences': {
      patch: {
        tags: ['Users'],
        summary: 'Update preferences',
        description:
          'Partially updates the user preferences. Nested objects (`notifications`, `privacy`) are shallow-merged with existing values.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  theme: { type: 'string', enum: ['light', 'dark', 'system'] },
                  fontSize: { type: 'string', enum: ['small', 'medium', 'large'] },
                  animations: { type: 'boolean' },
                  sounds: { type: 'boolean' },
                  soundVolume: { type: 'number', minimum: 0, maximum: 1 },
                  language: { type: 'string', enum: ['en'] },
                  notifications: {
                    type: 'object',
                    properties: {
                      matchInvite: { type: 'boolean' },
                      rematch: { type: 'boolean' },
                    },
                  },
                  privacy: {
                    type: 'object',
                    properties: {
                      showStats: { type: 'boolean' },
                      showOnLeaderboard: { type: 'boolean' },
                    },
                  },
                },
              },
              example: { theme: 'dark', sounds: false, privacy: { showOnLeaderboard: false } },
            },
          },
        },
        responses: {
          200: {
            description: 'Preferences updated — returns full merged preferences',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Preferences updated' },
                    data: { $ref: '#/components/schemas/UserPreferences' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },

    '/api/users/{username}': {
      get: {
        tags: ['Users'],
        summary: 'Get public profile',
        description:
          'Returns the public profile of a user by username. Stats are included only if the user has `privacy.showStats` enabled.',
        parameters: [
          {
            name: 'username',
            in: 'path',
            required: true,
            schema: { type: 'string', minLength: 3, maxLength: 20, pattern: '^[a-z0-9_]+$' },
            example: 'player_one',
          },
        ],
        responses: {
          200: {
            description: 'Public user profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: { user: { $ref: '#/components/schemas/PublicUser' } },
                    },
                  },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },

    '/api/users/{username}/matches': {
      get: {
        tags: ['Users'],
        summary: 'Get user match history',
        description: 'Returns paginated match history for a specific user.',
        parameters: [
          {
            name: 'username',
            in: 'path',
            required: true,
            schema: { type: 'string', minLength: 3, maxLength: 20, pattern: '^[a-z0-9_]+$' },
            example: 'player_one',
          },
          ...paginationParams,
        ],
        responses: {
          200: {
            description: 'User match history',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        matches: { type: 'array', items: { $ref: '#/components/schemas/MatchRecord' } },
                        pagination: { $ref: '#/components/schemas/Pagination' },
                      },
                    },
                  },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },

    /* ============================================================== */
    /*  MATCHES                                                        */
    /* ============================================================== */
    '/api/matches': {
      get: {
        tags: ['Matches'],
        summary: 'List recent matches',
        description: 'Returns paginated list of recent matches. Optionally filter by game type.',
        parameters: [
          ...paginationParams,
          {
            name: 'gameType',
            in: 'query',
            schema: { type: 'string', enum: ['tictactoe', 'cardgame'] },
            description: 'Filter by game type',
          },
        ],
        responses: {
          200: {
            description: 'Match list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        matches: { type: 'array', items: { $ref: '#/components/schemas/MatchRecord' } },
                        pagination: { $ref: '#/components/schemas/Pagination' },
                      },
                    },
                  },
                },
              },
            },
          },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },

    '/api/matches/{id}': {
      get: {
        tags: ['Matches'],
        summary: 'Get match details',
        description: 'Returns detailed information about a specific match by UUID.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Match UUID',
          },
        ],
        responses: {
          200: {
            description: 'Match details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: { match: { $ref: '#/components/schemas/MatchRecord' } },
                    },
                  },
                },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },

    /* ============================================================== */
    /*  LEADERBOARD                                                    */
    /* ============================================================== */
    '/api/leaderboard': {
      get: {
        tags: ['Leaderboard'],
        summary: 'Get global leaderboard',
        description:
          'Returns the global leaderboard ranked by wins (descending). Guests and users with `showOnLeaderboard: false` are excluded. ' +
          'Optionally filter by game type to see per-game rankings.',
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number',
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
            description: 'Items per page (max 100)',
          },
          {
            name: 'gameType',
            in: 'query',
            schema: { type: 'string', enum: ['tictactoe', 'cardgame'] },
            description: 'Filter and rank by specific game type',
          },
        ],
        responses: {
          200: {
            description: 'Leaderboard entries',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        leaderboard: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', format: 'uuid' },
                              username: { type: 'string', example: 'player_one' },
                              displayName: { type: 'string', example: 'Player One' },
                              avatarUrl: { type: 'string' },
                              stats: { $ref: '#/components/schemas/GameStats' },
                              gameStats: {
                                $ref: '#/components/schemas/GameStats',
                                description: 'Per-game stats (present only when gameType filter is applied)',
                              },
                            },
                          },
                        },
                        pagination: { $ref: '#/components/schemas/Pagination' },
                      },
                    },
                  },
                },
              },
            },
          },
          422: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },

    /* ============================================================== */
    /*  ADMIN                                                          */
    /* ============================================================== */
    '/api/admin/stats': {
      get: {
        tags: ['Admin'],
        summary: 'Dashboard statistics',
        description: 'Returns platform-wide statistics including total users, matches, active rooms, and matchmaking queue size.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Dashboard stats',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        totalUsers: { type: 'integer', example: 1250 },
                        totalAdmins: { type: 'integer', example: 3 },
                        totalMatches: { type: 'integer', example: 5000 },
                        matchesByGameType: {
                          type: 'object',
                          additionalProperties: { type: 'integer' },
                          example: { tictactoe: 3200, cardgame: 1800 },
                        },
                        activeRoomsCount: { type: 'integer', example: 15 },
                        queueSize: { type: 'integer', example: 4 },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/api/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List all users',
        description: 'Returns paginated list of all users with optional search (username, email, displayName) and role filter.',
        security: [{ BearerAuth: [] }],
        parameters: [
          ...paginationParams,
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string', maxLength: 100 },
            description: 'Search by username, email, or display name (case-insensitive)',
          },
          {
            name: 'role',
            in: 'query',
            schema: { type: 'string', enum: ['player', 'admin'] },
            description: 'Filter by user role',
          },
        ],
        responses: {
          200: {
            description: 'User list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        users: { type: 'array', items: { $ref: '#/components/schemas/FullUser' } },
                        pagination: { $ref: '#/components/schemas/Pagination' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/api/admin/users/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'Get user by ID',
        description: 'Returns a full user record (without password) by UUID.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'User UUID',
          },
        ],
        responses: {
          200: {
            description: 'User details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: { user: { $ref: '#/components/schemas/FullUser' } },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Delete a user',
        description:
          'Permanently deletes a user by UUID. Admins cannot delete themselves. The last remaining admin cannot be deleted.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'User UUID',
          },
        ],
        responses: {
          200: {
            description: 'User deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'User deleted' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Cannot delete the only admin',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/admin/users/{id}/role': {
      patch: {
        tags: ['Admin'],
        summary: 'Update user role',
        description:
          'Changes a user\'s role to player or admin. Admins cannot change their own role. The last remaining admin cannot be demoted.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'User UUID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                properties: {
                  role: { type: 'string', enum: ['player', 'admin'], example: 'admin' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Role updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'User role updated' },
                    data: {
                      type: 'object',
                      properties: { user: { $ref: '#/components/schemas/FullUser' } },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Cannot demote the only admin',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/admin/rooms': {
      get: {
        tags: ['Admin'],
        summary: 'List active rooms',
        description: 'Returns all active game rooms from Redis with their status, game type, and player count.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Active rooms',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        rooms: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              roomCode: { type: 'string', example: 'ABC123' },
                              gameType: { type: 'string', enum: ['tictactoe', 'cardgame'], example: 'tictactoe' },
                              status: { type: 'string', example: 'waiting' },
                              playerCount: { type: 'integer', example: 2 },
                              createdAt: { type: 'string', format: 'date-time', nullable: true },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/api/admin/rooms/{roomCode}': {
      delete: {
        tags: ['Admin'],
        summary: 'Force-close a room',
        description:
          'Forcefully closes a game room, emits `room:closed` to all connected sockets, and removes it from Redis.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'roomCode',
            in: 'path',
            required: true,
            schema: { type: 'string', maxLength: 36 },
            description: 'Room code',
            example: 'ABC123',
          },
        ],
        responses: {
          200: {
            description: 'Room closed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Room closed' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/admin/matches': {
      get: {
        tags: ['Admin'],
        summary: 'List matches (admin view)',
        description: 'Returns paginated match list without privacy filtering. Supports game type filter.',
        security: [{ BearerAuth: [] }],
        parameters: [
          ...paginationParams,
          {
            name: 'gameType',
            in: 'query',
            schema: { type: 'string', enum: ['tictactoe', 'cardgame'] },
            description: 'Filter by game type',
          },
        ],
        responses: {
          200: {
            description: 'Match list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        matches: { type: 'array', items: { $ref: '#/components/schemas/MatchRecord' } },
                        pagination: { $ref: '#/components/schemas/Pagination' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
  },
};

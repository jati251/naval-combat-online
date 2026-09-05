import type { ClientMessage, ShipClass, SailState } from '../types/protocol.js';

interface ClientRateLimitState {
  count: number;
  lastReset: number;
  roomCreateCount: number;
  lastRoomCreate: number;
}

export class SecurityGuard {
  // Max packets allowed per 1-second window
  private static readonly MAX_PACKETS_PER_SEC = 50;
  private static readonly FLOOD_DISCONNECT_THRESHOLD = 95;
  // Max concurrent rooms on server to prevent RAM exhaustion
  public static readonly MAX_GLOBAL_ROOMS = 50;
  // Room create cooldown (ms)
  private static readonly ROOM_CREATE_COOLDOWN_MS = 3000;

  private static clientStates = new Map<string, ClientRateLimitState>();

  /**
   * Cleans up tracking state on client disconnect.
   */
  public static removeClient(clientId: string): void {
    this.clientStates.delete(clientId);
  }

  /**
   * Rate limits incoming WebSocket messages per client.
   * Returns:
   *   'ALLOW' - process message
   *   'DROP' - rate limit, drop message
   *   'DISCONNECT' - severe flooding, terminate socket
   */
  public static checkMessageRate(clientId: string): 'ALLOW' | 'DROP' | 'DISCONNECT' {
    const now = Date.now();
    let state = this.clientStates.get(clientId);

    if (!state) {
      state = {
        count: 1,
        lastReset: now,
        roomCreateCount: 0,
        lastRoomCreate: 0,
      };
      this.clientStates.set(clientId, state);
      return 'ALLOW';
    }

    if (now - state.lastReset > 1000) {
      state.count = 1;
      state.lastReset = now;
      return 'ALLOW';
    }

    state.count++;

    if (state.count > this.FLOOD_DISCONNECT_THRESHOLD) {
      console.warn(`[ANTI-CHEAT] Socket flood detected from client ${clientId} (${state.count} pkts/s). Disconnecting.`);
      return 'DISCONNECT';
    }

    if (state.count > this.MAX_PACKETS_PER_SEC) {
      return 'DROP';
    }

    return 'ALLOW';
  }

  /**
   * Enforces room creation rate limits.
   */
  public static canCreateRoom(clientId: string): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const state = this.clientStates.get(clientId);

    if (state && now - state.lastRoomCreate < this.ROOM_CREATE_COOLDOWN_MS) {
      return {
        allowed: false,
        reason: 'Harap tunggu beberapa detik sebelum membuat room baru!',
      };
    }

    if (state) {
      state.lastRoomCreate = now;
      state.roomCreateCount++;
    }

    return { allowed: true };
  }

  /**
   * Strips HTML tags and dangerous characters (Anti-XSS).
   */
  public static sanitizeString(input: string, maxLength: number): string {
    if (typeof input !== 'string') return '';
    // Strip HTML tags and control characters
    const sanitized = input
      .replace(/<[^>]*>?/gm, '')
      .replace(/[<>"'&]/g, '')
      .trim();
    return sanitized.substring(0, maxLength);
  }

  /**
   * Validates and sanitizes ClientMessage payload against tampering / malformed input.
   */
  public static validateAndSanitize(msg: unknown): ClientMessage | null {
    if (!msg || typeof msg !== 'object') return null;

    const raw = msg as Record<string, unknown>;
    if (typeof raw.type !== 'string') return null;

    switch (raw.type) {
      case 'CREATE_ROOM': {
        const roomName = this.sanitizeString(String(raw.roomName || 'Fleet Arena'), 30);
        const playerName = this.sanitizeString(String(raw.playerName || 'Captain'), 20);
        const shipClass = this.validateShipClass(raw.shipClass);
        let maxPlayers = typeof raw.maxPlayers === 'number' ? Math.floor(raw.maxPlayers) : 4;
        maxPlayers = Math.max(2, Math.min(8, maxPlayers));

        return {
          type: 'CREATE_ROOM',
          roomName: roomName || 'Fleet Battle',
          playerName: playerName || 'Captain',
          shipClass,
          maxPlayers,
        };
      }

      case 'JOIN_ROOM': {
        const roomId = this.sanitizeString(String(raw.roomId || ''), 40);
        const playerName = this.sanitizeString(String(raw.playerName || 'Captain'), 20);
        const shipClass = this.validateShipClass(raw.shipClass);

        if (!roomId) return null;

        return {
          type: 'JOIN_ROOM',
          roomId,
          playerName: playerName || 'Captain',
          shipClass,
        };
      }

      case 'LEAVE_ROOM':
      case 'START_GAME':
      case 'GET_ROOMS':
        return { type: raw.type };

      case 'SET_READY':
        return {
          type: 'SET_READY',
          ready: Boolean(raw.ready),
        };

      case 'SELECT_SHIP':
        return {
          type: 'SELECT_SHIP',
          shipClass: this.validateShipClass(raw.shipClass),
        };

      case 'INPUT': {
        const seq = typeof raw.seq === 'number' && Number.isFinite(raw.seq) ? raw.seq : 0;
        const rawRudder = typeof raw.rudder === 'number' && Number.isFinite(raw.rudder) ? raw.rudder : 0;
        // Clamp rudder strictly to [-1, 1]
        const rudder = Math.max(-1, Math.min(1, rawRudder));
        const sail = this.validateSailState(raw.sail);

        return {
          type: 'INPUT',
          seq,
          rudder,
          sail,
        };
      }

      case 'FIRE_BROADSIDE': {
        const side = raw.side === 'port' ? 'port' : 'starboard';
        const angle = typeof raw.angle === 'number' && Number.isFinite(raw.angle) ? raw.angle : 0;
        return {
          type: 'FIRE_BROADSIDE',
          side,
          angle,
        };
      }

      case 'PING': {
        const clientTime = typeof raw.clientTime === 'number' && Number.isFinite(raw.clientTime)
          ? raw.clientTime
          : Date.now();
        return {
          type: 'PING',
          clientTime,
        };
      }

      default:
        return null;
    }
  }

  private static validateShipClass(val: unknown): ShipClass {
    if (val === 'sloop' || val === 'brig' || val === 'frigate') {
      return val;
    }
    return 'sloop';
  }

  private static validateSailState(val: unknown): SailState {
    if (val === 'FULL_SAIL' || val === 'HALF_SAIL' || val === 'ANCHOR') {
      return val;
    }
    if (val === 'FULL') return 'FULL_SAIL';
    if (val === 'HALF' || val === 'BATTLE') return 'HALF_SAIL';
    return 'ANCHOR';
  }
}

import { PhysicsEngine } from './PhysicsEngine.js';
import {
  type ShipClass,
  type SailState,
  type ShipSimulationState,
  type CannonballSimulationState,
  type RoomInfo,
  type RoomPlayer,
  type ServerMessage,
  SERVER_SHIP_CONFIGS,
} from '../types/protocol.js';

export interface BroadsideFireCommand {
  playerId: string;
  side: 'port' | 'starboard';
  angle: number;
}

export class GameRoom {
  public id: string;
  public name: string;
  public maxPlayers: number;
  public status: 'LOBBY' | 'IN_GAME' | 'FINISHED' = 'LOBBY';

  public players: Map<string, RoomPlayer> = new Map();
  public ships: Map<string, ShipSimulationState> = new Map();
  public cannonballs: CannonballSimulationState[] = [];

  public windAngle: number = Math.random() * Math.PI * 2;
  public windSpeed: number = 10 + Math.random() * 6; // knots

  private tickTimer: NodeJS.Timeout | null = null;
  private autoResetTimer: NodeJS.Timeout | null = null;
  private tickSeq: number = 0;
  private startTime: number = 0;
  private lastTickTime: number = 0;
  private tickAccumulator: number = 0;
  private readonly FIXED_DT: number = 1 / 30; // 33.333ms deterministic timestep
  private wasMultiplayer: boolean = false;

  // Broadcast and direct send callbacks
  private broadcast: (roomId: string, message: ServerMessage) => void;
  private sendDirect: (clientId: string, message: ServerMessage) => void;

  constructor(
    id: string,
    name: string,
    maxPlayers: number,
    broadcast: (roomId: string, message: ServerMessage) => void,
    sendDirect: (clientId: string, message: ServerMessage) => void
  ) {
    this.id = id;
    this.name = name;
    this.maxPlayers = maxPlayers;
    this.broadcast = broadcast;
    this.sendDirect = sendDirect;
  }

  public addPlayer(id: string, name: string, shipClass: ShipClass): boolean {
    if (this.players.size >= this.maxPlayers || this.status !== 'LOBBY') {
      return false;
    }

    const isHost = this.players.size === 0;
    this.players.set(id, {
      id,
      name,
      shipClass,
      isReady: isHost, // Host is ready by default
      isHost,
      score: 0,
    });

    this.broadcastRoomState();
    return true;
  }

  public addPlayerMidGame(id: string, name: string, shipClass: ShipClass): void {
    const isHost = this.players.size === 0;
    this.players.set(id, {
      id,
      name,
      shipClass,
      isReady: true,
      isHost,
      score: 0,
    });

    const config = SERVER_SHIP_CONFIGS[shipClass];
    // Spread spawn in safe radius facing center
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnRadius = 80 + Math.random() * 25;
    const x = Math.sin(spawnAngle) * spawnRadius;
    const z = Math.cos(spawnAngle) * spawnRadius;
    const rotationY = spawnAngle + Math.PI;

    this.ships.set(id, {
      id,
      name,
      shipClass,
      x,
      y: 0,
      z,
      vx: 0,
      vz: 0,
      speed: 0,
      rotationY,
      pitch: 0,
      roll: 0,
      rudder: 0,
      sail: 'ANCHOR',
      health: config.maxHealth,
      maxHealth: config.maxHealth,
      isSunk: false,
      score: 0,
      reloadTimerPort: 0,
      reloadTimerStarboard: 0,
    });

    this.broadcastRoomState();
    this.broadcastSnapshot();
  }

  public removePlayer(id: string): void {
    const wasHost = this.players.get(id)?.isHost ?? false;
    this.players.delete(id);
    this.ships.delete(id);

    if (wasHost && this.players.size > 0) {
      const nextHost = this.players.values().next().value;
      if (nextHost) nextHost.isHost = true;
    }

    if (this.players.size === 0) {
      this.destroy();
      return;
    }

    if (this.status === 'IN_GAME') {
      this.broadcastSnapshot();
      this.checkVictoryCondition();
    }

    this.broadcastRoomState();
  }

  public setPlayerReady(id: string, ready: boolean): void {
    const player = this.players.get(id);
    if (!player || this.status !== 'LOBBY') return;
    player.isReady = ready;
    this.broadcastRoomState();
  }

  public setPlayerShip(id: string, shipClass: ShipClass): void {
    const player = this.players.get(id);
    if (!player || this.status !== 'LOBBY') return;
    player.shipClass = shipClass;
    this.broadcastRoomState();
  }

  public handleInput(id: string, rudder: number, sail: SailState): void {
    const ship = this.ships.get(id);
    if (!ship || ship.isSunk) return;

    // Clamp rudder between -1 and 1
    ship.rudder = Math.max(-1, Math.min(1, rudder));
    ship.sail = sail;
  }

  public handleFire(id: string, side: 'port' | 'starboard'): void {
    const ship = this.ships.get(id);
    if (!ship || ship.isSunk || this.status !== 'IN_GAME') return;

    const config = SERVER_SHIP_CONFIGS[ship.shipClass];
    const reloadTimer = side === 'port' ? ship.reloadTimerPort : ship.reloadTimerStarboard;

    if (reloadTimer > 0) {
      return; // Still reloading
    }

    // Reset reload timer
    if (side === 'port') ship.reloadTimerPort = config.reloadTime;
    else ship.reloadTimerStarboard = config.reloadTime;

    const serverTime = (Date.now() - this.startTime) / 1000;
    const count = config.cannonsPerSide;
    const span = config.length * 0.65;
    const step = span / (count + 1);

    // Direction vector perpendicular to ship heading
    // Port is left (-90 deg), Starboard is right (+90 deg)
    const fireAngle = ship.rotationY + (side === 'port' ? -Math.PI * 0.5 : Math.PI * 0.5);
    const muzzleSpeed = 38 + Math.random() * 4; // m/s

    for (let i = 1; i <= count; i++) {
      const offsetAlongLength = -span * 0.5 + i * step;

      // Spawn position on deck side
      const posX = ship.x + Math.sin(ship.rotationY) * offsetAlongLength + Math.sin(fireAngle) * (config.width * 0.5 + 0.2);
      const posZ = ship.z + Math.cos(ship.rotationY) * offsetAlongLength + Math.cos(fireAngle) * (config.width * 0.5 + 0.2);
      const posY = ship.y + 1.8; // Deck height

      // Slight random spread
      const spreadX = (Math.random() - 0.5) * 0.05;
      const spreadY = (Math.random() - 0.5) * 0.03;

      const vx = Math.sin(fireAngle + spreadX) * muzzleSpeed;
      const vy = 5.5 + spreadY * 10; // slight upward arc
      const vz = Math.cos(fireAngle + spreadX) * muzzleSpeed;

      this.cannonballs.push({
        id: `${ship.id}-${Date.now()}-${i}`,
        ownerId: ship.id,
        x: posX,
        y: posY,
        z: posZ,
        vx,
        vy,
        vz,
        damage: config.cannonDamage,
        createdAt: serverTime,
        maxLife: 4.5,
      });
    }

    // Notify all players about muzzle flash and sound event
    this.broadcast(this.id, {
      type: 'CANNON_FIRED',
      ownerId: ship.id,
      side,
      origin: [ship.x, ship.y + 1.8, ship.z],
      count,
    });
  }

  public startGame(): boolean {
    if (this.status !== 'LOBBY' || this.players.size < 1) return false;

    if (this.autoResetTimer) {
      clearTimeout(this.autoResetTimer);
      this.autoResetTimer = null;
    }

    this.status = 'IN_GAME';
    this.wasMultiplayer = this.players.size > 1;
    this.startTime = Date.now();
    this.lastTickTime = this.startTime;
    this.tickAccumulator = 0;
    this.cannonballs = [];
    this.ships.clear();

    // Spawn ships in perimeter circle facing center with ample maneuvering space
    const playerArray = Array.from(this.players.values());
    const spawnRadius = Math.max(75, playerArray.length * 35);

    playerArray.forEach((player, idx) => {
      const spawnAngle = (idx / playerArray.length) * Math.PI * 2;
      const x = Math.sin(spawnAngle) * spawnRadius;
      const z = Math.cos(spawnAngle) * spawnRadius;
      // Face towards center (0, 0)
      const rotationY = spawnAngle + Math.PI;
      const config = SERVER_SHIP_CONFIGS[player.shipClass];

      this.ships.set(player.id, {
        id: player.id,
        name: player.name,
        shipClass: player.shipClass,
        x,
        y: 0,
        z,
        vx: 0,
        vz: 0,
        speed: 0,
        rotationY,
        pitch: 0,
        roll: 0,
        rudder: 0,
        sail: 'ANCHOR',
        health: config.maxHealth,
        maxHealth: config.maxHealth,
        isSunk: false,
        score: 0,
        reloadTimerPort: 0,
        reloadTimerStarboard: 0,
      });
    });

    const startMsg: ServerMessage = {
      type: 'GAME_STARTED',
      startTime: this.startTime,
      windAngle: this.windAngle,
      windSpeed: this.windSpeed,
    };

    // 1. Broadcast to room pub/sub topic
    this.broadcast(this.id, startMsg);

    // 2. Direct message to EVERY player in room (guarantees host/sender receives it without pub/sub echo suppression)
    for (const playerId of this.players.keys()) {
      this.sendDirect(playerId, startMsg);
    }

    // Start 30Hz simulation loop (1000/30 ~ 33.3ms)
    this.tickTimer = setInterval(() => this.tick(), 1000 / 30);
    return true;
  }

  private tick(): void {
    const now = Date.now();
    const elapsed = Math.min(0.15, (now - this.lastTickTime) / 1000);
    this.lastTickTime = now;
    this.tickAccumulator += elapsed;

    let simulatedSteps = 0;
    // Step deterministic physics at exactly FIXED_DT (30Hz)
    while (this.tickAccumulator >= this.FIXED_DT && simulatedSteps < 4) {
      this.tickAccumulator -= this.FIXED_DT;
      simulatedSteps++;
      this.tickSeq++;
      const serverTime = (now - this.startTime) / 1000;

      // Update each ship's physics with deterministic FIXED_DT
      for (const ship of this.ships.values()) {
        PhysicsEngine.updateShip(ship, this.FIXED_DT, serverTime, this.windAngle, this.windSpeed);
      }

      // Update cannonballs & check impacts
      this.cannonballs = PhysicsEngine.updateCannonballs(
        this.cannonballs,
        this.ships,
        this.FIXED_DT,
        serverTime,
        (ball, hitShip) => {
          hitShip.health = Math.max(0, hitShip.health - ball.damage);

          this.broadcast(this.id, {
            type: 'HIT_EVENT',
            targetId: hitShip.id,
            attackerId: ball.ownerId,
            damage: ball.damage,
            hitPos: [ball.x, ball.y, ball.z],
            remainingHp: hitShip.health,
          });

          if (hitShip.health <= 0 && !hitShip.isSunk) {
            hitShip.isSunk = true;
            const killer = this.players.get(ball.ownerId);
            if (killer) killer.score += 100;

            this.broadcast(this.id, {
              type: 'SHIP_SUNK',
              shipId: hitShip.id,
              killerId: ball.ownerId,
            });

            this.checkVictoryCondition();
          }
        }
      );
    }

    // Broadcast snapshot whenever simulation stepped forward
    if (simulatedSteps > 0) {
      this.broadcastSnapshot();
    }
  }

  public broadcastSnapshot(): void {
    const serverTime = (Date.now() - this.startTime) / 1000;
    const shipsPayload = Array.from(this.ships.values()).map(
      ({ reloadTimerPort: _p, reloadTimerStarboard: _s, ...publicShip }) => publicShip
    );

    const cannonballsPayload = this.cannonballs.map((b) => ({
      id: b.id,
      ownerId: b.ownerId,
      x: b.x,
      y: b.y,
      z: b.z,
      vx: b.vx,
      vy: b.vy,
      vz: b.vz,
    }));

    this.broadcast(this.id, {
      type: 'WORLD_SNAPSHOT',
      tick: this.tickSeq,
      serverTime,
      ships: shipsPayload,
      cannonballs: cannonballsPayload,
    });
  }

  public getStartTime(): number {
    return this.startTime;
  }

  private checkVictoryCondition(): void {
    if (this.status !== 'IN_GAME') return;

    const aliveShips = Array.from(this.ships.values()).filter((s) => !s.isSunk);
    const totalPlayers = this.players.size;

    // Trigger game over if:
    // 1. All ships are sunk (mutual destruction)
    // 2. Only 1 alive ship left in a multiplayer match
    // 3. Only 1 player remains mid-game because other captains disconnected / retreated
    const shouldEnd =
      (aliveShips.length === 0 && totalPlayers > 0) ||
      (this.wasMultiplayer && aliveShips.length <= 1) ||
      (this.wasMultiplayer && totalPlayers <= 1);

    if (shouldEnd) {
      this.status = 'FINISHED';
      if (this.tickTimer) {
        clearInterval(this.tickTimer);
        this.tickTimer = null;
      }

      const winner = aliveShips[0] || Array.from(this.ships.values())[0];
      const winnerName = winner?.name || (totalPlayers === 1 ? 'Sole Survivor' : 'No one');
      this.broadcast(this.id, {
        type: 'GAME_OVER',
        winnerId: winner?.id ?? '',
        winnerName,
      });

      this.broadcastRoomState();

      // Automatically reset room to LOBBY after 12s so remaining captains can fight again
      if (this.autoResetTimer) clearTimeout(this.autoResetTimer);
      this.autoResetTimer = setTimeout(() => {
        if (this.status === 'FINISHED' && this.players.size > 0) {
          this.resetToLobby();
        }
      }, 12000);
    }
  }

  public resetToLobby(): void {
    if (this.autoResetTimer) {
      clearTimeout(this.autoResetTimer);
      this.autoResetTimer = null;
    }
    this.status = 'LOBBY';
    this.ships.clear();
    this.cannonballs = [];
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    // Unready all players except host
    for (const player of this.players.values()) {
      player.isReady = player.isHost;
    }
    this.broadcastRoomState();
  }

  public getRoomInfo(): RoomInfo {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      players: Array.from(this.players.values()),
      maxPlayers: this.maxPlayers,
      windAngle: this.windAngle,
      windSpeed: this.windSpeed,
    };
  }

  public broadcastRoomState(): void {
    const roomInfo = this.getRoomInfo();
    this.broadcast(this.id, {
      type: 'ROOM_STATE',
      room: roomInfo,
      selfId: '',
    });

    // Direct send to each player with their verified selfId
    for (const playerId of this.players.keys()) {
      this.sendDirect(playerId, {
        type: 'ROOM_STATE',
        room: roomInfo,
        selfId: playerId,
      });
    }
  }

  public destroy(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.autoResetTimer) {
      clearTimeout(this.autoResetTimer);
      this.autoResetTimer = null;
    }
    this.players.clear();
    this.ships.clear();
    this.cannonballs = [];
  }
}

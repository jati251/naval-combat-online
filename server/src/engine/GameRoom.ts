import { PhysicsEngine } from './PhysicsEngine.js';
import { BotAI } from './BotAI.js';
import { getBroadsideTransform } from './NavalCombatMath.js';
import {
  type ShipClass,
  type SailState,
  type ShipSimulationState,
  type CannonballSimulationState,
  type RoomInfo,
  type RoomPlayer,
  type ServerMessage,
  type BroadsideFireCommand,
  SERVER_SHIP_CONFIGS,
} from '../types/protocol.js';

export type { BroadsideFireCommand };

export class GameRoom {
  private static readonly BOT_NAMES = [
    'Corsair Blackbeard',
    'Captain Calico Jack',
    'Corsair Anne Bonny',
    'Captain Henry Morgan',
    'Black Bart Roberts',
    'Captain Edward Low',
    'Captain Mary Read',
    'Captain William Kidd',
  ];

  public id: string;
  public name: string;
  public maxPlayers: number;
  public status: 'LOBBY' | 'IN_GAME' | 'FINISHED' = 'LOBBY';
  public timeOfDay: 'DAY' | 'NIGHT';
  public targetKills: number = 5;

  public players: Map<string, RoomPlayer> = new Map();
  public ships: Map<string, ShipSimulationState> = new Map();
  public cannonballs: CannonballSimulationState[] = [];

  public windAngle: number = Math.random() * Math.PI * 2;
  public windSpeed: number = 10 + Math.random() * 6; // knots

  private autoResetTimer: NodeJS.Timeout | null = null;
  private respawnTimers: Map<string, NodeJS.Timeout> = new Map();
  private playerSessions: Map<string, string> = new Map();
  private pendingDisconnectTimers: Map<string, NodeJS.Timeout> = new Map();
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
    targetKills: number = 5,
    timeOfDay: 'DAY' | 'NIGHT' = 'DAY',
    broadcast: (roomId: string, message: ServerMessage) => void,
    sendDirect: (clientId: string, message: ServerMessage) => void
  ) {
    this.id = id;
    this.name = name;
    this.maxPlayers = maxPlayers;
    this.targetKills = targetKills;
    this.timeOfDay = timeOfDay;
    this.broadcast = broadcast;
    this.sendDirect = sendDirect;
  }

  public addPlayer(id: string, name: string, shipClass: ShipClass, sessionToken?: string): boolean {
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
      kills: 0,
      deaths: 0,
      sessionToken,
    });

    if (sessionToken) {
      this.playerSessions.set(sessionToken, id);
    }

    this.broadcastRoomState();
    return true;
  }

  public addBot(): boolean {
    if (this.players.size >= this.maxPlayers || this.status !== 'LOBBY') {
      return false;
    }

    const botNumber = this.players.size + 1;
    const nameIndex = this.players.size % GameRoom.BOT_NAMES.length;
    const name = GameRoom.BOT_NAMES[nameIndex] || `Corsair Bot #${botNumber}`;
    const botId = 'bot-' + Math.random().toString(36).substring(2, 8);

    this.players.set(botId, {
      id: botId,
      name,
      shipClass: 'brig', // Always brig as requested
      isReady: true,
      isHost: false,
      score: 0,
      kills: 0,
      deaths: 0,
      isBot: true,
    });

    this.broadcastRoomState();
    return true;
  }

  public removeBot(botId?: string): boolean {
    if (this.status !== 'LOBBY') return false;

    let targetId = botId;
    if (!targetId) {
      const bots = Array.from(this.players.values()).filter((p) => p.isBot);
      if (bots.length === 0) return false;
      targetId = bots[bots.length - 1].id;
    }

    const player = this.players.get(targetId);
    if (!player || !player.isBot) return false;

    this.removePlayer(targetId);
    return true;
  }

  public addPlayerMidGame(id: string, name: string, shipClass: ShipClass, sessionToken?: string): void {
    const isHost = this.players.size === 0;
    this.players.set(id, {
      id,
      name,
      shipClass,
      isReady: true,
      isHost,
      score: 0,
      kills: 0,
      deaths: 0,
      sessionToken,
    });

    if (sessionToken) {
      this.playerSessions.set(sessionToken, id);
    }

    const config = SERVER_SHIP_CONFIGS[shipClass];
    const existingShips = Array.from(this.ships.values()).map((s) => ({ x: s.x, z: s.z }));
    const spawn = PhysicsEngine.findSafeSpawnPoint(this.players.size, 4, existingShips);

    this.ships.set(id, {
      id,
      name,
      shipClass,
      x: spawn.x,
      y: 0,
      z: spawn.z,
      vx: 0,
      vz: 0,
      speed: 0,
      rotationY: spawn.rotationY,
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

    // Broadcast newly arrived ship to all captains so they see and hear respawn bell
    this.broadcast(this.id, {
      type: 'SHIP_RESPAWNED',
      shipId: id,
      x: spawn.x,
      z: spawn.z,
      rotationY: spawn.rotationY,
      health: config.maxHealth,
    });

    this.broadcastRoomState();
    this.broadcastSnapshot();
  }

  public handlePlayerDisconnect(id: string, isExplicitLeave: boolean = false): void {
    const player = this.players.get(id);
    if (!player) return;

    // If game has not started, or player explicitly clicked leave: remove immediately
    if (this.status !== 'IN_GAME' || isExplicitLeave) {
      this.removePlayer(id);
      return;
    }

    // In active game: provide 25s grace period for client to reconnect
    player.isDisconnected = true;
    const ship = this.ships.get(id);
    if (ship) {
      ship.sail = 'ANCHOR';
      ship.rudder = 0;
    }

    const existingTimer = this.pendingDisconnectTimers.get(id);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      this.pendingDisconnectTimers.delete(id);
      if (this.players.has(id)) {
        this.removePlayer(id);
      }
    }, 25000);

    this.pendingDisconnectTimers.set(id, timer);
    this.broadcastRoomState();
  }

  public reconnectPlayer(newClientId: string, sessionToken: string): boolean {
    let targetOldId: string | undefined = this.playerSessions.get(sessionToken);
    if (!targetOldId) {
      for (const [pid, player] of this.players.entries()) {
        if (player.sessionToken === sessionToken) {
          targetOldId = pid;
          break;
        }
      }
    }

    if (!targetOldId || !this.players.has(targetOldId)) {
      return false;
    }

    const pendingTimer = this.pendingDisconnectTimers.get(targetOldId);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      this.pendingDisconnectTimers.delete(targetOldId);
    }

    const player = this.players.get(targetOldId)!;
    player.id = newClientId;
    player.isDisconnected = false;

    this.players.delete(targetOldId);
    this.players.set(newClientId, player);

    const ship = this.ships.get(targetOldId);
    if (ship) {
      ship.id = newClientId;
      this.ships.delete(targetOldId);
      this.ships.set(newClientId, ship);
    }

    for (const ball of this.cannonballs) {
      if (ball.ownerId === targetOldId) {
        ball.ownerId = newClientId;
      }
    }

    const respawnTimer = this.respawnTimers.get(targetOldId);
    if (respawnTimer) {
      this.respawnTimers.delete(targetOldId);
      this.respawnTimers.set(newClientId, respawnTimer);
    }

    this.playerSessions.set(sessionToken, newClientId);

    this.sendDirect(newClientId, {
      type: 'ROOM_STATE',
      room: this.getRoomInfo(),
      selfId: newClientId,
    });

    if (this.status === 'IN_GAME') {
      this.sendDirect(newClientId, {
        type: 'GAME_STARTED',
        startTime: this.startTime,
        windAngle: this.windAngle,
        windSpeed: this.windSpeed,
        timeOfDay: this.timeOfDay,
      });
    }

    this.broadcastRoomState();
    this.broadcastSnapshot();
    return true;
  }

  public removePlayer(id: string): void {
    const pendingTimer = this.pendingDisconnectTimers.get(id);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      this.pendingDisconnectTimers.delete(id);
    }

    const player = this.players.get(id);
    if (player?.sessionToken) {
      this.playerSessions.delete(player.sessionToken);
    }

    const wasHost = player?.isHost ?? false;
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

  private activeVolleyTimers: Set<NodeJS.Timeout> = new Set();

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

    const count = config.cannonsPerSide;
    const span = config.length * 0.65;
    const step = span / (count + 1);

    // Number of rolling cascade waves (AC Black Flag style: guns fire in rapid succession down the hull)
    const numWaves = count <= 3 ? 1 : count <= 6 ? 2 : count <= 10 ? 3 : 4;
    const waveDelayMs = 60; // 60ms ripple between battery discharges

    for (let wave = 0; wave < numWaves; wave++) {
      const startIndex = Math.floor((wave * count) / numWaves) + 1;
      const endIndex = Math.floor(((wave + 1) * count) / numWaves);

      const fireSubVolley = () => {
        if (!this.ships.has(id) || ship.isSunk || this.status !== 'IN_GAME') return;

        const serverTime = (Date.now() - this.startTime) / 1000;
        const muzzleSpeed = 38 + Math.random() * 4;

        for (let i = startIndex; i <= endIndex; i++) {
          const offsetAlongLength = -span * 0.5 + i * step;
          const transform = getBroadsideTransform(ship.x, ship.z, ship.rotationY, side, config.width, offsetAlongLength);

          // Slight random spread
          const spreadX = (Math.random() - 0.5) * 0.06;
          const spreadY = (Math.random() - 0.5) * 0.04;

          const vx = Math.sin(transform.fireAngle + spreadX) * muzzleSpeed;
          const vy = 5.5 + spreadY * 10;
          const vz = Math.cos(transform.fireAngle + spreadX) * muzzleSpeed;

          this.cannonballs.push({
            id: `${ship.id}-${Date.now()}-${wave}-${i}`,
            ownerId: ship.id,
            x: transform.spawnX,
            y: ship.y + 1.8,
            z: transform.spawnZ,
            vx,
            vy,
            vz,
            damage: config.cannonDamage,
            createdAt: serverTime,
            maxLife: 4.5,
          });
        }

        // Broadcast muzzle flash and audio event for each rolling discharge
        this.broadcast(this.id, {
          type: 'CANNON_FIRED',
          ownerId: ship.id,
          side,
          origin: [ship.x, ship.y + 1.8, ship.z],
          count: endIndex - startIndex + 1,
        });
      };

      if (wave === 0) {
        fireSubVolley();
      } else {
        const timer = setTimeout(() => {
          this.activeVolleyTimers.delete(timer);
          fireSubVolley();
        }, wave * waveDelayMs);
        this.activeVolleyTimers.add(timer);
      }
    }
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
    const placedSpawns: Array<{ x: number; z: number }> = [];
    playerArray.forEach((player, idx) => {
      const spawn = PhysicsEngine.findSafeSpawnPoint(idx, playerArray.length, placedSpawns);
      placedSpawns.push({ x: spawn.x, z: spawn.z });
      const config = SERVER_SHIP_CONFIGS[player.shipClass];

      this.ships.set(player.id, {
        id: player.id,
        name: player.name,
        shipClass: player.shipClass,
        x: spawn.x,
        y: 0,
        z: spawn.z,
        vx: 0,
        vz: 0,
        speed: 0,
        rotationY: spawn.rotationY,
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
      timeOfDay: this.timeOfDay,
    };

    // 1. Broadcast to room pub/sub topic
    this.broadcast(this.id, startMsg);

    // 2. Direct message to EVERY player in room (guarantees host/sender receives it without pub/sub echo suppression)
    for (const playerId of this.players.keys()) {
      this.sendDirect(playerId, startMsg);
    }

    return true;
  }

  public step(now: number): void {
    if (this.status !== 'IN_GAME') return;

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

      // Update Bot AI decisions (smart obstacle avoidance, targeting, broadside salvo)
      for (const ship of this.ships.values()) {
        const player = this.players.get(ship.id);
        if (player?.isBot && !ship.isSunk) {
          BotAI.update(ship, this);
        }
      }

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
            hitPos: [Math.round(ball.x * 100) / 100, Math.round(ball.y * 100) / 100, Math.round(ball.z * 100) / 100],
            remainingHp: Math.round(hitShip.health * 10) / 10,
          });

          if (hitShip.health <= 0 && !hitShip.isSunk) {
            hitShip.isSunk = true;
            const killer = this.players.get(ball.ownerId);
            if (killer) {
              killer.kills = (killer.kills || 0) + 1;
              killer.score += 100;
            }
            const victim = this.players.get(hitShip.id);
            if (victim) {
              victim.deaths = (victim.deaths || 0) + 1;
              victim.respawnCountdown = 5;
            }

            this.broadcast(this.id, {
              type: 'SHIP_SUNK',
              shipId: hitShip.id,
              killerId: ball.ownerId,
            });

            // Check if killer has reached the deathmatch victory goal
            if (killer && killer.kills >= this.targetKills) {
              this.status = 'FINISHED';
              this.broadcast(this.id, {
                type: 'GAME_OVER',
                winnerId: killer.id,
                winnerName: killer.name,
              });

              this.broadcastRoomState();

              if (this.autoResetTimer) clearTimeout(this.autoResetTimer);
              this.autoResetTimer = setTimeout(() => {
                if (this.status === 'FINISHED' && this.players.size > 0) {
                  this.resetToLobby();
                }
              }, 12000);
              return;
            }

            // Deathmatch respawn flow: Sunk ship respawns after 5 seconds at a safe perimeter
            this.broadcastRoomState();
            this.scheduleShipRespawn(hitShip.id);
          }
        }
      );
    }

    // Broadcast snapshot whenever simulation stepped forward
    if (simulatedSteps > 0) {
      this.broadcastSnapshot();
    }
  }

  private scheduleShipRespawn(shipId: string): void {
    const existing = this.respawnTimers.get(shipId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.respawnTimers.delete(shipId);
      if (this.status !== 'IN_GAME') return;

      const ship = this.ships.get(shipId);
      const player = this.players.get(shipId);
      if (!ship || !player) return;

      const existingAliveShips = Array.from(this.ships.values())
        .filter((s) => s.id !== shipId && !s.isSunk)
        .map((s) => ({ x: s.x, z: s.z }));

      const spawn = PhysicsEngine.findRandomSafeRespawnPoint(existingAliveShips);
      const config = SERVER_SHIP_CONFIGS[ship.shipClass];

      ship.x = spawn.x;
      ship.y = 0;
      ship.z = spawn.z;
      ship.vx = 0;
      ship.vz = 0;
      ship.speed = 0;
      ship.rotationY = spawn.rotationY;
      ship.pitch = 0;
      ship.roll = 0;
      ship.rudder = 0;
      ship.sail = 'HALF_SAIL';
      ship.health = config.maxHealth;
      ship.isSunk = false;
      ship.reloadTimerPort = 0;
      ship.reloadTimerStarboard = 0;

      player.respawnCountdown = undefined;

      this.broadcast(this.id, {
        type: 'SHIP_RESPAWNED',
        shipId,
        x: spawn.x,
        z: spawn.z,
        rotationY: spawn.rotationY,
        health: config.maxHealth,
      });

      this.broadcastRoomState();
      this.broadcastSnapshot();
    }, 5000);

    this.respawnTimers.set(shipId, timer);
  }

  public broadcastSnapshot(): void {
    const serverTime = Math.round(((Date.now() - this.startTime) / 1000) * 100) / 100;
    const r2 = (n: number) => Math.round(n * 100) / 100;
    const r3 = (n: number) => Math.round(n * 1000) / 1000;

    const shipsPayload = Array.from(this.ships.values()).map(
      ({ reloadTimerPort: _p, reloadTimerStarboard: _s, ...s }) => ({
        ...s,
        x: r2(s.x),
        y: r2(s.y),
        z: r2(s.z),
        vx: r2(s.vx),
        vz: r2(s.vz),
        speed: r2(s.speed),
        rotationY: r3(s.rotationY),
        pitch: r3(s.pitch),
        roll: r3(s.roll),
        rudder: r2(s.rudder),
      })
    );

    const cannonballsPayload = this.cannonballs.map((b) => ({
      id: b.id,
      ownerId: b.ownerId,
      x: r2(b.x),
      y: r2(b.y),
      z: r2(b.z),
      vx: r2(b.vx),
      vy: r2(b.vy),
      vz: r2(b.vz),
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

    const totalPlayers = this.players.size;

    // In Fleet Deathmatch, match only ends prematurely if opponents disconnect mid-game
    const shouldEnd = this.wasMultiplayer && totalPlayers <= 1;

    if (shouldEnd) {
      this.status = 'FINISHED';

      const aliveShips = Array.from(this.ships.values()).filter((s) => !s.isSunk);
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
    this.respawnTimers.forEach((t) => clearTimeout(t));
    this.respawnTimers.clear();
    this.activeVolleyTimers.forEach(t => clearTimeout(t));
    this.activeVolleyTimers.clear();
    this.status = 'LOBBY';
    this.ships.clear();
    this.cannonballs = [];
    // Reset player scores & readiness for next match
    for (const player of this.players.values()) {
      player.isReady = player.isHost;
      player.kills = 0;
      player.deaths = 0;
      player.score = 0;
      player.respawnCountdown = undefined;
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
      targetKills: this.targetKills,
      windAngle: this.windAngle,
      windSpeed: this.windSpeed,
      timeOfDay: this.timeOfDay,
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
    if (this.autoResetTimer) {
      clearTimeout(this.autoResetTimer);
      this.autoResetTimer = null;
    }
    this.respawnTimers.forEach((t) => clearTimeout(t));
    this.respawnTimers.clear();
    this.pendingDisconnectTimers.forEach((t) => clearTimeout(t));
    this.pendingDisconnectTimers.clear();
    this.playerSessions.clear();
    this.activeVolleyTimers.forEach(t => clearTimeout(t));
    this.activeVolleyTimers.clear();
    this.players.clear();
    this.ships.clear();
    this.cannonballs = [];
  }
}

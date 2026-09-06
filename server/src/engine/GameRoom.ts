import { PhysicsEngine } from './PhysicsEngine.js';
import { BotAI } from './BotAI.js';
import { getBroadsideTransform } from './NavalCombatMath.js';
import { CombatSystem } from './CombatSystem.js';
import { GameLoop } from './GameLoop.js';
import {
  type ShipClass,
  type SailState,
  type ShipSimulationState,
  type CannonballSimulationState,
  type RoomInfo,
  type RoomPlayer,
  type ServerMessage,
  type BroadsideFireCommand,
  type GameMode,
  type Team,
  type MapId,
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
  public targetKills: number = 20;
  public gameMode: GameMode = 'FFA';
  public mapId: MapId = 'caribbean';

  public players: Map<string, RoomPlayer> = new Map();
  public ships: Map<string, ShipSimulationState> = new Map();
  public cannonballs: CannonballSimulationState[] = [];

  public windAngle: number = Math.random() * Math.PI * 2;
  public windSpeed: number = 10 + Math.random() * 6; // knots

  public autoResetTimer: NodeJS.Timeout | null = null;
  private respawnTimers: Map<string, NodeJS.Timeout> = new Map();
  private playerSessions: Map<string, string> = new Map();
  private pendingDisconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  public tickSeq: number = 0;
  private startTime: number = 0;
  public lastTickTime: number = 0;
  public tickAccumulator: number = 0;
  public readonly FIXED_DT: number = 1 / 30; // 33.333ms deterministic timestep
  public wasMultiplayer: boolean = false;

  // Broadcast and direct send callbacks
  private broadcast: (roomId: string, message: ServerMessage) => void;
  private sendDirect: (clientId: string, message: ServerMessage) => void;
  private onDestroy?: (roomId: string) => void;

  constructor(
    id: string,
    name: string,
    maxPlayers: number,
    targetKills: number = 20,
    timeOfDay: 'DAY' | 'NIGHT' = 'DAY',
    gameMode: GameMode = 'FFA',
    mapId: MapId = 'caribbean',
    broadcast: (roomId: string, message: ServerMessage) => void,
    sendDirect: (clientId: string, message: ServerMessage) => void,
    onDestroy?: (roomId: string) => void
  ) {
    this.id = id;
    this.name = name;
    this.maxPlayers = maxPlayers;
    this.targetKills = targetKills;
    this.timeOfDay = timeOfDay;
    this.gameMode = gameMode;
    this.mapId = mapId;
    this.broadcast = broadcast;
    this.sendDirect = sendDirect;
    this.onDestroy = onDestroy;
  }

  public setMap(mapId: MapId, requestingClientId: string): boolean {
    const player = this.players.get(requestingClientId);
    if (!player || !player.isHost || this.status !== 'LOBBY') {
      return false;
    }
    this.mapId = mapId;
    this.broadcastRoomState();
    return true;
  }

  public getHumanPlayerCount(): number {
    let count = 0;
    for (const p of this.players.values()) {
      if (!p.isBot) count++;
    }
    return count;
  }

  public hasHumanPlayers(): boolean {
    for (const p of this.players.values()) {
      if (!p.isBot) return true;
    }
    return false;
  }

  private getAutoAssignedTeam(): Team {
    let redCount = 0;
    let blueCount = 0;
    for (const p of this.players.values()) {
      if (p.team === 'red') redCount++;
      else if (p.team === 'blue') blueCount++;
    }
    return redCount <= blueCount ? 'red' : 'blue';
  }

  public switchTeam(clientId: string): boolean {
    if (this.gameMode !== 'TEAM' || this.status !== 'LOBBY') return false;
    const player = this.players.get(clientId);
    if (!player || player.isBot) return false;
    player.team = player.team === 'red' ? 'blue' : 'red';
    this.broadcastRoomState();
    return true;
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
      team: this.gameMode === 'TEAM' ? this.getAutoAssignedTeam() : undefined,
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
      team: this.gameMode === 'TEAM' ? this.getAutoAssignedTeam() : undefined,
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
      team: this.gameMode === 'TEAM' ? this.getAutoAssignedTeam() : undefined,
      sessionToken,
    });

    if (sessionToken) {
      this.playerSessions.set(sessionToken, id);
    }

    const config = SERVER_SHIP_CONFIGS[shipClass];
    const existingShips = Array.from(this.ships.values()).map((s) => ({ x: s.x, z: s.z }));
    const spawn = PhysicsEngine.findSafeSpawnPoint(this.players.size, 4, existingShips, this.mapId);

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
      reloadTimerLeft: 0,
      reloadTimerRight: 0,
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

  public getPlayerIdBySession(sessionToken: string): string | undefined {
    let targetOldId = this.playerSessions.get(sessionToken);
    if (!targetOldId) {
      for (const [pid, player] of this.players.entries()) {
        if (player.sessionToken === sessionToken) {
          targetOldId = pid;
          break;
        }
      }
    }
    return targetOldId;
  }

  public reconnectPlayer(newClientId: string, sessionToken: string): boolean {
    const targetOldId = this.getPlayerIdBySession(sessionToken);

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
        mapId: this.mapId,
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

    // If no human players remain in the room (or only bots left), close and destroy the match session
    if (!this.hasHumanPlayers()) {
      this.destroy();
      return;
    }

    if (wasHost) {
      const nextHost = Array.from(this.players.values()).find((p) => !p.isBot);
      if (nextHost) nextHost.isHost = true;
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

  public activeVolleyTimers: Set<NodeJS.Timeout> = new Set();

  public handleFire(id: string, side: 'left' | 'right'): void {
    CombatSystem.handleFire(this, id, side);
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
      const spawn = PhysicsEngine.findSafeSpawnPoint(idx, playerArray.length, placedSpawns, this.mapId);
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
        reloadTimerLeft: 0,
        reloadTimerRight: 0,
      });
    });

    const startMsg: ServerMessage = {
      type: 'GAME_STARTED',
      startTime: this.startTime,
      windAngle: this.windAngle,
      windSpeed: this.windSpeed,
      timeOfDay: this.timeOfDay,
      mapId: this.mapId,
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
    GameLoop.step(this, now);
  }

  public broadcastToRoom(message: ServerMessage): void {
    this.broadcast(this.id, message);
  }

  public scheduleShipRespawn(shipId: string): void {
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

      const spawn = PhysicsEngine.findRandomSafeRespawnPoint(existingAliveShips, this.mapId);
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
      ship.reloadTimerLeft = 0;
      ship.reloadTimerRight = 0;

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
    const shipsPayload: Array<Omit<ShipSimulationState, 'reloadTimerLeft' | 'reloadTimerRight'>> = [];

    for (const s of this.ships.values()) {
      shipsPayload.push({
        id: s.id,
        name: s.name,
        shipClass: s.shipClass,
        x: Math.round(s.x * 100) / 100,
        y: Math.round(s.y * 100) / 100,
        z: Math.round(s.z * 100) / 100,
        vx: Math.round(s.vx * 100) / 100,
        vz: Math.round(s.vz * 100) / 100,
        speed: Math.round(s.speed * 100) / 100,
        rotationY: Math.round(s.rotationY * 1000) / 1000,
        pitch: Math.round(s.pitch * 1000) / 1000,
        roll: Math.round(s.roll * 1000) / 1000,
        rudder: Math.round(s.rudder * 100) / 100,
        sail: s.sail,
        health: s.health,
        maxHealth: s.maxHealth,
        isSunk: s.isSunk,
        score: s.score,
      });
    }

    const cannonballsPayload: Array<{ id: string; ownerId: string; x: number; y: number; z: number; vx: number; vy: number; vz: number }> = [];
    for (let i = 0; i < this.cannonballs.length; i++) {
      const b = this.cannonballs[i];
      cannonballsPayload.push({
        id: b.id,
        ownerId: b.ownerId,
        x: Math.round(b.x * 100) / 100,
        y: Math.round(b.y * 100) / 100,
        z: Math.round(b.z * 100) / 100,
        vx: Math.round(b.vx * 100) / 100,
        vy: Math.round(b.vy * 100) / 100,
        vz: Math.round(b.vz * 100) / 100,
      });
    }

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
    CombatSystem.checkVictoryCondition(this);
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
      gameMode: this.gameMode,
      windAngle: this.windAngle,
      windSpeed: this.windSpeed,
      timeOfDay: this.timeOfDay,
      mapId: this.mapId,
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
    this.onDestroy?.(this.id);
  }
}

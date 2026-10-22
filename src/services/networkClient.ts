import { useGameStore, findShip } from '@/stores/useGameStore';
import { useToastStore } from '@/stores/useToastStore';
import {
  type ShipClass,
  type SailState,
  type ShipSnapshot,
  type CannonballSnapshot,
  SHIP_PRESETS,
} from '@/types/game';
import type { GameMode, MapId, RoomInfo, TimeOfDay } from '@/types/room';
import { navalAudio } from '@/features/battle/services/navalAudio';
import { sinkingEventQueue } from '@/features/battle/services/sinkingEventQueue';

export type ClientPacket =
  | {
      type: 'CREATE_ROOM';
      roomName: string;
      playerName: string;
      shipClass: ShipClass;
      maxPlayers?: number;
      targetKills?: number;
      timeOfDay?: TimeOfDay | 'RANDOM';
      gameMode?: GameMode;
      mapId?: MapId;
      sessionToken?: string;
    }
  | {
      type: 'JOIN_ROOM';
      roomId: string;
      playerName: string;
      shipClass: ShipClass;
      sessionToken?: string;
    }
  | { type: 'RECONNECT'; roomId: string; sessionToken: string }
  | { type: 'LEAVE_ROOM' }
  | { type: 'SELECT_SHIP'; shipClass: ShipClass }
  | { type: 'SWITCH_TEAM' }
  | { type: 'SET_MAP'; mapId: MapId }
  | { type: 'SET_READY'; ready: boolean }
  | { type: 'START_GAME' }
  | { type: 'ADD_BOT' }
  | { type: 'REMOVE_BOT'; botId?: string }
  | { type: 'GET_ROOMS' }
  | { type: 'INPUT'; seq: number; rudder: number; sail: SailState }
  | { type: 'FIRE_BROADSIDE'; side: 'left' | 'right'; angle: number }
  | { type: 'PING'; clientTime: number };

export type ServerPacket =
  | { type: 'ROOM_LIST'; rooms: RoomInfo[] }
  | { type: 'ROOM_STATE'; room: RoomInfo; selfId?: string }
  | { type: 'ERROR'; message: string }
  | {
      type: 'GAME_STARTED';
      startTime: number;
      windAngle: number;
      windSpeed: number;
      timeOfDay: TimeOfDay;
      mapId: MapId;
    }
  | {
      type: 'WORLD_SNAPSHOT';
      tick?: number;
      serverTime: number;
      ships: ShipSnapshot[];
      cannonballs: CannonballSnapshot[];
    }
  | {
      type: 'CANNON_FIRED';
      ownerId: string;
      side: 'left' | 'right';
      origin: [number, number, number];
      count: number;
    }
  | {
      type: 'HIT_EVENT';
      targetId: string;
      attackerId: string;
      damage: number;
      hitPos: [number, number, number];
      remainingHp?: number;
    }
  | {
      type: 'SHIP_SUNK';
      shipId: string;
      killerId?: string;
    }
  | {
      type: 'SHIP_RESPAWNED';
      shipId: string;
      x?: number;
      z?: number;
      rotationY?: number;
      health?: number;
    }
  | {
      type: 'GAME_OVER';
      winnerId: string;
      winnerName: string;
    }
  | { type: 'PONG'; clientTime: number; serverTime: number };

const CONNECT_TIMEOUT_MS = 6000;
const PING_INTERVAL_MS = 3000;
const ZOMBIE_SOCKET_TIMEOUT_MS = 10500;
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 6000;

class NetworkClient {
  private ws: WebSocket | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private inputSeq: number = 0;
  private hasConnectedOnce: boolean = false;
  private reconnectAttempts: number = 0;
  private lastServerActivityAt: number = 0;
  private lifecycleBound: boolean = false;

  private sessionToken: string = (() => {
    try {
      let t = localStorage.getItem('naval_session_token');
      if (!t) {
        t = 'sess-' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        localStorage.setItem('naval_session_token', t);
      }
      return t;
    } catch {
      return 'sess-' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    }
  })();

  private saveActiveRoom(roomId: string): void {
    try {
      localStorage.setItem('naval_active_room_id', roomId);
    } catch {
      // Ignore storage errors
    }
  }

  private clearActiveRoom(): void {
    try {
      localStorage.removeItem('naval_active_room_id');
    } catch {
      // Ignore storage errors
    }
  }

  constructor() {
    this.bindBrowserLifecycleEvents();
  }

  /**
   * Binds browser online/offline and tab visibility recovery handlers once.
   * Ensures instant recovery when Wi-Fi/cellular reconnects or mobile tab resumes.
   */
  private bindBrowserLifecycleEvents(): void {
    if (this.lifecycleBound || typeof window === 'undefined') return;
    this.lifecycleBound = true;

    window.addEventListener('online', () => {
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
        this.connect();
      } else if (this.ws.readyState === WebSocket.OPEN) {
        this.lastServerActivityAt = performance.now();
        this.send({ type: 'PING', clientTime: performance.now() });
      }
    });

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) return;
        this.lastServerActivityAt = performance.now();
        if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
          this.reconnectAttempts = 0;
          this.clearReconnectTimer();
          this.connect();
        } else if (this.ws.readyState === WebSocket.OPEN) {
          this.send({ type: 'PING', clientTime: performance.now() });
        }
      });
    }
  }

  public getWsUrl(): string {
    const customUrl = useGameStore.getState().serverUrl;
    if (customUrl && customUrl.trim()) {
      return customUrl.trim();
    }

    const envUrl = import.meta.env.VITE_WS_URL;
    if (envUrl && envUrl.trim()) {
      return envUrl.trim();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // In local Vite dev, proxy /ws to ws://localhost:3000/ws
    return `${protocol}//${window.location.host}/ws`;
  }

  private clearConnectTimeout(): void {
    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer);
      this.connectTimeoutTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  public reconnect(): void {
    this.clearReconnectTimer();
    this.clearConnectTimeout();
    this.reconnectAttempts = 0;
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
    useGameStore.getState().setIsConnected(false);
    this.stopPing();
    this.connect();
  }

  public reconnectWithUrl(newUrl: string): void {
    useGameStore.getState().setServerUrl(newUrl);
    this.reconnect();
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.clearReconnectTimer();
    this.clearConnectTimeout();

    const wsUrl = this.getWsUrl();

    try {
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      // Guard against stalled TCP/TLS handshakes on blackholed mobile/Wi-Fi connections
      this.connectTimeoutTimer = setTimeout(() => {
        this.connectTimeoutTimer = null;
        if (this.ws === socket && socket.readyState === WebSocket.CONNECTING) {
          socket.onclose = null;
          socket.onerror = null;
          try {
            socket.close();
          } catch {
            // Ignore close errors
          }
          this.ws = null;
          useGameStore.getState().setIsConnected(false);
          this.scheduleReconnect();
        }
      }, CONNECT_TIMEOUT_MS);

      socket.onopen = () => {
        if (this.ws !== socket) return;
        this.clearConnectTimeout();
        this.reconnectAttempts = 0;
        this.lastServerActivityAt = performance.now();

        useGameStore.getState().setIsConnected(true);
        this.startPing();
        const store = useGameStore.getState();

        let savedRoomId: string | null = null;
        try {
          savedRoomId = localStorage.getItem('naval_active_room_id');
        } catch {
          // Ignore storage errors
        }

        const targetRoomId = store.currentRoom?.id || savedRoomId;

        if (targetRoomId) {
          // Reconnect to active room session (covers tab close / page refresh / network drop)
          this.send({
            type: 'RECONNECT',
            roomId: targetRoomId,
            sessionToken: this.sessionToken,
          });
        } else {
          this.send({ type: 'GET_ROOMS' });
        }
        this.hasConnectedOnce = true;
      };

      socket.onmessage = (event) => {
        if (this.ws !== socket) return;
        this.lastServerActivityAt = performance.now();
        try {
          const msg = JSON.parse(String(event.data)) as ServerPacket;
          this.handleServerMessage(msg);
        } catch (e) {
          console.error('Failed to parse server message:', e);
        }
      };

      socket.onclose = () => {
        if (this.ws !== socket) return;
        this.clearConnectTimeout();
        this.ws = null;
        useGameStore.getState().setIsConnected(false);
        this.stopPing();
        if (this.hasConnectedOnce && this.reconnectAttempts === 0) {
          useToastStore
            .getState()
            .warning('Admiralty connection severed. Attempting reconnection to fleet...', 'Connection Severed');
        }
        this.scheduleReconnect();
      };

      socket.onerror = () => {
        // Browser will follow onerror with onclose; avoid noisy console errors on transient drops
      };
    } catch (e) {
      console.error('Failed to initiate WebSocket connection:', e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const expDelay = BASE_RECONNECT_DELAY_MS * Math.pow(1.55, Math.min(5, this.reconnectAttempts));
    const jitter = Math.random() * 300;
    const delay = Math.min(MAX_RECONNECT_DELAY_MS, Math.round(expDelay + jitter));
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private startPing(): void {
    this.stopPing();
    this.lastServerActivityAt = performance.now();
    this.pingInterval = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      const now = performance.now();
      // Zombie socket watchdog: if tab is active and server hasn't sent any packet in 10.5s, reconnect immediately
      if (
        (typeof document === 'undefined' || !document.hidden) &&
        now - this.lastServerActivityAt > ZOMBIE_SOCKET_TIMEOUT_MS
      ) {
        this.reconnect();
        return;
      }

      this.send({ type: 'PING', clientTime: now });
    }, PING_INTERVAL_MS);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private handleServerMessage(msg: ServerPacket): void {
    const store = useGameStore.getState();

    switch (msg.type) {
      case 'ROOM_LIST': {
        store.setAvailableRooms(msg.rooms);
        break;
      }
      case 'ROOM_STATE': {
        const room = msg.room;
        const currentSelfId = store.selfId;
        const targetSelfId = msg.selfId || currentSelfId;
        const isInRoom = room?.players?.some((p) => p.id === targetSelfId);

        // If client is not listed in this room and no direct selfId was provided, ignore stray room broadcast
        if (!isInRoom && !msg.selfId) {
          break;
        }

        if (room?.id) {
          this.saveActiveRoom(room.id);
        }
        if (room?.timeOfDay) {
          store.setTimeOfDay(room.timeOfDay);
        }
        if (room?.mapId) {
          store.setMapId(room.mapId);
        }
        if (room?.status === 'LOBBY' && (store.stage === 'DEBRIEF' || store.stage === 'BATTLE')) {
          store.setStage('LOBBY');
        }
        store.setCurrentRoom(room, msg.selfId || undefined);
        break;
      }
      case 'GAME_STARTED': {
        const wasAlreadyInBattle = store.stage === 'BATTLE';
        if (!wasAlreadyInBattle) {
          navalAudio.playShipBell();
          store.addCombatLog('The battle has begun! All hands to battle stations!', 'info');
        }
        store.setStage('BATTLE');
        if (msg.timeOfDay === 'DAY' || msg.timeOfDay === 'NIGHT') {
          store.setTimeOfDay(msg.timeOfDay);
        }
        if (msg.mapId) {
          store.setMapId(msg.mapId);
        }
        if (typeof msg.windAngle === 'number' && typeof msg.windSpeed === 'number') {
          store.setWind(msg.windAngle, msg.windSpeed);
        }
        // Re-synchronize local helm/sail state immediately upon battle start or mid-battle reconnect
        this.sendInput(-store.localRudder, store.localSail);
        break;
      }
      case 'WORLD_SNAPSHOT': {
        // Out-of-order snapshot protection (allow reset when serverTime restarts near 0 for new match)
        if (
          msg.serverTime < store.serverTime &&
          store.serverTime - msg.serverTime < 1.5
        ) {
          break;
        }
        store.updateWorldSnapshot(msg.serverTime, msg.ships, msg.cannonballs);
        break;
      }
      case 'CANNON_FIRED': {
        // Only trigger audio & muzzle burst if fired by ANOTHER ship!
        if (msg.ownerId !== store.selfId) {
          const firingShip = findShip(store.ships, msg.ownerId);
          const selfShip = findShip(store.ships, store.selfId);
          let distSq = 0;
          if (selfShip && firingShip) {
            const dx = selfShip.x - firingShip.x;
            const dz = selfShip.z - firingShip.z;
            distSq = dx * dx + dz * dz;
          }

          // Audio culling: distant bot firefights (> 180m) are inaudible and skip WebAudio graph creation
          if (!selfShip || distSq <= 32400) {
            navalAudio.playCannonFire({
              worldPos: firingShip ? { x: firingShip.x, z: firingShip.z } : undefined,
            });
          }

          // Particle burst culling: skip particle simulation for far off-screen bots (> 280m)
          if (msg.ownerId && (!selfShip || distSq <= 78400)) {
            store.triggerFireEvent(msg.ownerId, msg.side || 'left');
          }
        }
        break;
      }
      case 'HIT_EVENT': {
        const targetId = msg.targetId;
        const remainingHp = typeof msg.remainingHp === 'number' ? msg.remainingHp : undefined;
        const isSelfTarget = targetId === store.selfId;

        if (remainingHp !== undefined) {
          const freshStore = useGameStore.getState();
          const hitShip = findShip(freshStore.ships, targetId);
          if (hitShip && hitShip.health !== remainingHp) {
            freshStore.updateWorldSnapshot(
              freshStore.serverTime,
              freshStore.ships.map((s) => (s.id === targetId ? { ...s, health: remainingHp } : s)),
              freshStore.cannonballs
            );
          }
        }

        const targetShip = findShip(store.ships, targetId);
        const selfShip = findShip(store.ships, store.selfId);
        let distSq = 0;
        if (selfShip && targetShip) {
          const dx = selfShip.x - targetShip.x;
          const dz = selfShip.z - targetShip.z;
          distSq = dx * dx + dz * dz;
        }

        // Distance cull impact audio if distant bot-on-bot hit (> 160m)
        if (isSelfTarget || !selfShip || distSq <= 25600) {
          navalAudio.playHullImpact({
            isSelf: isSelfTarget,
            worldPos: targetShip ? { x: targetShip.x, z: targetShip.z } : undefined,
          });
        }

        if (isSelfTarget) {
          store.triggerCameraShake(0.85, 'hit');
        }
        break;
      }
      case 'SHIP_SUNK': {
        const shipId = msg.shipId;
        const sunkShip = findShip(store.ships, shipId);
        const name = sunkShip?.name || 'Vessel';
        navalAudio.playShipSunk({
          isSelf: shipId === store.selfId,
          worldPos: sunkShip ? { x: sunkShip.x, z: sunkShip.z } : undefined,
        });

        if (sunkShip) {
          const cfg = SHIP_PRESETS[sunkShip.shipClass] || SHIP_PRESETS.brig;
          sinkingEventQueue.push({
            shipId,
            x: sunkShip.x,
            y: sunkShip.y,
            z: sunkShip.z,
            rotationY: sunkShip.rotationY,
            shipLength: cfg.length,
            shipWidth: cfg.width,
            isSelf: shipId === store.selfId,
            timestamp: performance.now(),
          });
        }

        store.addCombatLog(
          msg.killerId === 'environment:storm'
            ? `${name} was lost to the storm.`
            : `💥 ${name} was shattered and sent to Davy Jones' locker!`,
          'sink'
        );

        // Immediately mark the ship as sunk and zero health in store snapshot
        const { ships, serverTime, cannonballs } = store;
        const updatedShips = ships.map((s) =>
          s.id === shipId ? { ...s, health: 0, isSunk: true } : s
        );
        store.updateWorldSnapshot(serverTime, updatedShips, cannonballs);
        break;
      }
      case 'SHIP_RESPAWNED': {
        navalAudio.playShipBell();
        const shipId = msg.shipId;
        const player = store.currentRoom?.players.find((p) => p.id === shipId);
        const name = player?.name || 'Vessel';
        const shipClass = player?.shipClass || 'brig';
        const maxHp = msg.health || SHIP_PRESETS[shipClass]?.maxHealth || 180;

        // Immediately revive the ship in store snapshot with full health
        const { ships, serverTime, cannonballs } = store;
        const updatedShips = ships.map((s) =>
          s.id === shipId
            ? {
                ...s,
                health: maxHp,
                isSunk: false,
                x: typeof msg.x === 'number' ? msg.x : s.x,
                z: typeof msg.z === 'number' ? msg.z : s.z,
                rotationY: typeof msg.rotationY === 'number' ? msg.rotationY : s.rotationY,
              }
            : s
        );
        store.updateWorldSnapshot(serverTime, updatedShips, cannonballs);

        if (shipId === store.selfId) {
          store.setLocalSail('HALF_SAIL');
          store.setLocalRudder(0);
          store.addCombatLog(`⚓ Your warship has refitted and returned to the line of battle!`, 'info');
        } else {
          store.addCombatLog(`⚓ Captain ${name} has refitted and returned to the line of battle!`, 'info');
        }
        break;
      }
      case 'GAME_OVER': {
        navalAudio.playShipBell();
        store.setWinner(msg.winnerName || 'Victor');
        break;
      }
      case 'PONG': {
        const now = performance.now();
        const sampleLatency = Math.max(1, Math.round((now - msg.clientTime) * 0.5));
        const currentPing = store.ping;
        // Exponential moving average filter (70% weight on smoothed history, 30% on new sample)
        const smoothedLatency =
          currentPing > 0 ? Math.round(currentPing * 0.7 + sampleLatency * 0.3) : sampleLatency;
        store.setPing(smoothedLatency);
        break;
      }
      case 'ERROR': {
        const errorText = msg.message || 'Unknown server error';
        const isSessionInvalid =
          !store.currentRoom ||
          /sailed|closed|expired|not found|crewed/i.test(errorText);

        if (isSessionInvalid) {
          this.clearActiveRoom();
          if (store.stage !== 'LOBBY') {
            store.resetToLobby();
          }
          this.send({ type: 'GET_ROOMS' });
        }
        useToastStore.getState().error(errorText, 'Armada Alert');
        break;
      }
    }
  }

  public send(payload: ClientPacket): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
      } catch {
        // Socket buffer closed mid-write
      }
    }
  }

  public refreshRooms(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      useToastStore.getState().warning('Signaling Admiralty fleet server...', 'Reconnecting');
      this.connect();
      return;
    }
    this.send({ type: 'GET_ROOMS' });
  }

  public createRoom(
    roomName: string,
    maxPlayers: number = 16,
    timeOfDay: 'DAY' | 'NIGHT' | 'RANDOM' = 'DAY',
    targetKills: number = 20,
    gameMode: GameMode = 'FFA',
    mapId: MapId = 'caribbean'
  ): void {
    const store = useGameStore.getState();

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      useToastStore.getState().error('Cannot found fleet: Not connected to Admiralty server!', 'Connection Severed');
      return;
    }

    if (!roomName.trim()) {
      useToastStore.getState().warning('Fleet Anchorage designation cannot be empty!', 'Input Required');
      return;
    }

    this.send({
      type: 'CREATE_ROOM',
      roomName: roomName.trim(),
      playerName: store.playerName,
      shipClass: store.selectedShip,
      maxPlayers,
      targetKills,
      timeOfDay,
      gameMode,
      mapId,
      sessionToken: this.sessionToken,
    });
  }

  public setMap(mapId: MapId): void {
    this.send({ type: 'SET_MAP', mapId });
  }

  public switchTeam(): void {
    this.send({ type: 'SWITCH_TEAM' });
  }

  public joinRoom(roomId: string): void {
    const store = useGameStore.getState();

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      useToastStore.getState().error('Cannot sign articles: Not connected to Admiralty server!', 'Connection Severed');
      return;
    }

    const targetRoom = store.availableRooms.find((r) => r.id === roomId);
    if (targetRoom && targetRoom.players.length >= targetRoom.maxPlayers) {
      useToastStore.getState().warning(
        `Fleet "${targetRoom.name}" has reached full complement (${targetRoom.players.length}/${targetRoom.maxPlayers} Captains)! Please select another anchorage.`,
        'Fleet Full'
      );
      return;
    }

    this.saveActiveRoom(roomId);
    this.send({
      type: 'JOIN_ROOM',
      roomId,
      playerName: store.playerName,
      shipClass: store.selectedShip,
      sessionToken: this.sessionToken,
    });
  }

  public leaveRoom(): void {
    this.clearActiveRoom();
    this.send({ type: 'LEAVE_ROOM' });
    useGameStore.getState().resetToLobby();
    this.send({ type: 'GET_ROOMS' });
  }

  public setReady(ready: boolean): void {
    this.send({ type: 'SET_READY', ready });
  }

  public selectShip(shipClass: ShipClass): void {
    useGameStore.getState().setSelectedShip(shipClass);
    this.send({ type: 'SELECT_SHIP', shipClass });
  }

  public startGame(): void {
    this.send({ type: 'START_GAME' });
  }

  public addBot(): void {
    this.send({ type: 'ADD_BOT' });
  }

  public removeBot(botId?: string): void {
    this.send({ type: 'REMOVE_BOT', botId });
  }

  public sendInput(rudder: number, sail: SailState): void {
    this.inputSeq++;
    this.send({
      type: 'INPUT',
      seq: this.inputSeq,
      rudder,
      sail,
    });
  }

  public fireBroadside(side: 'left' | 'right'): void {
    const store = useGameStore.getState();
    const config = SHIP_PRESETS[store.selectedShip];

    // Check local cooldown
    const progress = side === 'left' ? store.leftReloadProgress : store.rightReloadProgress;
    if (progress < 1.0) return;

    // Trigger local cooldown UI animation immediately
    store.triggerFireCooldown(side, config.reloadTime);

    this.send({
      type: 'FIRE_BROADSIDE',
      side,
      angle: 0,
    });
  }
}

export const networkClient = new NetworkClient();

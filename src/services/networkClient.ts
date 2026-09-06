import { useGameStore } from '@/stores/useGameStore';
import { useToastStore } from '@/stores/useToastStore';
import { type ShipClass, type SailState, SHIP_PRESETS } from '@/types/game';
import type { GameMode, MapId } from '@/types/room';
import { navalAudio } from '@/features/battle/services/navalAudio';

class NetworkClient {
  private ws: WebSocket | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private inputSeq: number = 0;
  private hasConnectedOnce: boolean = false;

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
    // Session token persisted across reloads and reconnects
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

  public reconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    useGameStore.getState().setIsConnected(false);
    this.stopPing();
    this.connect();
  }

  public reconnectWithUrl(newUrl: string): void {
    useGameStore.getState().setServerUrl(newUrl);
    if (this.ws) {
      this.ws.onclose = null; // prevent auto reconnect loop during manual switch
      this.ws.close();
      this.ws = null;
    }
    useGameStore.getState().setIsConnected(false);
    this.stopPing();
    this.connect();
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = this.getWsUrl();

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
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

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch (e) {
          console.error('Failed to parse server message:', e);
        }
      };

      this.ws.onclose = () => {
        useGameStore.getState().setIsConnected(false);
        this.stopPing();
        if (this.hasConnectedOnce) {
          useToastStore.getState().warning('Admiralty connection severed. Attempting reconnection to fleet...', 'Connection Severed');
        }
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket error:', err);
      };
    } catch (e) {
      console.error('Failed to initiate WebSocket connection:', e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2500);
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'PING', clientTime: performance.now() });
      }
    }, 3000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private handleServerMessage(msg: Record<string, unknown>): void {
    const store = useGameStore.getState();

    switch (msg.type) {
      case 'ROOM_LIST': {
        store.setAvailableRooms(msg.rooms as never);
        break;
      }
      case 'ROOM_STATE': {
        const room = msg.room as { id?: string; timeOfDay?: 'DAY' | 'NIGHT'; status?: string; mapId?: MapId; players?: Array<{ id: string }> } | undefined;
        const currentSelfId = store.selfId;
        const targetSelfId = (msg.selfId as string) || currentSelfId;
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
        store.setCurrentRoom(msg.room as never, (msg.selfId as string) || undefined);
        break;
      }
      case 'GAME_STARTED': {
        navalAudio.playShipBell();
        store.setStage('BATTLE');
        if (msg.timeOfDay === 'DAY' || msg.timeOfDay === 'NIGHT') {
          store.setTimeOfDay(msg.timeOfDay);
        }
        if (msg.mapId) {
          store.setMapId(msg.mapId as MapId);
        }
        if (typeof msg.windAngle === 'number' && typeof msg.windSpeed === 'number') {
          store.setWind(msg.windAngle, msg.windSpeed);
        }
        store.addCombatLog('The battle has begun! All hands to battle stations!', 'info');
        break;
      }
      case 'WORLD_SNAPSHOT': {
        store.updateWorldSnapshot(
          msg.serverTime as number,
          msg.ships as never,
          msg.cannonballs as never
        );
        break;
      }
      case 'CANNON_FIRED': {
        // Only trigger audio & muzzle burst if fired by ANOTHER ship!
        if (msg.ownerId !== store.selfId) {
          const firingShip = store.ships.find((s) => s.id === msg.ownerId);
          const selfShip = store.ships.find((s) => s.id === store.selfId);
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
            store.triggerFireEvent(msg.ownerId as string, (msg.side as 'left' | 'right') || 'left');
          }
        }
        break;
      }
      case 'HIT_EVENT': {
        const targetId = msg.targetId as string;
        const remainingHp = typeof msg.remainingHp === 'number' ? msg.remainingHp : undefined;
        const isSelfTarget = targetId === store.selfId;

        if (remainingHp !== undefined) {
          const freshStore = useGameStore.getState();
          if (isSelfTarget) {
            // For local player: immediately update store snapshot so HUD re-renders in real-time
            freshStore.updateWorldSnapshot(
              freshStore.serverTime,
              freshStore.ships.map((s) => (s.id === targetId ? { ...s, health: remainingHp } : s)),
              freshStore.cannonballs
            );
          } else {
            // For bot-on-bot hits: update health directly in-place without thrashing Zustand subscribers
            const hitShip = freshStore.ships.find((s) => s.id === targetId);
            if (hitShip) {
              hitShip.health = remainingHp;
            }
          }
        }

        const targetShip = store.ships.find((s) => s.id === msg.targetId);
        const selfShip = store.ships.find((s) => s.id === store.selfId);
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
        const shipId = msg.shipId as string;
        const sunkShip = store.ships.find((s) => s.id === shipId);
        const name = sunkShip?.name || 'Vessel';
        navalAudio.playShipSunk({
          isSelf: shipId === store.selfId,
          worldPos: sunkShip ? { x: sunkShip.x, z: sunkShip.z } : undefined,
        });
        store.addCombatLog(`💥 ${name} was shattered and sent to Davy Jones' locker!`, 'sink');

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
        const shipId = msg.shipId as string;
        const player = store.currentRoom?.players.find((p) => p.id === shipId);
        const name = player?.name || 'Vessel';
        const shipClass = (player?.shipClass as ShipClass) || 'brig';
        const maxHp = (msg.health as number) || SHIP_PRESETS[shipClass]?.maxHealth || 180;

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
        store.setWinner((msg.winnerName as string) || 'Victor');
        break;
      }
      case 'PONG': {
        const now = performance.now();
        const latency = Math.max(1, Math.round((now - (msg.clientTime as number)) * 0.5));
        store.setPing(latency);
        break;
      }
      case 'ERROR': {
        this.clearActiveRoom();
        useToastStore.getState().error(msg.message as string, 'Armada Alert');
        this.send({ type: 'GET_ROOMS' });
        break;
      }
    }
  }

  public send(payload: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  public refreshRooms(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      useToastStore.getState().warning('Signaling Admiralty fleet server...', 'Reconnecting');
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

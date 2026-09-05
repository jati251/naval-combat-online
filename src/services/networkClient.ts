import { useGameStore } from '@/stores/useGameStore';
import { useToastStore } from '@/stores/useToastStore';
import { type ShipClass, type SailState, SHIP_PRESETS } from '@/types/game';
import { navalAudio } from '@/features/battle/services/navalAudio';

class NetworkClient {
  private ws: WebSocket | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private inputSeq: number = 0;
  private hasConnectedOnce: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          try {
            this.ws.send(JSON.stringify({ type: 'LEAVE_ROOM' }));
          } catch {
            // Ignore during page unload
          }
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
        if (this.hasConnectedOnce) {
          useToastStore.getState().success('Koneksi ke armada server berhasil dipulihkan.', 'Server Connected');
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
          useToastStore.getState().warning('Koneksi server terputus. Mencoba menghubungkan kembali...', 'Koneksi Terputus');
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
        const room = msg.room as { timeOfDay?: 'DAY' | 'NIGHT' } | undefined;
        if (room?.timeOfDay) {
          store.setTimeOfDay(room.timeOfDay);
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
        navalAudio.playCannonShot();
        const ship = store.ships.find((s) => s.id === msg.ownerId);
        const name = ship?.name || 'A ship';
        store.addCombatLog(`${name} unleashed a broadside volley!`, 'info');
        if (msg.ownerId) {
          store.triggerFireEvent(msg.ownerId as string, (msg.side as 'port' | 'starboard') || 'port');
        }
        break;
      }
      case 'HIT_EVENT': {
        navalAudio.playHullImpact();
        const target = store.ships.find((s) => s.id === msg.targetId);
        const name = target?.name || 'A vessel';
        store.addCombatLog(`${name} took ${msg.damage} broadside damage!`, 'damage');
        if (msg.targetId === store.selfId) {
          store.triggerCameraShake(0.85, 'hit');
        }
        break;
      }
      case 'SHIP_SUNK': {
        const sunkShip = store.ships.find((s) => s.id === msg.shipId);
        const name = sunkShip?.name || 'Vessel';
        store.addCombatLog(`💥 ${name} was shattered and sent to Davy Jones' locker!`, 'sink');
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
        useToastStore.getState().error(msg.message as string, 'Armada Alert');
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
      useToastStore.getState().warning('Menghubungkan ke server armada...', 'Server Reconnecting');
    }
    this.send({ type: 'GET_ROOMS' });
  }

  public createRoom(
    roomName: string,
    maxPlayers: number = 4,
    timeOfDay: 'DAY' | 'NIGHT' | 'RANDOM' = 'DAY'
  ): void {
    const store = useGameStore.getState();

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      useToastStore.getState().error('Tidak dapat membuat fleet: Anda belum terhubung ke server!', 'Koneksi Terputus');
      return;
    }

    if (!roomName.trim()) {
      useToastStore.getState().warning('Nama armada pertempuran tidak boleh kosong!', 'Input Diperlukan');
      return;
    }

    this.send({
      type: 'CREATE_ROOM',
      roomName: roomName.trim(),
      playerName: store.playerName,
      shipClass: store.selectedShip,
      maxPlayers,
      timeOfDay,
    });
  }

  public joinRoom(roomId: string): void {
    const store = useGameStore.getState();

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      useToastStore.getState().error('Tidak dapat bergabung: Anda belum terhubung ke server!', 'Koneksi Terputus');
      return;
    }

    const targetRoom = store.availableRooms.find((r) => r.id === roomId);
    if (targetRoom && targetRoom.players.length >= targetRoom.maxPlayers) {
      useToastStore.getState().warning(
        `Room "${targetRoom.name}" sudah penuh (${targetRoom.players.length}/${targetRoom.maxPlayers} Captains)! Silakan pilih atau buat room lain.`,
        'Fleet Penuh'
      );
      return;
    }

    this.send({
      type: 'JOIN_ROOM',
      roomId,
      playerName: store.playerName,
      shipClass: store.selectedShip,
    });
  }

  public leaveRoom(): void {
    this.send({ type: 'LEAVE_ROOM' });
    useGameStore.getState().resetToLobby();
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

  public sendInput(rudder: number, sail: SailState): void {
    this.inputSeq++;
    this.send({
      type: 'INPUT',
      seq: this.inputSeq,
      rudder,
      sail,
    });
  }

  public fireBroadside(side: 'port' | 'starboard'): void {
    const store = useGameStore.getState();
    const config = SHIP_PRESETS[store.selectedShip];

    // Check local cooldown
    const progress = side === 'port' ? store.portReloadProgress : store.starboardReloadProgress;
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

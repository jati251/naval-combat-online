import { GameRoom } from '../engine/GameRoom.js';
import { SecurityGuard } from '../security/SecurityGuard.js';
import {
  type ClientMessage,
  type ServerMessage,
  type RoomInfo,
} from '../types/protocol.js';

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();
  private clientRoomMap: Map<string, string> = new Map();
  private masterTickInterval: NodeJS.Timeout | null = null;

  private broadcastToTopic: (topic: string, message: ServerMessage) => void;
  private sendDirect: (clientId: string, message: ServerMessage) => void;

  constructor(
    broadcastToTopic: (topic: string, message: ServerMessage) => void,
    sendDirect: (clientId: string, message: ServerMessage) => void
  ) {
    this.broadcastToTopic = broadcastToTopic;
    this.sendDirect = sendDirect;
    this.startMasterTick();
  }

  private startMasterTick(): void {
    if (this.masterTickInterval) return;
    this.masterTickInterval = setInterval(() => {
      const now = Date.now();
      for (const room of this.rooms.values()) {
        if (room.status === 'IN_GAME') {
          room.step(now);
        }
      }
    }, 1000 / 30);
  }

  public getStats(): { totalRooms: number; inGameRooms: number; totalPlayers: number; inGamePlayers: number } {
    let totalPlayers = 0;
    let inGamePlayers = 0;
    let inGameRooms = 0;
    for (const r of this.rooms.values()) {
      totalPlayers += r.players.size;
      if (r.status === 'IN_GAME') {
        inGameRooms++;
        inGamePlayers += r.players.size;
      }
    }
    return {
      totalRooms: this.rooms.size,
      inGameRooms,
      totalPlayers,
      inGamePlayers,
    };
  }

  public getRoomList(): RoomInfo[] {
    return Array.from(this.rooms.values()).map((r) => r.getRoomInfo());
  }

  public handleClientMessage(clientId: string, msg: ClientMessage): { joinedRoomId?: string } | void {
    switch (msg.type) {
      case 'CREATE_ROOM': {
        if (this.rooms.size >= SecurityGuard.MAX_GLOBAL_ROOMS) {
          this.sendDirect(clientId, {
            type: 'ERROR',
            message: 'Kapasitas armada server telah penuh. Silakan bergabung ke pertempuran yang ada!',
          });
          return;
        }

        const canCreate = SecurityGuard.canCreateRoom(clientId);
        if (!canCreate.allowed) {
          this.sendDirect(clientId, {
            type: 'ERROR',
            message: canCreate.reason || 'Please wait a few moments before commissioning a new fleet!',
          });
          return;
        }

        let resolvedTimeOfDay: 'DAY' | 'NIGHT' = 'DAY';
        if (msg.timeOfDay === 'NIGHT') {
          resolvedTimeOfDay = 'NIGHT';
        } else if (msg.timeOfDay === 'RANDOM') {
          resolvedTimeOfDay = Math.random() < 0.5 ? 'DAY' : 'NIGHT';
        }

        const roomId = 'room-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const room = new GameRoom(
          roomId,
          msg.roomName || `Fleet Arena #${roomId.substring(5)}`,
          msg.maxPlayers || 4,
          msg.targetKills || 5,
          resolvedTimeOfDay,
          (topic, payload) => this.broadcastToTopic(topic, payload),
          (cid, payload) => this.sendDirect(cid, payload)
        );

        this.rooms.set(roomId, room);
        this.clientRoomMap.set(clientId, roomId);
        room.addPlayer(clientId, msg.playerName, msg.shipClass);

        this.sendDirect(clientId, {
          type: 'ROOM_STATE',
          room: room.getRoomInfo(),
          selfId: clientId,
        });
        this.broadcastLobbyUpdate();
        return { joinedRoomId: roomId };
      }

      case 'JOIN_ROOM': {
        const room = this.rooms.get(msg.roomId);
        if (!room) {
          this.sendDirect(clientId, { type: 'ERROR', message: 'Fleet anchorage not found!' });
          return;
        }

        if (room.players.size >= room.maxPlayers) {
          this.sendDirect(clientId, { type: 'ERROR', message: 'Fleet anchorage is already fully crewed!' });
          return;
        }

        if (room.status === 'FINISHED') {
          // Reset room to lobby so captains can join for next battle
          room.resetToLobby();
        }

        this.clientRoomMap.set(clientId, msg.roomId);

        if (room.status === 'IN_GAME') {
          // Mid-game join directly into battle!
          room.addPlayerMidGame(clientId, msg.playerName, msg.shipClass);

          this.sendDirect(clientId, {
            type: 'ROOM_STATE',
            room: room.getRoomInfo(),
            selfId: clientId,
          });

          this.sendDirect(clientId, {
            type: 'GAME_STARTED',
            startTime: room.getStartTime(),
            windAngle: room.windAngle,
            windSpeed: room.windSpeed,
            timeOfDay: room.timeOfDay,
          });
        } else {
          // Normal lobby join
          room.addPlayer(clientId, msg.playerName, msg.shipClass);

          this.sendDirect(clientId, {
            type: 'ROOM_STATE',
            room: room.getRoomInfo(),
            selfId: clientId,
          });
        }

        this.broadcastLobbyUpdate();
        return { joinedRoomId: msg.roomId };
      }

      case 'GET_ROOMS': {
        this.sendDirect(clientId, {
          type: 'ROOM_LIST',
          rooms: this.getRoomList(),
        });
        break;
      }

      case 'LEAVE_ROOM': {
        this.handleClientDisconnect(clientId);
        break;
      }

      case 'SET_READY': {
        const roomId = this.clientRoomMap.get(clientId);
        if (!roomId) return;
        const room = this.rooms.get(roomId);
        if (room) room.setPlayerReady(clientId, msg.ready);
        break;
      }

      case 'SELECT_SHIP': {
        const roomId = this.clientRoomMap.get(clientId);
        if (!roomId) return;
        const room = this.rooms.get(roomId);
        if (room) room.setPlayerShip(clientId, msg.shipClass);
        break;
      }

      case 'START_GAME': {
        const roomId = this.clientRoomMap.get(clientId);
        if (!roomId) return;
        const room = this.rooms.get(roomId);
        const player = room?.players.get(clientId);
        if (!room || !player?.isHost) return;

        if (room.status === 'FINISHED') {
          room.resetToLobby();
          this.broadcastLobbyUpdate();
          return;
        }

        // Verify that all players are ready before setting sail
        const unready = Array.from(room.players.values()).filter((p) => !p.isReady);
        if (unready.length > 0) {
          const names = unready.map((p) => p.name).join(', ');
          this.sendDirect(clientId, {
            type: 'ERROR',
            message: `Menunggu semua captain siap tempur (Ready)! Belum siap: ${names}`,
          });
          return;
        }

        const started = room.startGame();
        if (started) {
          this.broadcastLobbyUpdate();
        }
        break;
      }

      case 'INPUT': {
        const roomId = this.clientRoomMap.get(clientId);
        if (!roomId) return;
        const room = this.rooms.get(roomId);
        if (room) room.handleInput(clientId, msg.rudder, msg.sail);
        break;
      }

      case 'FIRE_BROADSIDE': {
        const roomId = this.clientRoomMap.get(clientId);
        if (!roomId) return;
        const room = this.rooms.get(roomId);
        if (room) room.handleFire(clientId, msg.side);
        break;
      }

      case 'PING': {
        this.sendDirect(clientId, {
          type: 'PONG',
          clientTime: msg.clientTime,
          serverTime: Date.now(),
        });
        break;
      }
    }
  }

  public broadcastLobbyUpdate(): void {
    this.broadcastToTopic('lobby', {
      type: 'ROOM_LIST',
      rooms: this.getRoomList(),
    });
  }

  public handleClientDisconnect(clientId: string): void {
    const roomId = this.clientRoomMap.get(clientId);
    if (!roomId) return;

    this.clientRoomMap.delete(clientId);
    const room = this.rooms.get(roomId);
    if (room) {
      room.removePlayer(clientId);
      if (room.players.size === 0) {
        room.destroy();
        this.rooms.delete(roomId);
      }
    }
    this.broadcastLobbyUpdate();
  }
}

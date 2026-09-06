import { PhysicsEngine } from './PhysicsEngine.js';
import { getBroadsideTransform } from './NavalCombatMath.js';
import { SERVER_SHIP_CONFIGS } from '../types/protocol.js';
import type { GameRoom } from './GameRoom.js';

export class CombatSystem {
  public static handleFire(room: GameRoom, shipId: string, side: 'left' | 'right'): void {
    const ship = room.ships.get(shipId);
    if (!ship || ship.isSunk || room.status !== 'IN_GAME') return;

    const config = SERVER_SHIP_CONFIGS[ship.shipClass];
    const reloadTimer = side === 'left' ? ship.reloadTimerLeft : ship.reloadTimerRight;

    if (reloadTimer > 0) {
      return; // Still reloading
    }

    // Reset reload timer
    if (side === 'left') ship.reloadTimerLeft = config.reloadTime;
    else ship.reloadTimerRight = config.reloadTime;

    const count = config.cannonsPerSide;
    const span = config.length * 0.65;
    const step = span / (count + 1);

    const numWaves = count <= 3 ? 1 : count <= 6 ? 2 : count <= 10 ? 3 : 4;
    const waveDelayMs = 60;

    for (let wave = 0; wave < numWaves; wave++) {
      const startIndex = Math.floor((wave * count) / numWaves) + 1;
      const endIndex = Math.floor(((wave + 1) * count) / numWaves);

      const fireSubVolley = () => {
        if (!room.ships.has(shipId) || ship.isSunk || room.status !== 'IN_GAME') return;

        const serverTime = (Date.now() - room.getStartTime()) / 1000;
        const muzzleSpeed = 68 + Math.random() * 6;

        for (let i = startIndex; i <= endIndex; i++) {
          const offsetAlongLength = -span * 0.5 + i * step;
          const transform = getBroadsideTransform(ship.x, ship.z, ship.rotationY, side, config.width, offsetAlongLength);

          const spreadX = (Math.random() - 0.5) * 0.05;
          const spreadY = (Math.random() - 0.5) * 0.03;

          const vx = Math.sin(transform.fireAngle + spreadX) * muzzleSpeed;
          const vy = 8.8 + spreadY * 4;
          const vz = Math.cos(transform.fireAngle + spreadX) * muzzleSpeed;

          room.cannonballs.push({
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
            maxLife: 3.5,
          });
        }

        room.broadcastToRoom({
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
          room.activeVolleyTimers.delete(timer);
          fireSubVolley();
        }, wave * waveDelayMs);
        room.activeVolleyTimers.add(timer);
      }
    }
  }

  public static checkVictoryCondition(room: GameRoom): void {
    if (room.status !== 'IN_GAME') return;

    const totalPlayers = room.players.size;
    const shouldEnd = room.wasMultiplayer && totalPlayers <= 1;

    if (shouldEnd) {
      room.status = 'FINISHED';

      const aliveShips = Array.from(room.ships.values()).filter((s) => !s.isSunk);
      const winner = aliveShips[0] || Array.from(room.ships.values())[0];
      const winnerName = winner?.name || (totalPlayers === 1 ? 'Sole Survivor' : 'No one');
      
      room.broadcastToRoom({
        type: 'GAME_OVER',
        winnerId: winner?.id ?? '',
        winnerName,
      });

      room.broadcastRoomState();

      if (room.autoResetTimer) clearTimeout(room.autoResetTimer);
      room.autoResetTimer = setTimeout(() => {
        if (room.status === 'FINISHED' && room.players.size > 0) {
          room.resetToLobby();
        }
      }, 12000);
    }
  }
}

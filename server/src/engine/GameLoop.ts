import { PhysicsEngine } from './PhysicsEngine.js';
import { BotAI } from './BotAI.js';
import { CombatSystem } from './CombatSystem.js';
import { CollisionSystem } from './CollisionSystem.js';
import type { GameRoom } from './GameRoom.js';

export class GameLoop {
  public static step(room: GameRoom, now: number): void {
    if (room.status !== 'IN_GAME') return;

    const elapsed = Math.min(0.15, (now - room.lastTickTime) / 1000);
    room.lastTickTime = now;
    room.tickAccumulator += elapsed;

    let simulatedSteps = 0;
    while (room.tickAccumulator >= room.FIXED_DT && simulatedSteps < 4) {
      room.tickAccumulator -= room.FIXED_DT;
      simulatedSteps++;
      room.tickSeq++;
      const serverTime = (now - room.getStartTime()) / 1000;

      if (simulatedSteps === 1) {
        for (const ship of room.ships.values()) {
          const player = room.players.get(ship.id);
          if (player?.isBot && !ship.isSunk) {
            BotAI.update(ship, room);
          }
        }
      }

      for (const ship of room.ships.values()) {
        PhysicsEngine.updateShip(ship, room.FIXED_DT, serverTime, room.windAngle, room.windSpeed, room.mapId);
      }

      CollisionSystem.resolveShipCollisions(room.ships, room.FIXED_DT);

      room.cannonballs = CollisionSystem.updateCannonballs(
        room.cannonballs,
        room.ships,
        room.FIXED_DT,
        serverTime,
        (ball, hitShip) => {
          hitShip.health = Math.max(0, hitShip.health - ball.damage);

          room.broadcastToRoom({
            type: 'HIT_EVENT',
            targetId: hitShip.id,
            attackerId: ball.ownerId,
            damage: ball.damage,
            hitPos: [Math.round(ball.x * 100) / 100, Math.round(ball.y * 100) / 100, Math.round(ball.z * 100) / 100],
            remainingHp: Math.round(hitShip.health * 10) / 10,
          });

          if (hitShip.health <= 0 && !hitShip.isSunk) {
            hitShip.isSunk = true;
            const killer = room.players.get(ball.ownerId);
            if (killer) {
              killer.kills = (killer.kills || 0) + 1;
              killer.score += 100;
            }
            const victim = room.players.get(hitShip.id);
            if (victim) {
              victim.deaths = (victim.deaths || 0) + 1;
              victim.respawnCountdown = 5;
            }

            room.broadcastToRoom({
              type: 'SHIP_SUNK',
              shipId: hitShip.id,
              killerId: ball.ownerId,
            });

            if (room.gameMode === 'TEAM' && killer?.team) {
              const killerTeam = killer.team;
              let totalTeamKills = 0;
              for (const p of room.players.values()) {
                if (p.team === killerTeam) {
                  totalTeamKills += p.kills || 0;
                }
              }

              if (totalTeamKills >= room.targetKills) {
                room.status = 'FINISHED';
                const winnerName = killerTeam === 'red' ? 'Red Armada' : 'Blue Armada';
                room.broadcastToRoom({
                  type: 'GAME_OVER',
                  winnerId: killerTeam,
                  winnerName,
                });

                room.broadcastRoomState();

                if (room.autoResetTimer) clearTimeout(room.autoResetTimer);
                room.autoResetTimer = setTimeout(() => {
                  if (room.status === 'FINISHED' && room.players.size > 0) {
                    room.resetToLobby();
                  }
                }, 12000);
                return;
              }
            } else if (killer && killer.kills >= room.targetKills) {
              room.status = 'FINISHED';
              room.broadcastToRoom({
                type: 'GAME_OVER',
                winnerId: killer.id,
                winnerName: killer.name,
              });

              room.broadcastRoomState();

              if (room.autoResetTimer) clearTimeout(room.autoResetTimer);
              room.autoResetTimer = setTimeout(() => {
                if (room.status === 'FINISHED' && room.players.size > 0) {
                  room.resetToLobby();
                }
              }, 12000);
              return;
            }

            room.broadcastRoomState();
            room.scheduleShipRespawn(hitShip.id);
          }
        },
        (ownerId, targetId) => {
          if (room.gameMode !== 'TEAM') return false;
          const p1 = room.players.get(ownerId);
          const p2 = room.players.get(targetId);
          return Boolean(p1?.team && p2?.team && p1.team === p2.team);
        },
        room.mapId
      );
    }

    if (simulatedSteps > 0) {
      room.broadcastSnapshot();
    }
  }
}

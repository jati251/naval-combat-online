import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RoomManager } from '../../server/src/network/RoomManager.js';
import { SecurityGuard } from '../../server/src/security/SecurityGuard.js';
import type { ServerMessage } from '../../server/src/types/protocol.js';

describe('Network Resilience & Session Recovery', () => {
  it('preserves room and host status when a player refreshes or briefly drops in LOBBY', () => {
    const directMessages: Array<{ clientId: string; message: ServerMessage }> = [];
    const manager = new RoomManager(
      () => {},
      (clientId, message) => {
        directMessages.push({ clientId, message });
      }
    );

    try {
      const createRes = manager.handleClientMessage('socket-1', {
        type: 'CREATE_ROOM',
        roomName: 'Black Flag Fleet',
        playerName: 'Captain Kenway',
        shipClass: 'brig',
        sessionToken: 'sess-kenway-123',
      });

      const roomId = createRes?.joinedRoomId;
      assert.ok(roomId, 'Room should be created');
      assert.equal(manager.getRoomList().length, 1);

      // Simulate unintentional socket drop (e.g. page refresh or 1s Wi-Fi blip in lobby)
      manager.handleClientDisconnect('socket-1', false);

      // Room must remain alive during the lobby grace window
      assert.equal(manager.getRoomList().length, 1, 'Lobby room must survive unintentional socket drop during grace window');

      // Reconnect with a new socket ID and the same session token
      const reconnectRes = manager.handleClientMessage('socket-2', {
        type: 'RECONNECT',
        roomId: roomId!,
        sessionToken: 'sess-kenway-123',
      });

      assert.equal(reconnectRes?.joinedRoomId, roomId);
      const roomInfo = manager.getRoomList()[0];
      assert.equal(roomInfo.players.length, 1);
      assert.equal(roomInfo.players[0].id, 'socket-2');
      assert.equal(roomInfo.players[0].isHost, true);
      assert.equal(roomInfo.players[0].isDisconnected, false);

      // Verify ROOM_STATE was delivered with authoritative selfId = 'socket-2'
      const latestRoomState = directMessages
        .filter((m) => m.clientId === 'socket-2' && m.message.type === 'ROOM_STATE')
        .pop();
      assert.ok(latestRoomState && latestRoomState.message.type === 'ROOM_STATE');
      assert.equal(latestRoomState.message.selfId, 'socket-2');
    } finally {
      manager.destroy();
    }
  });

  it('cleans up stale clientRoomMap entry when reconnecting before old zombie socket closes', () => {
    const manager = new RoomManager(
      () => {},
      () => {}
    );

    try {
      const createRes = manager.handleClientMessage('old-socket', {
        type: 'CREATE_ROOM',
        roomName: 'Nassau Squadron',
        playerName: 'Captain Vane',
        shipClass: 'frigate',
        sessionToken: 'sess-vane-999',
      });
      const roomId = createRes!.joinedRoomId!;

      manager.handleClientMessage('old-socket', { type: 'START_GAME' });
      assert.equal(manager.getRoomList()[0].status, 'IN_GAME');

      // Client reconnects on 'new-socket' BEFORE 'old-socket' TCP timeout fires on the server
      const reconnectRes = manager.handleClientMessage('new-socket', {
        type: 'RECONNECT',
        roomId,
        sessionToken: 'sess-vane-999',
      });
      assert.equal(reconnectRes?.joinedRoomId, roomId);

      // Now the dead 'old-socket' finally closes 5 seconds later
      manager.handleClientDisconnect('old-socket', false);

      // The reconnected player on 'new-socket' must NOT be marked disconnected
      const roomInfo = manager.getRoomList()[0];
      assert.equal(roomInfo.players[0].id, 'new-socket');
      assert.equal(roomInfo.players[0].isDisconnected, false);
    } finally {
      manager.destroy();
    }
  });

  it('allows 60Hz/144Hz burst input + fire packets without false rate-limit drops', () => {
    const clientId = 'high-hz-client';
    try {
      for (let i = 0; i < 60; i++) {
        assert.equal(SecurityGuard.checkMessageRate(clientId), 'ALLOW');
      }
    } finally {
      SecurityGuard.removeClient(clientId);
    }
  });
});

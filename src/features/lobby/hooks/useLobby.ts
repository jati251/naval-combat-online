import { useState, useCallback } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { useToastStore } from '@/stores/useToastStore';
import { networkClient } from '@/services/networkClient';

import type { MapId } from '@/types';

export const useLobby = () => {
  const currentRoom = useGameStore((s) => s.currentRoom);
  const selfId = useGameStore((s) => s.selfId);
  const playerName = useGameStore((s) => s.playerName);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showServerModal, setShowServerModal] = useState(false);

  const selfPlayer = currentRoom?.players.find((p) => p.id === selfId);
  const isHost = selfPlayer?.isHost ?? false;

  const otherPlayers = currentRoom?.players.filter((p) => p.id !== selfId) ?? [];
  const hasOtherPlayers = otherPlayers.length > 0;
  const allCaptainsReady = Boolean(
    currentRoom &&
      currentRoom.players.length > 0 &&
      (hasOtherPlayers ? otherPlayers.every((p) => p.isReady) : true)
  );

  const readyCount = currentRoom?.players.filter((p) => p.isReady).length ?? 0;
  const totalCount = currentRoom?.players.length ?? 0;

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    networkClient.refreshRooms();
    setTimeout(() => setIsRefreshing(false), 500);
  }, []);

  const handleStartGame = useCallback(() => {
    if (!allCaptainsReady) {
      const unreadyNames = otherPlayers
        .filter((p) => !p.isReady)
        .map((p) => p.name)
        .join(', ');
      useToastStore
        .getState()
        .warning(
          `Awaiting all captains to sign articles (${unreadyNames || 'Captain'} not yet ready)!`,
          'Captains Not Ready'
        );
      return;
    }

    setIsDeploying(true);
    networkClient.startGame();

    // Safety timeout in case server responds slowly
    setTimeout(() => {
      setIsDeploying(false);
    }, 7000);
  }, [allCaptainsReady, otherPlayers]);

  const handleCreateRoom = useCallback(
    (
      roomName: string,
      maxPlayers: number,
      timeOfDay: 'DAY' | 'NIGHT' | 'RANDOM' = 'DAY',
      targetKills: number = 5,
      gameMode: 'FFA' | 'TEAM' = 'FFA',
      mapId: MapId = 'caribbean'
    ) => {
      if (!roomName.trim()) {
        useToastStore
          .getState()
          .warning('Fleet Anchorage designation cannot be empty!', 'Input Required');
        return false;
      }
      if (!playerName.trim()) {
        useToastStore
          .getState()
          .warning(
            'Commanding Captain name must be specified first!',
            'Captain Name Required'
          );
        return false;
      }
      networkClient.createRoom(roomName.trim(), maxPlayers, timeOfDay, targetKills, gameMode, mapId);
      setShowCreateModal(false);
      return true;
    },
    [playerName]
  );

  return {
    isRefreshing,
    isDeploying,
    showCreateModal,
    showServerModal,
    setShowCreateModal,
    setShowServerModal,
    selfPlayer,
    isHost,
    allCaptainsReady,
    readyCount,
    totalCount,
    handleRefresh,
    handleStartGame,
    handleCreateRoom,
  };
};

import { useState, useCallback } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { useToastStore } from '@/stores/useToastStore';
import { networkClient } from '@/services/networkClient';

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
          `Menunggu semua captain siap (${unreadyNames || 'Captain'} belum Ready)!`,
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
    (roomName: string, maxPlayers: number, timeOfDay: 'DAY' | 'NIGHT' | 'RANDOM' = 'DAY') => {
      if (!roomName.trim()) {
        useToastStore
          .getState()
          .warning('Nama fleet armada tidak boleh kosong!', 'Input Diperlukan');
        return false;
      }
      if (!playerName.trim()) {
        useToastStore
          .getState()
          .warning(
            'Harap tentukan Nama Captain Anda terlebih dahulu!',
            'Nama Captain Diperlukan'
          );
        return false;
      }
      networkClient.createRoom(roomName.trim(), maxPlayers, timeOfDay);
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

import type { StateCreator } from 'zustand';
import type { RoomInfo } from '@/types';
import type { SessionSlice } from './createSessionSlice';

export interface LobbySlice {
  availableRooms: RoomInfo[];
  currentRoom: RoomInfo | null;

  setAvailableRooms: (rooms: RoomInfo[]) => void;
  setCurrentRoom: (room: RoomInfo | null, selfId?: string) => void;
}

export const createLobbySlice: StateCreator<
  SessionSlice & LobbySlice,
  [],
  [],
  LobbySlice
> = (set) => ({
  availableRooms: [],
  currentRoom: null,

  setAvailableRooms: (availableRooms) => set({ availableRooms }),
  setCurrentRoom: (currentRoom, selfId) =>
    set((state) => ({
      currentRoom,
      selfId: selfId || state.selfId,
    })),
});

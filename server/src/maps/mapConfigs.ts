import type { MapId } from '../types/protocol.js';

export interface ServerIsland {
  id: string;
  x: number;
  z: number;
  radius: number;
  sandRadius: number;
  elongation?: {
    scaleX: number;
    scaleZ: number;
    angle: number;
  };
}

export interface ServerWreck {
  id: string;
  x: number;
  z: number;
  radius: number;
  height: number;
}

export interface ServerMapConfig {
  id: MapId;
  name: string;
  radius: number;
  islands: ServerIsland[];
  wrecks: ServerWreck[];
}

export const SERVER_MAPS: Record<MapId, ServerMapConfig> = {
  caribbean: {
    id: 'caribbean',
    name: 'Caribbean Archipelago',
    radius: 500,
    islands: [
      {
        id: 'isla-larga',
        x: -40,
        z: -10,
        radius: 28,
        sandRadius: 38,
        elongation: { scaleX: 0.52, scaleZ: 2.3, angle: 0.45 },
      },
      { id: 'dead-mans-cay', x: -330, z: 180, radius: 44, sandRadius: 60 },
      { id: 'isla-de-la-muerte', x: 290, z: -260, radius: 46, sandRadius: 62 },
      { id: 'smugglers-reef', x: 320, z: 160, radius: 34, sandRadius: 48 },
      { id: 'isla-verde', x: 260, z: -30, radius: 40, sandRadius: 55 },
      { id: 'tortuga-atoll', x: -280, z: -250, radius: 36, sandRadius: 50 },
      { id: 'verdant-ridge', x: -80, z: 340, radius: 45, sandRadius: 60 },
      { id: 'cayo-de-la-selva', x: -360, z: -30, radius: 40, sandRadius: 54 },
      { id: 'black-sand-atoll', x: 70, z: -340, radius: 35, sandRadius: 48 },
    ],
    wrecks: [
      { id: 'wreck-el-cazador', x: 40, z: 110, radius: 14, height: 8 },
      { id: 'wreck-queen-anne', x: -140, z: -80, radius: 12, height: 7 },
      { id: 'wreck-royal-fortune', x: 130, z: -100, radius: 13, height: 8 },
    ],
  },

  kingston: {
    id: 'kingston',
    name: 'Kingston Straits',
    radius: 500,
    islands: [
      {
        id: 'the-palisadoes',
        x: -60,
        z: 20,
        radius: 24,
        sandRadius: 38,
        elongation: { scaleX: 0.25, scaleZ: 3.8, angle: -0.68 },
      },
      { id: 'fort-charles-cay', x: 60, z: -50, radius: 92, sandRadius: 108 },
      { id: 'port-henderson-bluff', x: -310, z: -160, radius: 46, sandRadius: 62 },
      { id: 'gun-cay', x: 180, z: 80, radius: 20, sandRadius: 28 },
      { id: 'lime-cay', x: -220, z: 260, radius: 22, sandRadius: 32 },
      { id: 'apostles-battery', x: 280, z: -210, radius: 34, sandRadius: 46 },
      { id: 'morgans-shoal', x: -330, z: 80, radius: 26, sandRadius: 38 },
      { id: 'pelican-cays', x: 320, z: 140, radius: 18, sandRadius: 26 },
    ],
    wrecks: [
      { id: 'wreck-hms-vanguard', x: -110, z: -120, radius: 14, height: 8 },
      { id: 'wreck-port-royal-hulk', x: 100, z: -160, radius: 13, height: 8 },
      { id: 'wreck-golden-hind', x: -40, z: 210, radius: 12, height: 7 },
    ],
  },

  mexico: {
    id: 'mexico',
    name: 'Gulf of Mexico',
    radius: 500,
    islands: [
      {
        id: 'el-arco-de-piedra',
        x: 90,
        z: 30,
        radius: 36,
        sandRadius: 50,
        elongation: { scaleX: 0.6, scaleZ: 2.1, angle: 0.8 },
      },
      { id: 'kukulcan-crest', x: -190, z: -90, radius: 56, sandRadius: 74 },
      { id: 'isla-cozumel', x: 300, z: -180, radius: 72, sandRadius: 95 },
      { id: 'arrecife-del-sol', x: -280, z: 190, radius: 36, sandRadius: 50 },
      { id: 'cayo-cenote', x: -70, z: 280, radius: 28, sandRadius: 40 },
      { id: 'punta-escondida', x: 260, z: 120, radius: 40, sandRadius: 55 },
      { id: 'boca-del-rio', x: -330, z: -220, radius: 36, sandRadius: 50 },
      { id: 'isla-mujeres-reef', x: 110, z: -310, radius: 35, sandRadius: 48 },
    ],
    wrecks: [
      { id: 'wreck-atocha', x: -50, z: -160, radius: 14, height: 8 },
      { id: 'wreck-san-jeronimo', x: 170, z: -60, radius: 13, height: 7 },
      { id: 'wreck-el-dragon', x: -160, z: 120, radius: 12, height: 7 },
    ],
  },
};

export function getServerMap(mapId: MapId = 'caribbean'): ServerMapConfig {
  return SERVER_MAPS[mapId] || SERVER_MAPS.caribbean;
}

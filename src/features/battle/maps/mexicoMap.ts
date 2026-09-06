import type { MapDefinition } from './types';
import type { IslandDefinition } from '../components/3d/islands/types';
import type { ShipwreckDefinition } from '../components/3d/Shipwrecks3D';

export const MEXICO_ISLANDS: IslandDefinition[] = [
  // 1. El Arco de Piedra - Dramatic natural limestone sea arch & jagged karst stacks
  {
    id: 'el-arco-de-piedra',
    name: 'El Arco de Piedra',
    x: 90,
    z: 30,
    radius: 36,
    height: 28,
    sandRadius: 0,
    type: 'sea-stack',
    seed: 681,
    elongation: {
      scaleX: 0.6,
      scaleZ: 2.1,
      angle: 0.8,
    },
    palms: [],
    bushes: [],
    jungleTrees: [],
    rocks: [],
    settlement: {
      type: 'sea-arch',
      x: 0,
      z: 0,
      rotationY: 0.8,
    },
  },
  // 2. Kukulcán's Crest - High limestone plateau crowned with ancient stepped ruins
  {
    id: 'kukulcan-crest',
    name: "Kukulcán's Crest",
    x: -190,
    z: -90,
    radius: 56,
    height: 36,
    sandRadius: 74,
    type: 'verdant-hills',
    seed: 914,
    palms: [
      [-24, 16, 1.3], [22, -14, 1.2], [-12, -26, 1.4], [26, 18, 1.0],
      [10, 28, 1.2], [-26, -10, 1.1], [28, -6, 1.3], [-8, 32, 1.0],
      [-36, 10, 1.2], [35, -20, 1.3], [-18, -35, 1.2], [32, 24, 1.1],
      [-30, -22, 1.2], [20, -32, 1.1], [-14, 38, 1.3], [24, -28, 1.2],
      [-40, -5, 1.2], [38, 14, 1.3],
    ],
    bushes: [
      [-16, 10, 1.3], [16, -10, 1.2], [-6, -18, 1.4], [18, 12, 1.1],
      [6, 20, 1.3], [-18, -4, 1.2], [-28, 14, 1.2], [26, -16, 1.3],
    ],
    jungleTrees: [
      [-14, -20, 1.5], [12, -22, 1.6], [0, 32, 1.5], [-22, -12, 1.5],
      [24, 12, 1.4], [-28, 6, 1.6], [28, -12, 1.5], [-10, -32, 1.6],
      [18, -25, 1.5], [-32, -15, 1.4], [30, 18, 1.5], [0, -38, 1.7],
      [-20, 26, 1.5], [22, 28, 1.4],
    ],
    rocks: [
      [-32, 20, 2.4, 0.5], [30, -18, 2.3, 1.7], [-26, -28, 2.6, 2.8],
      [36, 12, 2.1, 0.4], [0, 38, 2.5, 1.9], [-42, 0, 2.8, 1.1],
      [40, -8, 2.6, 2.0],
    ],
    settlement: {
      type: 'mayan-temple',
      x: 0,
      z: 8,
      rotationY: 0.2,
      terraceElevation: 12.0,
      terraceRadius: 36,
    },
  },
  // 3. Isla Cozumel - Sprawling tropical jungle island with sandy coves
  {
    id: 'isla-cozumel',
    name: 'Isla de Cozumel',
    x: 300,
    z: -180,
    radius: 72,
    height: 16,
    sandRadius: 95,
    type: 'dense-jungle',
    seed: 772,
    palms: [
      [-22, 14, 1.3], [20, -16, 1.2], [-14, -20, 1.4], [24, 14, 1.1],
      [10, 26, 1.2], [-24, -6, 1.0], [4, -26, 1.2], [-45, 10, 1.2],
      [45, -15, 1.3], [-35, -35, 1.1], [35, 30, 1.2], [15, -45, 1.3],
      [-50, -15, 1.2], [50, 10, 1.1], [-20, 48, 1.2], [30, -50, 1.1],
      [-55, 25, 1.2], [55, -25, 1.3], [0, -55, 1.2], [0, 52, 1.3],
    ],
    bushes: [
      [-12, 10, 1.4], [14, -8, 1.3], [-4, -14, 1.3], [16, 10, 1.2],
      [8, 18, 1.4], [-16, 4, 1.1], [-30, 15, 1.2], [30, -15, 1.3],
      [-20, -25, 1.2], [22, 22, 1.2],
    ],
    jungleTrees: [
      [-12, 4, 1.6], [12, -8, 1.7], [2, 10, 1.5], [-6, -10, 1.6],
      [10, 6, 1.4], [-30, 0, 1.7], [30, -10, 1.6], [0, -30, 1.8],
      [20, 20, 1.5], [-20, -20, 1.7], [10, -25, 1.6], [-35, 15, 1.5],
      [35, -20, 1.6], [-15, 35, 1.5], [18, -35, 1.7], [-25, -35, 1.6],
      [25, 30, 1.5], [0, 25, 1.7], [-40, -10, 1.5], [40, 15, 1.6],
    ],
    rocks: [
      [-28, 16, 1.8, 0.8], [26, -14, 1.9, 2.0], [-18, -22, 2.1, 1.3],
      [30, 8, 1.6, 0.5],
    ],
  },
  // 4. Arrecife del Sol - Crescent coral reef shelf with wave breaks
  {
    id: 'arrecife-del-sol',
    name: 'Arrecife del Sol',
    x: -280,
    z: 190,
    radius: 36,
    height: 9,
    sandRadius: 50,
    type: 'atoll',
    seed: 355,
    palms: [
      [-12, 10, 1.1], [14, -8, 1.0], [4, 16, 1.2], [-14, -10, 1.1],
      [16, 6, 1.0],
    ],
    bushes: [
      [-8, 6, 1.0], [10, -6, 0.9], [2, 10, 1.1], [-10, -6, 1.0],
    ],
    jungleTrees: [
      [-4, 4, 1.1], [6, -4, 1.0],
    ],
    rocks: [
      [-18, 14, 1.5, 0.6], [16, -10, 1.4, 1.9], [-12, -16, 1.7, 1.4],
    ],
  },
  // 5. Cayo Cenote - Natural island featuring a deep turquoise inner saltwater breach
  {
    id: 'cayo-cenote',
    name: 'Cayo Cenote',
    x: -70,
    z: 280,
    radius: 28,
    height: 10,
    sandRadius: 40,
    type: 'atoll',
    seed: 833,
    palms: [
      [-20, 12, 1.2], [22, -14, 1.3], [-10, 24, 1.1], [24, 12, 1.0],
      [8, -26, 1.2], [-22, -10, 1.1],
    ],
    bushes: [
      [-14, 8, 1.3], [14, -10, 1.2], [-4, 16, 1.4], [16, 10, 1.1],
    ],
    jungleTrees: [
      [-10, 6, 1.3], [10, -8, 1.4], [0, 12, 1.2],
    ],
    rocks: [
      [-28, 14, 2.0, 0.9], [26, -14, 2.1, 2.1], [-20, -20, 2.2, 1.6],
    ],
  },
  // 6. Punta Escondida - Rocky volcanic point with ancient Mayan watchtower
  {
    id: 'punta-escondida',
    name: 'Punta Escondida',
    x: 260,
    z: 120,
    radius: 40,
    height: 30,
    sandRadius: 55,
    type: 'volcanic',
    seed: 462,
    palms: [
      [-18, 12, 1.3], [18, -14, 1.2], [-8, 22, 1.4], [22, 12, 1.0],
      [6, -24, 1.1], [-20, -8, 1.2],
    ],
    bushes: [
      [-12, 8, 1.2], [14, -6, 1.1], [-4, 14, 1.3], [16, 8, 1.0],
    ],
    jungleTrees: [
      [-10, 6, 1.3], [8, -8, 1.2], [0, 10, 1.4],
    ],
    rocks: [
      [-30, 18, 2.5, 0.7], [26, -16, 2.3, 1.8], [-22, -24, 2.6, 2.6],
      [32, 10, 2.0, 0.3],
    ],
  },
  // 7. Boca del Río - Mangrove sandy cay guarding the western shoals
  {
    id: 'boca-del-rio',
    name: 'Boca del Río',
    x: -330,
    z: -220,
    radius: 36,
    height: 14,
    sandRadius: 50,
    type: 'lush-flat',
    seed: 289,
    palms: [
      [-12, 10, 1.2], [14, -10, 1.1], [4, 16, 1.3], [-14, -12, 1.0],
      [16, 8, 1.2],
    ],
    bushes: [
      [-8, 6, 1.2], [10, -6, 1.0], [2, 12, 1.1],
    ],
    rocks: [
      [-18, 12, 1.6, 0.5], [16, -10, 1.5, 1.8], [-12, -14, 1.7, 2.2],
    ],
  },
  // 8. Isla Mujeres Reef - Outer barrier reef with sandy spit and palms
  {
    id: 'isla-mujeres-reef',
    name: 'Isla Mujeres Reef',
    x: 110,
    z: -310,
    radius: 35,
    height: 13,
    sandRadius: 48,
    type: 'lush-flat',
    seed: 154,
    palms: [
      [-10, 8, 1.1], [12, -6, 1.0], [2, 14, 1.2], [-12, -8, 1.0],
      [14, 6, 1.1],
    ],
    bushes: [
      [-6, 4, 1.1], [8, -4, 1.0], [0, 10, 1.2],
    ],
    rocks: [
      [-16, 12, 1.4, 0.8], [14, -10, 1.3, 2.0], [-10, -14, 1.5, 1.2],
    ],
  },
];

export const MEXICO_WRECKS: ShipwreckDefinition[] = [
  {
    id: 'wreck-atocha',
    name: 'Nuestra Señora de Atocha',
    x: -50,
    z: -160,
    radius: 14,
    heading: -0.45,
    roll: 0.52,
    pitch: -0.18,
    seed: 189,
  },
  {
    id: 'wreck-san-jeronimo',
    name: 'San Jerónimo Galleon',
    x: 170,
    z: -60,
    radius: 13,
    heading: 1.6,
    roll: -0.38,
    pitch: 0.25,
    seed: 294,
  },
  {
    id: 'wreck-el-dragon',
    name: 'El Dragón Privateer',
    x: -160,
    z: 120,
    radius: 12,
    heading: -2.1,
    roll: 0.42,
    pitch: 0.12,
    seed: 381,
  },
];

export const mexicoMap: MapDefinition = {
  id: 'mexico',
  name: 'Gulf of Mexico',
  englishName: 'Gulf of Mexico & Yucatan Reefs',
  subtitle: 'Yucatan Reefs • Ancient Mayan Ruins & Sea Arch',
  description:
    'Exotic emerald waters dotted with towering limestone pinnacles, ancient Mayan stepped pyramids, and the monumental natural sea arch El Arco.',
  tacticalTag: 'REEFS & ANCIENT RUINS',
  badgeColor: 'emerald',
  radius: 500,
  islands: MEXICO_ISLANDS,
  shipwrecks: MEXICO_WRECKS,
  water: {
    deepWaterColor: '#064e3b',
    midWaterColor: '#0d9488',
    shallowColor: '#10b981',
    lagoonColor: '#34d399',
    crestGlowColor: '#6ee7b7',
    subsurfaceColor: '#2dd4bf',
    foamColor: '#f0fdf4',
  },
  atmosphere: {
    fogColorDay: '#80c8e8',
    fogColorNight: '#062a2a',
    skyTopDay: '#0f766e',
    skyMidDay: '#14b8a6',
    skyHorizonDay: '#80c8e8',
    skyTopNight: '#041717',
    skyMidNight: '#083333',
    skyHorizonNight: '#062a2a',
    sunColorDay: '#fef08a',
    moonColorNight: '#99f6e4',
    ambientDay: '#ccfbf1',
    ambientNight: '#134e4a',
    hemiSkyDay: '#2dd4bf',
    hemiGroundDay: '#042f2e',
    hemiSkyNight: '#115e59',
    hemiGroundNight: '#022c22',
  },
};

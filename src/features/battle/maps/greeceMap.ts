import type { MapDefinition } from './types';
import type { IslandDefinition } from '../components/3d/islands/types';
import type { ShipwreckDefinition } from '../components/3d/Shipwrecks3D';

export const GREECE_ISLANDS: IslandDefinition[] = [
  // 1. Santorini Caldera - Dramatic crescent volcanic caldera with sheer cliffs
  {
    id: 'santorini-caldera',
    name: 'Santorini Caldera',
    x: -80,
    z: -40,
    radius: 62,
    height: 44,
    sandRadius: 76,
    type: 'volcanic',
    seed: 821,
    elongation: {
      scaleX: 0.7,
      scaleZ: 1.8,
      angle: -0.5,
    },
    palms: [
      [-20, 16, 1.0], [18, -14, 0.9], [-10, 24, 1.1], [22, 10, 0.8],
      [6, -24, 1.0], [-22, -8, 0.9],
    ],
    bushes: [
      [-16, 12, 1.2], [14, -10, 1.1], [-6, 20, 1.3], [18, 8, 1.0],
      [4, -20, 1.2], [-20, -4, 1.1], [-12, -16, 1.2], [10, 16, 1.3],
      [-24, 6, 1.1], [22, -6, 1.2],
    ],
    jungleTrees: [],
    rocks: [
      [-40, 26, 2.8, 0.5], [36, -22, 2.6, 1.7], [-30, -34, 3.0, 2.6],
      [42, 14, 2.4, 0.4], [0, 40, 2.7, 1.9], [-46, -8, 3.1, 1.1],
      [38, -30, 2.5, 2.3],
    ],
  },
  // 2. Delos Temple Isle - Sacred ancient sanctuary island with temple ruins
  {
    id: 'delos-temple',
    name: 'Delos Temple Isle',
    x: 200,
    z: -120,
    radius: 48,
    height: 20,
    sandRadius: 62,
    type: 'verdant-hills',
    seed: 653,
    palms: [
      [-16, 12, 1.1], [14, -10, 1.0], [-6, 18, 1.2], [18, 8, 0.9],
      [4, -18, 1.1], [-18, -6, 1.0], [10, 14, 1.1], [-14, -14, 1.0],
    ],
    bushes: [
      [-12, 8, 1.3], [10, -6, 1.2], [-4, 14, 1.4], [14, 6, 1.1],
      [2, -14, 1.3], [-14, -2, 1.2],
    ],
    jungleTrees: [],
    rocks: [
      [-30, 18, 2.2, 0.6], [26, -16, 2.0, 1.8], [-22, -24, 2.4, 2.5],
      [32, 10, 1.8, 0.4], [0, 30, 2.1, 1.6],
    ],
    settlement: {
      type: 'mayan-temple',
      x: -2,
      z: 6,
      rotationY: 0.4,
      terraceElevation: 8.0,
      terraceRadius: 30,
    },
  },
  // 3. Mykonos Coast - Windswept white-washed island with golden beaches
  {
    id: 'mykonos-coast',
    name: 'Mykonos Coast',
    x: -260,
    z: 180,
    radius: 54,
    height: 18,
    sandRadius: 72,
    type: 'lush-flat',
    seed: 489,
    palms: [
      [-18, 14, 1.1], [16, -12, 1.0], [-8, 22, 1.2], [20, 10, 0.9],
      [6, -22, 1.1], [-20, -6, 1.0], [12, 18, 1.1], [-16, -14, 1.0],
      [-24, 8, 1.1], [22, -8, 1.0], [0, 26, 1.2], [0, -26, 1.1],
    ],
    bushes: [
      [-14, 10, 1.2], [12, -8, 1.1], [-4, 16, 1.3], [16, 8, 1.0],
      [-18, -2, 1.2], [8, 14, 1.1], [-10, -12, 1.2], [14, -4, 1.1],
    ],
    jungleTrees: [],
    rocks: [
      [-32, 20, 1.8, 0.7], [28, -18, 1.6, 1.6], [-24, -26, 2.0, 2.4],
      [34, 12, 1.5, 0.5],
    ],
  },
  // 4. Naxos Fortress - Fortified Venetian castle island with harbor
  {
    id: 'naxos-fortress',
    name: 'Naxos Fortress',
    x: 120,
    z: 220,
    radius: 42,
    height: 28,
    sandRadius: 56,
    type: 'verdant-hills',
    seed: 917,
    palms: [
      [-14, 10, 1.1], [12, -8, 1.0], [-6, 16, 1.2], [16, 8, 0.9],
      [4, -16, 1.1], [-16, -4, 1.0],
    ],
    bushes: [
      [-10, 6, 1.2], [8, -4, 1.1], [-2, 12, 1.3], [12, 4, 1.0],
      [-12, -6, 1.2], [6, 10, 1.1],
    ],
    jungleTrees: [],
    rocks: [
      [-26, 16, 2.4, 0.6], [22, -14, 2.2, 1.7], [-18, -20, 2.6, 2.5],
      [28, 8, 2.0, 0.3],
    ],
    settlement: {
      type: 'colonial-fort',
      x: 0,
      z: -4,
      rotationY: -0.8,
      terraceElevation: 10.0,
      terraceRadius: 28,
    },
  },
  // 5. Paros Marble Quarry - Low rolling island with ancient marble quarries
  {
    id: 'paros-marble',
    name: 'Paros Marble Quarry',
    x: -180,
    z: -240,
    radius: 36,
    height: 14,
    sandRadius: 50,
    type: 'lush-flat',
    seed: 376,
    palms: [
      [-12, 8, 1.0], [10, -6, 0.9], [2, 14, 1.1], [-10, -8, 0.9],
      [12, 6, 1.0],
    ],
    bushes: [
      [-8, 6, 1.1], [8, -4, 1.0], [0, 10, 1.2], [-8, -4, 1.1],
    ],
    jungleTrees: [],
    rocks: [
      [-20, 14, 2.0, 0.5], [18, -12, 1.8, 1.9], [-14, -18, 2.2, 1.4],
      [22, 8, 1.6, 2.6],
    ],
  },
  // 6. Sifnos Watchtower - Steep rocky island with ancient watchtower ruins
  {
    id: 'sifnos-watchtower',
    name: 'Sifnos Watchtower',
    x: 300,
    z: 60,
    radius: 28,
    height: 26,
    sandRadius: 38,
    type: 'sea-stack',
    seed: 542,
    palms: [
      [-8, 6, 1.0], [8, -5, 0.9], [-3, -8, 1.1],
    ],
    bushes: [
      [-6, 4, 1.1], [6, -3, 1.0], [0, 8, 1.2],
    ],
    jungleTrees: [],
    rocks: [
      [-16, 10, 2.4, 0.8], [14, -8, 2.2, 2.0], [-10, -12, 2.6, 1.5],
      [18, 6, 2.0, 0.4],
    ],
  },
  // 7. Milos Sea Caves - Dramatic volcanic island with sea-level cave arches
  {
    id: 'milos-caves',
    name: 'Milos Sea Caves',
    x: -40,
    z: 320,
    radius: 34,
    height: 22,
    sandRadius: 46,
    type: 'volcanic',
    seed: 715,
    palms: [
      [-10, 8, 1.0], [10, -6, 0.9], [2, 12, 1.1], [-10, -8, 0.9],
    ],
    bushes: [
      [-8, 5, 1.2], [7, -4, 1.1], [-2, 10, 1.3], [10, 4, 1.0],
    ],
    jungleTrees: [],
    rocks: [
      [-22, 14, 2.6, 0.6], [20, -12, 2.4, 1.8], [-16, -18, 2.8, 2.7],
      [24, 8, 2.2, 0.3], [0, 22, 2.5, 1.5],
    ],
    settlement: {
      type: 'sea-arch',
      x: 0,
      z: 0,
      rotationY: 1.2,
    },
  },
  // 8. Serifos Rocks - Barren rocky islets in the outer archipelago
  {
    id: 'serifos-rocks',
    name: 'Serifos Rocks',
    x: 260,
    z: -280,
    radius: 20,
    height: 16,
    sandRadius: 28,
    type: 'sea-stack',
    seed: 438,
    palms: [],
    bushes: [
      [-4, 3, 1.0], [5, -3, 0.9],
    ],
    jungleTrees: [],
    rocks: [
      [-12, 8, 2.4, 0.7], [10, -6, 2.2, 2.0], [-6, -10, 2.6, 1.4],
      [14, 4, 2.0, 0.5],
    ],
  },
];

export const GREECE_WRECKS: ShipwreckDefinition[] = [
  {
    id: 'wreck-olympias-trireme',
    name: 'Olympias Trireme',
    x: 60,
    z: -180,
    radius: 12,
    heading: 1.1,
    roll: 0.38,
    pitch: -0.2,
    seed: 204,
  },
  {
    id: 'wreck-venetian-galley',
    name: 'Venetian War Galley',
    x: -150,
    z: 60,
    radius: 13,
    heading: -2.2,
    roll: -0.42,
    pitch: 0.15,
    seed: 318,
  },
  {
    id: 'wreck-ottoman-xebec',
    name: 'Ottoman Xebec',
    x: 180,
    z: 160,
    radius: 11,
    heading: 0.3,
    roll: 0.5,
    pitch: 0.12,
    seed: 456,
  },
];

export const greeceMap: MapDefinition = {
  id: 'greece',
  name: 'Greece Archipelago',
  englishName: 'Aegean Sea & Cyclades Archipelago',
  subtitle: 'Cyclades Islands • Azure Aegean Waters',
  description:
    'Brilliant azure waters of the Aegean Sea scattered with sun-bleached limestone islands, ancient temple ruins, and dramatic volcanic calderas. A maze of islands perfect for ambush tactics.',
  tacticalTag: 'ISLAND HOPPING',
  badgeColor: 'sky',
  radius: 500,
  islands: GREECE_ISLANDS,
  shipwrecks: GREECE_WRECKS,
  water: {
    deepWaterColor: '#0c3d6e',
    midWaterColor: '#1a6db5',
    shallowColor: '#3ba8e8',
    lagoonColor: '#45c8dc',
    crestGlowColor: '#7dd8f0',
    subsurfaceColor: '#29a0d8',
    foamColor: '#f0f9ff',
  },
  atmosphere: {
    fogColorDay: '#a8d4f0',
    fogColorNight: '#081830',
    skyTopDay: '#1470b5',
    skyMidDay: '#4aa8e0',
    skyHorizonDay: '#a8d4f0',
    skyTopNight: '#040c1a',
    skyMidNight: '#0a1c3a',
    skyHorizonNight: '#081830',
    sunColorDay: '#fff5d6',
    moonColorNight: '#c8dcf0',
    ambientDay: '#dceef8',
    ambientNight: '#2a4060',
    hemiSkyDay: '#54b0e4',
    hemiGroundDay: '#0a3a6a',
    hemiSkyNight: '#1a3858',
    hemiGroundNight: '#081428',
  },
};

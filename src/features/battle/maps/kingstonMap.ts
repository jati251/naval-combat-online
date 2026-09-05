import type { MapDefinition } from './types';
import type { IslandDefinition } from '../components/3d/islands/types';
import type { ShipwreckDefinition } from '../components/3d/Shipwrecks3D';

export const KINGSTON_ISLANDS: IslandDefinition[] = [
  // 1. The Great Palisadoes - Long sweeping defensive sandspit barrier protecting Kingston harbor
  {
    id: 'the-palisadoes',
    name: 'The Great Palisadoes',
    x: -60,
    z: 20,
    radius: 24,
    height: 7,
    sandRadius: 38,
    type: 'lush-flat',
    seed: 401,
    elongation: {
      scaleX: 0.25,
      scaleZ: 3.8,
      angle: -0.68,
    },
    palms: [
      [-4, 55, 1.1], [3, 40, 1.0], [-3, 20, 1.2], [4, 0, 1.0],
      [-4, -20, 1.1], [3, -40, 1.0], [-4, -60, 1.2], [3, 10, 0.9],
      [-2, 68, 1.0], [2, 50, 1.1], [-3, 30, 1.2], [3, -10, 1.0],
      [-2, -50, 1.1], [2, -68, 1.0], [0, 60, 1.2], [1, -30, 1.1],
    ],
    bushes: [
      [-2, 45, 1.1], [3, 25, 1.0], [-2, 5, 1.2], [2, -15, 0.9],
      [-2, -35, 1.1], [3, -55, 1.0], [1, 15, 1.1], [-1, -5, 1.0],
    ],
    jungleTrees: [
      [0, 30, 1.2], [1, -5, 1.3], [-1, -30, 1.2], [0, 48, 1.1],
      [0, -45, 1.2], [0, 10, 1.3],
    ],
    rocks: [
      [-8, 65, 1.6, 0.4], [8, 15, 1.5, 1.1], [-8, -25, 1.8, 1.8],
      [8, -65, 1.5, 0.7], [-6, 0, 1.7, 1.2], [6, -45, 1.6, 2.0],
    ],
  },
  // 2. Port Royal & Kingston Island - MASSIVE Flagship Colonial Island with Grand City
  {
    id: 'fort-charles-cay',
    name: 'Port Royal & Kingston Island',
    x: 60,
    z: -50,
    radius: 92,
    height: 28,
    sandRadius: 108,
    type: 'verdant-hills',
    seed: 842,
    palms: [
      // Coastal palms & outer groves
      [-55, 10, 1.2], [55, -20, 1.3], [-35, -45, 1.1], [45, 15, 1.0],
      [15, -60, 1.2], [-60, -25, 1.1], [60, -5, 1.3], [-55, 35, 1.1],
      [52, 40, 1.0], [-10, -55, 1.2], [35, -30, 1.3], [-45, -30, 1.1],
      [-70, 0, 1.2], [68, -15, 1.3], [-25, -65, 1.1], [48, -45, 1.2],
      [-65, -15, 1.3], [58, 20, 1.1], [-18, -70, 1.2], [28, -62, 1.3],
      [-38, 20, 1.1], [62, -35, 1.2], [-50, -48, 1.1], [38, 10, 1.2],
    ],
    bushes: [
      [-40, 20, 1.3], [40, -15, 1.2], [-25, -35, 1.3], [35, 20, 1.1],
      [46, 30, 1.2], [-50, 20, 1.1], [10, -45, 1.2], [-50, -10, 1.1],
      [-30, -50, 1.2], [25, -50, 1.3], [-60, 5, 1.1], [50, -5, 1.2],
    ],
    jungleTrees: [
      // Dense rainforest canopy across northern and central rolling hills
      [-30, 0, 1.5], [30, -20, 1.4], [0, -35, 1.7], [20, 10, 1.4],
      [-20, -25, 1.6], [10, -15, 1.5], [-15, -40, 1.6], [18, -40, 1.5],
      [-40, -15, 1.4], [40, -35, 1.5], [0, -55, 1.7], [-32, -35, 1.6],
      [28, -10, 1.5], [-10, -15, 1.8], [5, -25, 1.6], [-45, 5, 1.4],
      [35, 5, 1.5], [-5, 5, 1.6], [-25, 10, 1.5], [15, -5, 1.7],
      [-35, -55, 1.4], [32, -50, 1.5], [0, -20, 1.8], [-22, -10, 1.6],
    ],
    rocks: [
      [-65, 25, 2.4, 0.8], [65, -25, 2.2, 1.9], [-50, -50, 2.6, 2.3],
      [55, 30, 2.1, 0.5], [0, -70, 2.5, 1.4], [-70, -20, 2.8, 1.2],
      [68, 10, 2.2, 2.1],
    ],
    settlement: {
      type: 'kingston-city',
      x: -8,
      z: 62,
      rotationY: 0.12,
      terraceElevation: 1.5,
      terraceRadius: 52,
    },
  },
  // 3. Port Henderson Bluff - Towering coastal headland in the Southwest
  {
    id: 'port-henderson-bluff',
    name: 'Port Henderson Bluff',
    x: -310,
    z: -160,
    radius: 46,
    height: 42,
    sandRadius: 62,
    type: 'volcanic',
    seed: 331,
    palms: [
      [-18, 16, 1.3], [18, -14, 1.1], [-6, 24, 1.4], [22, 14, 1.0],
      [8, -24, 1.2], [-24, -8, 1.1], [-12, -18, 1.2], [14, 20, 1.3],
      [-28, 10, 1.1], [26, -10, 1.2], [0, 28, 1.3], [0, -28, 1.2],
    ],
    bushes: [
      [-12, 10, 1.2], [14, -8, 1.1], [-4, 16, 1.3], [16, 10, 1.0],
      [-20, 0, 1.2], [18, 4, 1.1],
    ],
    jungleTrees: [
      [-10, 8, 1.5], [10, -10, 1.4], [-2, 14, 1.6], [8, 6, 1.5],
      [-8, -8, 1.6], [0, 0, 1.8], [4, -14, 1.4], [-14, 4, 1.5],
      [12, 12, 1.4], [-6, -16, 1.5],
    ],
    rocks: [
      [-34, 22, 2.6, 0.5], [30, -20, 2.4, 1.6], [-26, -30, 2.8, 2.9],
      [36, 10, 2.0, 0.9],
    ],
  },
  // 4. Gun Cay - Small fortified outer cay guarding the eastern channel
  {
    id: 'gun-cay',
    name: 'Gun Cay Battery',
    x: 180,
    z: 80,
    radius: 20,
    height: 8,
    sandRadius: 28,
    type: 'sea-stack',
    seed: 198,
    palms: [
      [-6, 6, 1.1], [7, -5, 1.2], [-3, -8, 1.0],
    ],
    bushes: [
      [-5, 4, 1.1], [6, -4, 1.0],
    ],
    rocks: [
      [-10, 8, 1.6, 0.7], [9, -7, 1.5, 2.0],
    ],
    settlement: {
      type: 'colonial-fort',
      x: 2,
      z: -3,
      rotationY: -1.2,
      terraceElevation: 2.0,
      terraceRadius: 18,
    },
  },
  // 5. Lime Cay - Small outer coral cay with pristine sandy shallows
  {
    id: 'lime-cay',
    name: 'Lime Cay',
    x: -220,
    z: 260,
    radius: 22,
    height: 7,
    sandRadius: 32,
    type: 'atoll',
    seed: 624,
    palms: [
      [-8, 6, 1.1], [8, -6, 1.1], [2, 10, 1.2], [-8, -7, 1.0],
      [9, 5, 1.1],
    ],
    bushes: [
      [-5, 4, 1.1], [6, -4, 1.0], [1, 7, 1.1],
    ],
    rocks: [
      [-12, 8, 1.3, 0.6], [11, -7, 1.2, 1.8],
    ],
  },
  // 6. Apostles Battery - Medium fortified island commanding the Northeast channel
  {
    id: 'apostles-battery',
    name: "Apostles' Battery",
    x: 280,
    z: -210,
    radius: 34,
    height: 16,
    sandRadius: 46,
    type: 'verdant-hills',
    seed: 755,
    palms: [
      [-16, 10, 1.2], [18, -11, 1.1], [-8, 18, 1.1], [19, 11, 1.0],
      [6, -20, 1.2],
    ],
    bushes: [
      [-10, 6, 1.2], [11, -8, 1.1], [-3, 12, 1.3],
    ],
    jungleTrees: [
      [-8, 3, 1.3], [9, -5, 1.2],
    ],
    rocks: [
      [-22, 12, 1.9, 0.4], [20, -12, 1.8, 1.5],
    ],
  },
  // 7. Morgan's Shoal - Dangerous shallow sandbank in the Western approach
  {
    id: 'morgans-shoal',
    name: "Morgan's Shoal",
    x: -330,
    z: 80,
    radius: 26,
    height: 9,
    sandRadius: 38,
    type: 'atoll',
    seed: 219,
    palms: [
      [-8, 6, 1.1], [9, -5, 1.0], [1, 10, 1.2], [-9, -6, 1.0],
    ],
    bushes: [
      [-5, 3, 1.1], [6, -3, 1.0],
    ],
    rocks: [
      [-12, 9, 1.4, 0.9], [11, -8, 1.3, 2.2],
    ],
  },
  // 8. Pelican Cays - Small outer bird sanctuary cay
  {
    id: 'pelican-cays',
    name: 'Pelican Cays',
    x: 320,
    z: 140,
    radius: 18,
    height: 6,
    sandRadius: 26,
    type: 'atoll',
    seed: 512,
    palms: [
      [-6, 5, 1.1], [7, -6, 1.1], [-3, -8, 1.2],
    ],
    bushes: [
      [-4, 4, 1.1], [5, -4, 1.0],
    ],
    rocks: [
      [-9, 7, 1.4, 0.7], [8, -6, 1.3, 1.8],
    ],
  },
];

export const KINGSTON_WRECKS: ShipwreckDefinition[] = [
  {
    id: 'wreck-hms-vanguard',
    name: 'HMS Vanguard (74-Gun)',
    x: -110,
    z: -120,
    radius: 14,
    heading: 0.82,
    roll: 0.35,
    pitch: -0.22,
    seed: 301,
  },
  {
    id: 'wreck-port-royal-hulk',
    name: 'Port Royal Sunken Galleon',
    x: 100,
    z: -160,
    radius: 13,
    heading: -1.8,
    roll: -0.45,
    pitch: 0.18,
    seed: 412,
  },
  {
    id: 'wreck-golden-hind',
    name: 'Golden Hind Raider',
    x: -40,
    z: 210,
    radius: 12,
    heading: 2.3,
    roll: 0.4,
    pitch: 0.1,
    seed: 523,
  },
];

export const kingstonMap: MapDefinition = {
  id: 'kingston',
  name: 'Kingston Straits',
  englishName: 'Kingston Waters & Port Royal',
  subtitle: 'Port Royal Citadel • Fortified Sound',
  description:
    'Heavily fortified British naval stronghold. Features the sweeping Palisadoes sandspit, Port Royal colonial harbor city, and narrow tactical straits.',
  tacticalTag: 'FORTIFIED PASSAGE',
  badgeColor: 'cyan',
  radius: 500,
  islands: KINGSTON_ISLANDS,
  shipwrecks: KINGSTON_WRECKS,
  water: {
    deepWaterColor: '#032b5e',
    midWaterColor: '#04568f',
    shallowColor: '#0284c7',
    lagoonColor: '#0d9488',
    crestGlowColor: '#38bdf8',
    subsurfaceColor: '#06b6d4',
    foamColor: '#e0f2fe',
  },
  atmosphere: {
    fogColorDay: '#6ba3c7',
    fogColorNight: '#091b35',
    skyTopDay: '#0369a1',
    skyMidDay: '#38bdf8',
    skyHorizonDay: '#6ba3c7',
    skyTopNight: '#040d1a',
    skyMidNight: '#0b1d3a',
    skyHorizonNight: '#091b35',
    sunColorDay: '#fef3c7',
    moonColorNight: '#bfdbfe',
    ambientDay: '#e0f2fe',
    ambientNight: '#334e68',
    hemiSkyDay: '#38bdf8',
    hemiGroundDay: '#0c4a6e',
    hemiSkyNight: '#1e3a5f',
    hemiGroundNight: '#0f172a',
  },
};

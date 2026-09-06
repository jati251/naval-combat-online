import type { MapDefinition } from './types';
import type { IslandDefinition } from '../components/3d/islands/types';
import type { ShipwreckDefinition } from '../components/3d/Shipwrecks3D';

export const NUSANTARA_ISLANDS: IslandDefinition[] = [
  // 1. Gunung Api - Towering active volcanic peak with lava-scorched flanks
  {
    id: 'gunung-api',
    name: 'Gunung Api',
    x: -100,
    z: -80,
    radius: 58,
    height: 52,
    sandRadius: 72,
    type: 'volcanic',
    seed: 937,
    palms: [
      [-20, 18, 1.4], [18, -16, 1.3], [-10, 28, 1.5], [24, 12, 1.2],
      [8, -28, 1.3], [-24, -10, 1.2], [14, 22, 1.4], [-28, 6, 1.3],
      [26, -10, 1.4], [-12, -26, 1.3],
    ],
    bushes: [
      [-14, 12, 1.3], [12, -10, 1.2], [-6, 20, 1.4], [18, 8, 1.1],
      [4, -20, 1.3], [-18, -4, 1.2],
    ],
    jungleTrees: [
      [-12, 8, 1.7], [10, -10, 1.8], [0, 16, 1.6], [-8, -12, 1.7],
      [8, 10, 1.5], [-16, 2, 1.8], [16, -6, 1.7], [0, -20, 1.9],
      [12, 14, 1.6], [-20, -8, 1.8],
    ],
    rocks: [
      [-38, 24, 2.8, 0.5], [34, -20, 2.6, 1.7], [-28, -32, 3.0, 2.8],
      [40, 14, 2.4, 0.3], [0, 38, 2.7, 1.9], [-44, -6, 3.2, 1.1],
    ],
  },
  // 2. Pulau Komodo - Large dense jungle island with dramatic coastline
  {
    id: 'pulau-komodo',
    name: 'Pulau Komodo',
    x: 260,
    z: -160,
    radius: 72,
    height: 24,
    sandRadius: 92,
    type: 'dense-jungle',
    seed: 648,
    palms: [
      [-24, 16, 1.4], [22, -18, 1.3], [-14, 26, 1.5], [26, 14, 1.2],
      [10, -28, 1.3], [-26, -8, 1.2], [16, 24, 1.4], [-30, 8, 1.3],
      [30, -12, 1.4], [-14, -30, 1.3], [34, 8, 1.2], [-8, 34, 1.3],
      [20, -34, 1.4], [-34, -14, 1.2], [0, -38, 1.3], [0, 38, 1.4],
      [-40, 0, 1.3], [38, 18, 1.2], [-18, 38, 1.3], [28, -28, 1.4],
    ],
    bushes: [
      [-16, 10, 1.4], [14, -8, 1.3], [-6, 18, 1.5], [18, 10, 1.2],
      [6, -18, 1.4], [-18, -4, 1.3], [-24, 12, 1.3], [22, -14, 1.4],
      [-10, -22, 1.3], [16, 18, 1.2],
    ],
    jungleTrees: [
      [-14, 6, 1.8], [12, -10, 1.9], [2, 12, 1.7], [-8, -12, 1.8],
      [10, 8, 1.6], [-18, 0, 1.9], [18, -8, 1.8], [0, -18, 2.0],
      [14, 14, 1.7], [-22, -10, 1.9], [8, -22, 1.8], [-12, 18, 1.7],
      [22, -16, 1.8], [-6, 24, 1.7], [16, -24, 1.9], [-20, -18, 1.8],
      [20, 20, 1.7], [0, 20, 1.9], [-28, -6, 1.7], [28, 10, 1.8],
    ],
    rocks: [
      [-36, 20, 2.0, 0.8], [32, -18, 1.8, 2.0], [-24, -26, 2.2, 1.4],
      [38, 10, 1.6, 0.5],
    ],
  },
  // 3. Kepulauan Seribu - Thousand islands-style coral atoll cluster
  {
    id: 'kepulauan-seribu',
    name: 'Kepulauan Seribu',
    x: -300,
    z: 140,
    radius: 40,
    height: 8,
    sandRadius: 58,
    type: 'atoll',
    seed: 512,
    palms: [
      [-14, 10, 1.3], [12, -8, 1.2], [2, 16, 1.4], [-12, -10, 1.1],
      [14, 6, 1.3], [-6, -14, 1.2], [8, 12, 1.3], [-16, 4, 1.2],
    ],
    bushes: [
      [-10, 6, 1.2], [8, -4, 1.1], [0, 12, 1.3], [-8, -6, 1.2],
    ],
    jungleTrees: [
      [-6, 4, 1.3], [6, -4, 1.2], [0, 8, 1.4],
    ],
    rocks: [
      [-20, 14, 1.6, 0.6], [18, -12, 1.4, 1.9], [-14, -18, 1.8, 1.3],
    ],
  },
  // 4. Nusa Penida Cliffs - Dramatic sheer limestone sea cliffs
  {
    id: 'nusa-penida',
    name: 'Nusa Penida Cliffs',
    x: 80,
    z: 240,
    radius: 50,
    height: 40,
    sandRadius: 64,
    type: 'volcanic',
    seed: 823,
    palms: [
      [-18, 14, 1.4], [16, -12, 1.3], [-8, 22, 1.5], [20, 10, 1.2],
      [6, -22, 1.3], [-20, -6, 1.2], [12, 18, 1.4], [-14, -16, 1.3],
    ],
    bushes: [
      [-12, 8, 1.3], [10, -6, 1.2], [-4, 14, 1.4], [14, 6, 1.1],
      [-14, -2, 1.3], [8, 12, 1.2],
    ],
    jungleTrees: [
      [-10, 6, 1.6], [8, -8, 1.7], [0, 12, 1.5], [-6, -10, 1.6],
      [6, 8, 1.4], [-14, 0, 1.7], [14, -4, 1.6], [0, -14, 1.8],
    ],
    rocks: [
      [-32, 20, 2.8, 0.6], [28, -18, 2.6, 1.8], [-22, -24, 3.0, 2.6],
      [34, 12, 2.4, 0.3], [0, 32, 2.7, 1.5],
    ],
  },
  // 5. Karimunjawa Reef - Shallow coral reef island with white sand
  {
    id: 'karimunjawa-reef',
    name: 'Karimunjawa Reef',
    x: -180,
    z: -260,
    radius: 32,
    height: 10,
    sandRadius: 48,
    type: 'atoll',
    seed: 295,
    palms: [
      [-10, 8, 1.3], [10, -6, 1.2], [2, 12, 1.4], [-10, -8, 1.1],
      [12, 4, 1.3],
    ],
    bushes: [
      [-6, 4, 1.2], [6, -4, 1.1], [0, 8, 1.3],
    ],
    jungleTrees: [
      [-4, 2, 1.3], [4, -2, 1.2],
    ],
    rocks: [
      [-16, 10, 1.5, 0.7], [14, -8, 1.4, 1.9], [-10, -12, 1.6, 1.2],
    ],
  },
  // 6. Anak Krakatau - Young volcanic island, still smoking
  {
    id: 'anak-krakatau',
    name: 'Anak Krakatau',
    x: 160,
    z: -40,
    radius: 36,
    height: 46,
    sandRadius: 48,
    type: 'volcanic',
    seed: 741,
    palms: [
      [-10, 8, 1.2], [8, -6, 1.1], [-4, -10, 1.3],
    ],
    bushes: [
      [-6, 4, 1.1], [6, -4, 1.0],
    ],
    jungleTrees: [],
    rocks: [
      [-24, 16, 3.0, 0.5], [20, -14, 2.8, 1.8], [-16, -20, 3.2, 2.7],
      [26, 10, 2.6, 0.3], [0, 24, 2.9, 1.6], [-28, -4, 3.4, 1.0],
    ],
  },
  // 7. Raja Ampat Atoll - Pristine tropical lagoon atoll
  {
    id: 'raja-ampat',
    name: 'Raja Ampat Atoll',
    x: -60,
    z: 320,
    radius: 30,
    height: 9,
    sandRadius: 44,
    type: 'atoll',
    seed: 466,
    palms: [
      [-12, 8, 1.4], [10, -6, 1.3], [2, 14, 1.5], [-10, -8, 1.2],
      [12, 6, 1.4], [-6, -12, 1.3],
    ],
    bushes: [
      [-8, 4, 1.3], [6, -4, 1.2], [0, 10, 1.4], [-6, -4, 1.3],
    ],
    jungleTrees: [
      [-4, 2, 1.4], [4, -2, 1.3], [0, 6, 1.5],
    ],
    rocks: [
      [-16, 10, 1.4, 0.6], [14, -8, 1.3, 1.8], [-10, -12, 1.5, 1.3],
    ],
  },
  // 8. Pulau Tidore - Historic spice island with lush jungle hillside
  {
    id: 'pulau-tidore',
    name: 'Pulau Tidore',
    x: 320,
    z: 180,
    radius: 44,
    height: 30,
    sandRadius: 58,
    type: 'dense-jungle',
    seed: 583,
    palms: [
      [-16, 12, 1.4], [14, -10, 1.3], [-6, 20, 1.5], [18, 8, 1.2],
      [4, -18, 1.3], [-18, -4, 1.2], [10, 16, 1.4], [-20, 6, 1.3],
      [20, -8, 1.4], [-8, -20, 1.3],
    ],
    bushes: [
      [-12, 8, 1.3], [10, -6, 1.2], [-4, 14, 1.4], [14, 6, 1.1],
      [-14, -2, 1.3], [8, 12, 1.2],
    ],
    jungleTrees: [
      [-10, 4, 1.7], [8, -8, 1.8], [0, 10, 1.6], [-6, -8, 1.7],
      [6, 6, 1.5], [-14, 0, 1.8], [14, -4, 1.7], [0, -14, 1.9],
      [10, 10, 1.6], [-18, -6, 1.8], [4, -16, 1.7], [-8, 14, 1.6],
    ],
    rocks: [
      [-28, 18, 2.2, 0.6], [24, -16, 2.0, 1.7], [-20, -22, 2.4, 2.5],
      [30, 10, 1.8, 0.4],
    ],
    settlement: {
      type: 'mayan-temple',
      x: -2,
      z: 8,
      rotationY: 0.6,
      terraceElevation: 10.0,
      terraceRadius: 28,
    },
  },
];

export const NUSANTARA_WRECKS: ShipwreckDefinition[] = [
  {
    id: 'wreck-flor-de-la-mar',
    name: 'Flor de la Mar Carrack',
    x: -40,
    z: -180,
    radius: 14,
    heading: 0.9,
    roll: 0.42,
    pitch: -0.18,
    seed: 215,
  },
  {
    id: 'wreck-dutch-voc',
    name: 'VOC Batavia Merchantman',
    x: 200,
    z: 80,
    radius: 13,
    heading: -1.6,
    roll: -0.38,
    pitch: 0.2,
    seed: 339,
  },
  {
    id: 'wreck-jong-junk',
    name: 'Majapahit Jong War Junk',
    x: -120,
    z: 220,
    radius: 11,
    heading: 2.1,
    roll: 0.48,
    pitch: 0.1,
    seed: 487,
  },
];

export const nusantaraMap: MapDefinition = {
  id: 'nusantara',
  name: 'Nusantara',
  englishName: 'Nusantara — Indonesian Archipelago',
  subtitle: 'Volcanic Peaks • Spice Islands & Ancient Kingdoms',
  description:
    'Warm tropical waters of the Indonesian archipelago, flanked by smoking volcanic peaks, dense equatorial jungles, and pristine coral atolls. The historic crossroads of ancient maritime trade routes.',
  tacticalTag: 'VOLCANIC PASSAGE',
  badgeColor: 'rose',
  radius: 500,
  islands: NUSANTARA_ISLANDS,
  shipwrecks: NUSANTARA_WRECKS,
  water: {
    deepWaterColor: '#064040',
    midWaterColor: '#0a7070',
    shallowColor: '#14a89c',
    lagoonColor: '#2dd4a8',
    crestGlowColor: '#6ee8c4',
    subsurfaceColor: '#1ac0a0',
    foamColor: '#ecfdf5',
  },
  atmosphere: {
    fogColorDay: '#8accc4',
    fogColorNight: '#082420',
    skyTopDay: '#0a6060',
    skyMidDay: '#18b0a0',
    skyHorizonDay: '#8accc4',
    skyTopNight: '#041414',
    skyMidNight: '#082828',
    skyHorizonNight: '#082420',
    sunColorDay: '#fff0c8',
    moonColorNight: '#a0e8d8',
    ambientDay: '#c4f0e8',
    ambientNight: '#1a4840',
    hemiSkyDay: '#30c0a8',
    hemiGroundDay: '#043830',
    hemiSkyNight: '#145848',
    hemiGroundNight: '#042820',
  },
};

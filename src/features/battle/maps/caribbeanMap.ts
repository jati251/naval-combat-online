import type { MapDefinition } from './types';
import { ARENA_ISLANDS } from '../components/3d/islands/islandsData';
import { ARENA_SHIPWRECKS } from '../components/3d/Shipwrecks3D';

export const caribbeanMap: MapDefinition = {
  id: 'caribbean',
  name: 'Caribbean Archipelago',
  englishName: 'Caribbean Archipelago',
  subtitle: 'Pirate Haven • Open Tropical Atolls',
  description:
    'Legendary open waters in the heart of the Caribbean with verdant hills, golden sands, and smuggler coves.',
  tacticalTag: 'OPEN ENGAGEMENT',
  badgeColor: 'amber',
  radius: 500,
  islands: ARENA_ISLANDS,
  shipwrecks: ARENA_SHIPWRECKS,
  water: {
    deepWaterColor: '#014f86',
    midWaterColor: '#0077b6',
    shallowColor: '#0096c7',
    lagoonColor: '#059669',
    crestGlowColor: '#00b4d8',
    subsurfaceColor: '#00e5ff',
    foamColor: '#ffffff',
  },
  atmosphere: {
    fogColorDay: '#70b2db',
    fogColorNight: '#0d2444',
    skyTopDay: '#0284c7',
    skyMidDay: '#38bdf8',
    skyHorizonDay: '#70b2db',
    skyTopNight: '#050d1e',
    skyMidNight: '#0d2042',
    skyHorizonNight: '#0d2444',
    sunColorDay: '#fffbeb',
    moonColorNight: '#d8e8ff',
    ambientDay: '#dbeafe',
    ambientNight: '#466694',
    hemiSkyDay: '#60a5fa',
    hemiGroundDay: '#0369a1',
    hemiSkyNight: '#355687',
    hemiGroundNight: '#132847',
  },
};

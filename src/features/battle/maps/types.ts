import type { IslandDefinition } from '../components/3d/islands/types';
import type { ShipwreckDefinition } from '../components/3d/Shipwrecks3D';
import type { MapId } from '@/types/room';

export type { MapId };

export interface WaterPalette {
  deepWaterColor: string;
  midWaterColor: string;
  shallowColor: string;
  lagoonColor: string;
  crestGlowColor: string;
  subsurfaceColor: string;
  foamColor: string;
}

export interface AtmospherePalette {
  fogColorDay: string;
  fogColorNight: string;
  skyTopDay: string;
  skyMidDay: string;
  skyHorizonDay: string;
  skyTopNight: string;
  skyMidNight: string;
  skyHorizonNight: string;
  sunColorDay: string;
  moonColorNight: string;
  ambientDay: string;
  ambientNight: string;
  hemiSkyDay: string;
  hemiGroundDay: string;
  hemiSkyNight: string;
  hemiGroundNight: string;
}

export interface MapDefinition {
  id: MapId;
  name: string;
  englishName: string;
  subtitle: string;
  description: string;
  tacticalTag: string;
  badgeColor: 'amber' | 'cyan' | 'emerald';
  radius: number;
  islands: IslandDefinition[];
  shipwrecks: ShipwreckDefinition[];
  water: WaterPalette;
  atmosphere: AtmospherePalette;
}

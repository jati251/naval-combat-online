import type { MapId, MapDefinition } from './types';
import { caribbeanMap } from './caribbeanMap';
import { kingstonMap } from './kingstonMap';
import { mexicoMap } from './mexicoMap';
import { englishChannelMap } from './englishChannelMap';
import { greeceMap } from './greeceMap';
import { nusantaraMap } from './nusantaraMap';

export * from './types';
export { caribbeanMap } from './caribbeanMap';
export { kingstonMap } from './kingstonMap';
export { mexicoMap } from './mexicoMap';
export { englishChannelMap } from './englishChannelMap';
export { greeceMap } from './greeceMap';
export { nusantaraMap } from './nusantaraMap';

export const DEFAULT_MAP_ID: MapId = 'caribbean';

export const MAP_REGISTRY: Record<MapId, MapDefinition> = {
  caribbean: caribbeanMap,
  kingston: kingstonMap,
  mexico: mexicoMap,
  'english-channel': englishChannelMap,
  greece: greeceMap,
  nusantara: nusantaraMap,
};

export const MAP_LIST: MapDefinition[] = [
  caribbeanMap,
  kingstonMap,
  mexicoMap,
  englishChannelMap,
  greeceMap,
  nusantaraMap,
];

export function getMapConfig(mapId?: MapId): MapDefinition {
  if (mapId && MAP_REGISTRY[mapId]) {
    return MAP_REGISTRY[mapId];
  }
  return MAP_REGISTRY[DEFAULT_MAP_ID];
}


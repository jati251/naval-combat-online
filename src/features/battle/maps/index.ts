import type { MapId, MapDefinition } from './types';
import { caribbeanMap } from './caribbeanMap';
import { kingstonMap } from './kingstonMap';
import { mexicoMap } from './mexicoMap';

export * from './types';
export { caribbeanMap } from './caribbeanMap';
export { kingstonMap } from './kingstonMap';
export { mexicoMap } from './mexicoMap';

export const DEFAULT_MAP_ID: MapId = 'caribbean';

export const MAP_REGISTRY: Record<MapId, MapDefinition> = {
  caribbean: caribbeanMap,
  kingston: kingstonMap,
  mexico: mexicoMap,
};

export const MAP_LIST: MapDefinition[] = [caribbeanMap, kingstonMap, mexicoMap];

export function getMapConfig(mapId?: MapId): MapDefinition {
  if (mapId && MAP_REGISTRY[mapId]) {
    return MAP_REGISTRY[mapId];
  }
  return MAP_REGISTRY[DEFAULT_MAP_ID];
}

import React, { useMemo, useEffect } from 'react';
import { type IslandDefinition, ARENA_ISLANDS, IslandEntity, type IslandMaterials } from './islands';
import { constructionMaterial } from './textures/constructionMaterials';
import { useGameStore } from '@/stores/useGameStore';
import { getMapConfig } from '../../maps';

export type { IslandDefinition };
export { ARENA_ISLANDS };

export const Islands3D: React.FC<{ isMobile?: boolean }> = React.memo(({ isMobile = false }) => {
  const currentMapId = useGameStore((s) => s.currentMapId || s.currentRoom?.mapId || 'caribbean');
  const activeMap = useMemo(() => getMapConfig(currentMapId), [currentMapId]);
  const materials: IslandMaterials = useMemo(() => {
    const rock = constructionMaterial('rock', '#ffffff', 8);
    rock.vertexColors = true;
    rock.bumpScale = 0.12;
    return { rock };
  }, []);
  useEffect(() => () => materials.rock.dispose(), [materials]);

  return <group>{activeMap.islands.map(island =>
    <IslandEntity key={island.id} island={island} materials={materials} isMobile={isMobile} />
  )}</group>;
});

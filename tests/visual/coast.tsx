import * as THREE from 'three';
import { Environment3D } from '../../src/features/battle/components/3d/Environment3D';
import { NavalPostProcessing } from '../../src/features/battle/components/3d/rendering/NavalPostProcessing';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { OceanWater } from '../../src/features/battle/components/3d/OceanWater';
import { Islands3D } from '../../src/features/battle/components/3d/Islands3D';
import { getTerrainSurfaceY } from '../../src/features/battle/components/3d/islands/islandGeometries';
import { getMapConfig, type MapId } from '../../src/features/battle/maps';
import { GRAPHIC_PROFILES } from '../../src/features/settings/config/graphicProfiles';
import { useGameStore } from '../../src/stores/useGameStore';

const params = new URLSearchParams(location.search);
const map = getMapConfig(params.get('map') as MapId);
const island = map.islands[Number(params.get('island') ?? 0)] ?? map.islands[0];
const night = params.get('night') === '1';
const profile = GRAPHIC_PROFILES[params.get('quality') as keyof typeof GRAPHIC_PROFILES] ?? GRAPHIC_PROFILES.balanced;
useGameStore.setState({ currentMapId: map.id, timeOfDay: night ? 'NIGHT' : 'DAY' });
const angle = island.elongation?.angle ?? 0, c = Math.cos(angle), s = Math.sin(angle);
let edge = island.radius * (island.elongation?.scaleX ?? 1) * 0.5;
while (getTerrainSurfaceY(island, edge, 0) > -0.25 && edge < 600) edge += 0.25;
const target: [number,number,number] = [island.x + c*edge, 0, island.z - s*edge];
const camera: [number,number,number] = [target[0]+c*30+s*25, 10, target[2]-s*30+c*25];
if (params.has('storm')) {
  camera[0] = Number(params.get('storm')) || 780;
  camera[1] = 8;
  camera[2] = 0;
  target[0] = camera[0] + 80;
  target[1] = 10;
  target[2] = 40;
}
function CameraMotion() {
  useFrame(({camera: activeCamera, clock}) => {
    activeCamera.position.set(camera[0] + Math.sin(clock.elapsedTime * 0.6) * 12, camera[1], camera[2] + Math.cos(clock.elapsedTime * 0.6) * 12);
  }, -1);
  return null;
}
function Stats() {
  let frames=0, seconds=0;
  useFrame(({gl}) => { gl.info.autoReset = false; gl.info.reset(); }, -100);
  useFrame(({gl}, delta) => {
    frames++; seconds+=delta;
    if (seconds<2) return;
    const out=document.querySelector('output');
    if(out) out.textContent=`${map.id} · ${island.name} · ${profile.id} · ${(frames/seconds).toFixed(1)} FPS · ${gl.info.render.calls} draws · ${gl.info.render.triangles} triangles · ${gl.info.memory.textures} textures`;
    frames=seconds=0;
  }, 2);
  return null;
}
const root = createRoot(document.getElementById('root')!);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
root.render(<>
  <Canvas camera={{position:camera,fov:48,near:0.2,far:1800}} gl={{toneMapping:THREE.NoToneMapping}} dpr={1} shadows={profile.shadows}>
    <Environment3D profile={profile} />
    <Islands3D isMobile={profile.id==='fast'} profile={profile} />
    <OceanWater profile={profile} />
    <OrbitControls target={target} />
    {params.has('motion') && <CameraMotion />}
    <Stats />
    <NavalPostProcessing profile={profile} isNight={night} />
  </Canvas><output>Preparing coastline…</output>
</>);

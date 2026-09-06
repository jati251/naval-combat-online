import { MAP_LIST } from '../../src/features/battle/maps';
import { IslandEntity } from '../../src/features/battle/components/3d/islands/IslandEntity';
import type { IslandDefinition, IslandSettlement } from '../../src/features/battle/components/3d/islands/types';
import React, { useMemo, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ShipModel3D } from '../../src/features/battle/components/3d/ShipModel3D';
import { SHIP_PRESETS, type ShipClass } from '../../src/types/game';
import { createIslandTerrainGeometry } from '../../src/features/battle/components/3d/islands/islandGeometries';
import { constructionMaterial } from '../../src/features/battle/components/3d/textures/constructionMaterials';
import { CoastalSettlement } from '../../src/features/battle/components/3d/islands/CoastalSettlement';
import { KingstonCity } from '../../src/features/battle/components/3d/islands/KingstonCity';
import { MayanPyramid } from '../../src/features/battle/components/3d/islands/MayanPyramid';
import { SeaArch } from '../../src/features/battle/components/3d/islands/SeaArch';
import { MaritimeCargo } from '../../src/features/battle/components/3d/props/MaritimeCargo';

const terrains = ['verdant-hills', 'dense-jungle', 'volcanic', 'sea-stack', 'atoll', 'lush-flat'];
const places = ['pirate-haven', 'colonial-fort', 'kingston-city', 'mayan-temple', 'sea-arch'];
function Terrain({ type }: { type: IslandDefinition['type'] }) {
  const height = type === 'atoll' ? 7 : type === 'lush-flat' ? 10 : 38;
  const geometry = useMemo(() => createIslandTerrainGeometry({ id: type, name: type, x: 0, z: 0, palms: [], bushes: [], rocks: [], radius: 55, sandRadius: 65, height, type, seed: 17 }), [type]);
  const material = useMemo(() => Object.assign(constructionMaterial('rock', '#ffffff', 8), { vertexColors: true, bumpScale: 0.12 }), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={geometry} material={material} position={[0, height / 2, 0]} castShadow receiveShadow />;
}
const islands = MAP_LIST.flatMap(map => map.islands);
function PopulatedIsland({ island }: { island: IslandDefinition }) {
  const materials = useMemo(() => ({ rock: Object.assign(constructionMaterial('rock', '#ffffff', 8), { vertexColors: true, bumpScale: 0.12 }) }), []);
  const centered = useMemo(() => ({ ...island, x: 0, z: 0 }), [island]);
  useEffect(() => () => materials.rock.dispose(), [materials]);
  return <IslandEntity island={centered} materials={materials} />;
}
export function Review() {
  const [kind, setKind] = useState('ships');
  const [asset, setAsset] = useState('brig');
  const list = kind === 'ships' ? Object.keys(SHIP_PRESETS) : kind === 'terrain' ? terrains : kind === 'cargo' ? ['cargo'] : kind === 'islands' ? islands.map(i => i.id) : places;
  const changeKind = (event: React.ChangeEvent<HTMLSelectElement>) => { const value = event.target.value; setKind(value); setAsset(value === 'ships' ? 'brig' : value === 'terrain' ? terrains[0] : value === 'cargo' ? 'cargo' : value === 'islands' ? islands[0].id : places[0]); };
  const settlement: IslandSettlement = { type: asset as IslandSettlement['type'], x: 0, z: 0, rotationY: 0 };
  const Place = asset === 'kingston-city' ? KingstonCity : asset === 'mayan-temple' ? MayanPyramid : asset === 'sea-arch' ? SeaArch : CoastalSettlement;
  const selectedIsland = islands.find(i => i.id === asset) ?? islands[0];
  const distance = kind === 'islands' ? selectedIsland.radius * Math.max(selectedIsland.elongation?.scaleX ?? 1, selectedIsland.elongation?.scaleZ ?? 1) * 2.8 : kind === 'ships' ? SHIP_PRESETS[asset as ShipClass]?.length * 2.1 : kind === 'terrain' ? 140 : kind === 'cargo' ? 4 : 78;
  const targetY = kind === 'ships' ? SHIP_PRESETS[asset as ShipClass]?.length * 0.35 : kind === 'terrain' ? 5 : kind === 'cargo' ? 0.5 : 8;
  return <><header><strong>Naval asset review</strong><label>Category <select value={kind} onChange={changeKind}>{['ships','terrain','places','cargo','islands'].map(x => <option key={x}>{x}</option>)}</select></label><label>Asset <select value={asset} onChange={e => setAsset(e.target.value)}>{list.map(x => <option key={x}>{x}</option>)}</select></label><span>Drag to orbit · Scroll to zoom</span></header>
    <Canvas key={kind + asset} shadows camera={{ position: [distance * 0.85, distance * 0.48, distance], fov: 40 }} dpr={[1, 1.5]}>
      <color attach="background" args={['#a6bdc4']} />
      <hemisphereLight args={['#eff5f3', '#70614b', 2]} />
      <directionalLight position={[45, 80, 35]} intensity={3} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-90} shadow-camera-right={90} shadow-camera-top={90} shadow-camera-bottom={-90} shadow-camera-far={240} shadow-normalBias={0.08} />
      {kind === 'ships' ? <ShipModel3D shipClass={asset as ShipClass} sailState="FULL_SAIL" /> : kind === 'terrain' ? <Terrain type={asset as IslandDefinition['type']} /> : kind === 'islands' ? <PopulatedIsland island={selectedIsland} /> : kind === 'cargo' ? <MaritimeCargo placements={[{position:[-0.7,0,0]},{position:[0.6,0,0]}]} /> : <Place settlement={settlement} />}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,kind === 'ships' ? -0.4 : kind === 'places' || kind === 'cargo' ? -0.03 : 0,0]} receiveShadow><planeGeometry args={[1500,1500]} /><meshStandardMaterial color={kind === 'cargo' || kind === 'places' ? '#ae9b75' : '#477f8b'} roughness={0.7} /></mesh>
      <OrbitControls target={[0,targetY,0]} />
    </Canvas></>;
}

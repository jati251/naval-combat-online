import { memo, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { StaticInstances, type InstanceTransform } from '../shared/StaticInstances';
import { getTerrainSurfaceY } from './islandGeometries';
import type { IslandDefinition } from './types';

const log = new THREE.CylinderGeometry(0.07, 0.16, 2.4, 7).rotateZ(Math.PI / 2);
const grassParts: THREE.BufferGeometry[] = [];
for (let i = 0; i < 9; i++) {
  const a = i * 2.39996;
  const height = 0.38 + (i % 4) * 0.11;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-0.035,0,0, 0.035,0,0, Math.sin(a)*0.26,height,Math.cos(a)*0.26],3));
  g.computeVertexNormals(); grassParts.push(g);
}
const grass = mergeGeometries(grassParts)!;
grassParts.forEach(g => g.dispose());
const wood = new THREE.MeshStandardMaterial({color:'#8b806a',roughness:0.97});
const blades = new THREE.MeshStandardMaterial({color:'#777546',roughness:0.95,side:THREE.DoubleSide});

export const ShoreDetails = memo(function ShoreDetails({island,isMobile,quality='balanced'}: {island:IslandDefinition;isMobile:boolean;quality?:'fast'|'balanced'|'performance'}) {
  const placements = useMemo(() => {
    const logs: InstanceTransform[] = [], tufts: InstanceTransform[] = [];
    const sx = island.elongation?.scaleX ?? 1, sz = island.elongation?.scaleZ ?? 1;
    let seed = island.seed + 1729;
    const random = () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
    const budget = quality === 'fast' ? 100 : quality === 'performance' ? 520 : 300;
    for(let i=0;i<budget;i++) {
      const a=random()*Math.PI*2, r=island.sandRadius*(0.65+random()*0.55);
      const x=Math.cos(a)*r*sx,z=Math.sin(a)*r*sz,y=getTerrainSurfaceY(island,x,z);
      if(y<0.55 || y>3.1) continue;
      if(island.settlement && Math.hypot(x-island.settlement.x,z-island.settlement.z)<35) continue;
      const slope=Math.hypot(getTerrainSurfaceY(island,x+0.5,z)-y,getTerrainSurfaceY(island,x,z+0.5)-y);
      if(slope>0.28) continue;
      const rotation: [number,number,number]=[0,a+random(),0];
      if(y<1.6 && logs.length<(isMobile?5:12)) logs.push({position:[x,y+0.07,z],rotation,scale:[0.6+random(),1,1]});
      else if(y>1.35) tufts.push({position:[x,y-0.02,z],rotation,scale:[1,0.7+random()*0.7,1]});
    }
    return {logs,tufts};
  },[island,isMobile,quality]);
  return <>
    <StaticInstances geometry={log} material={wood} instances={placements.logs} castShadow={!isMobile} />
    <StaticInstances geometry={grass} material={blades} instances={placements.tufts} />
  </>;
});

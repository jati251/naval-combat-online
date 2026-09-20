import { performance } from 'node:perf_hooks';
import { getWaveHeight, getHullWaterPose } from '../../server/src/engine/WaveMath.js';
import { getTerrainSurfaceY } from '../../src/features/battle/components/3d/islands/islandGeometries.js';
import type { IslandDefinition } from '../../src/features/battle/components/3d/islands/types.js';
const island: IslandDefinition = { id:'bench', name:'bench', x:0,z:0,radius:50,sandRadius:65,height:35,seed:17,type:'verdant-hills',palms:[],bushes:[],rocks:[] };
let checksum = 0;
function bench(name: string, count: number, fn: (i: number) => number) {
  for (let i=0;i<5000;i++) checksum += fn(i);
  const samples: number[] = [];
  for (let run=0;run<7;run++) {
    const start=performance.now();
    for (let i=0;i<count;i++) checksum += fn(i);
    samples.push(performance.now()-start);
  }
  samples.sort((a,b)=>a-b);
  console.log(`${name}: ${samples[3].toFixed(2)} ms median / ${count} samples`);
}
bench('Terrain placement', 100000, i=>getTerrainSurfaceY(island, i%121-60, (i*17)%121-60));
bench('Wave surface', 100000, i=>getWaveHeight(i%900-450, (i*7)%900-450, i/60));
bench('Hull buoyancy', 10000, i=>getHullWaterPose(i%900-450, (i*7)%900-450, i%6,18,5.5,i/60).y);
console.log(`Checksum: ${checksum.toFixed(6)}`);

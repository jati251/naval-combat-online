import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCoastalHeightField, sampleCoastalHeight } from '../../src/features/battle/components/3d/islands/coastalHeightField';
import { getTerrainSurfaceY } from '../../src/features/battle/components/3d/islands/islandGeometries';
import type { IslandDefinition } from '../../src/features/battle/components/3d/islands/types';

const base: IslandDefinition = { id:'coast', name:'coast', x:130,z:-90,radius:50,sandRadius:62,height:35,seed:17,type:'verdant-hills',palms:[],bushes:[],rocks:[],elongation:{scaleX:1.8,scaleZ:0.7,angle:0.65} };
for (const type of ['volcanic','sea-stack','atoll','lush-flat','verdant-hills','dense-jungle'] as const) {
  test(`${type}: coastline texture matches rotated, stretched terrain and excludes dry land`, () => {
    const island = {...base,type};
    const field = createCoastalHeightField([island]);
    const a = island.elongation!.angle, cos = Math.cos(a), sin = Math.sin(a);
    let shoreSamples = 0;
    for (let x=-120;x<=120;x+=2) for (let z=-52;z<=52;z+=2) {
      const actual = getTerrainSurfaceY(island,x,z);
      const sampled = sampleCoastalHeight(field, island.x+cos*x+sin*z, island.z-sin*x+cos*z);
      if (Math.abs(actual)<0.75) {
        shoreSamples++;
        assert.ok(Math.abs(actual-sampled)<0.045, `shore error ${actual-sampled}`);
      }
      if (actual>0.1) assert.ok(sampled>0, 'dry terrain must mask ocean');
    }
    assert.ok(shoreSamples>50);
    assert.equal(field.data.byteLength, 2*1024*1024);
    assert.equal(sampleCoastalHeight(field, 9000,9000),-8);
  });
}
test('atoll lagoon remains water and arch openings are not masked', () => {
  const atoll = {...base,type:'atoll' as const};
  assert.ok(sampleCoastalHeight(createCoastalHeightField([atoll]),atoll.x,atoll.z)<0);
  const arch: IslandDefinition = {...base,settlement:{type:'sea-arch',x:0,z:0,rotationY:0}};
  assert.equal(sampleCoastalHeight(createCoastalHeightField([arch]),arch.x,arch.z),-8);
});
test('overlapping islands keep the highest surface, independent of ordering', () => {
  const high: IslandDefinition = {...base,settlement:{type:'colonial-fort',x:0,z:0,rotationY:0,terraceElevation:5}};
  const low = {...base,type:'atoll' as const};
  const a=createCoastalHeightField([high,low],256), b=createCoastalHeightField([low,high],256);
  assert.deepEqual(a.data,b.data);
  assert.ok(sampleCoastalHeight(a,base.x,base.z)>4.9);
});

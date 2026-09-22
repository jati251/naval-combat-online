import { memo, useMemo, useRef, useEffect, type RefObject } from 'react';
import * as THREE from 'three';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';
import { findShip } from '@/stores/selectors/shipLookup';
import { GERSTNER_WAVES } from '@/types';
import { getOceanTime } from '../../utils/oceanTime';
import { getOceanDetail } from './textures/oceanTextures';
import { stormMathGLSL } from './atmosphereShaders';
import { isSeaEntityInFrustum } from '../../utils/frustumCuller';

const waveHeightGLSL = GERSTNER_WAVES.map(w => {
  const k = 2 * Math.PI / w.wavelength;
  return `{ vec2 d = normalize(vec2(${w.direction[0].toFixed(8)},${w.direction[1].toFixed(8)}));
    float phase = ${k.toFixed(8)} * (dot(d,p) - ${w.speed.toFixed(8)} * uTime);
    delta += vec3(d.x*cos(phase),sin(phase),d.y*cos(phase)) * ${(w.steepness/k).toFixed(8)}; }`;
}).join('\n');

interface Props { shipId: string; shipLength?: number; shipWidth?: number; isEnemy?: boolean; isMobile?: boolean; hullRef?: RefObject<THREE.Group | null> }
export const ShipWakeSplash3D = memo(function ShipWakeSplash3D({shipId,shipLength=18,shipWidth=6,isEnemy=false,isMobile=false,hullRef}:Props) {
  const scene=useThree(s=>s.scene);
  const mesh=useRef<THREE.InstancedMesh>(null);
  const cursor=useRef(0), emission=useRef(0);
  const previous=useRef<{x:number;z:number}|null>(null);
  const count=isMobile?32:isEnemy?36:120;
  const particles=useMemo(()=>Array.from({length:count},()=>({x:0,z:0,heading:0,age:10,lifetime:4,width:1})),[count]);
  const geometry=useMemo(()=>{
    const g=new THREE.PlaneGeometry(1,1,2,2).rotateX(-Math.PI/2);
    g.setAttribute('wakeAlpha',new THREE.InstancedBufferAttribute(new Float32Array(count),1).setUsage(THREE.DynamicDrawUsage));
    return g;
  },[count]);
  const material=useMemo(()=>new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0},uDetail:{value:getOceanDetail()},uTint:{value:new THREE.Color('#bbc9c3')}},
    transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`uniform float uTime; attribute float wakeAlpha; varying float vAlpha; varying vec2 vUv;
      ${stormMathGLSL}
      vec3 wave(vec2 p) {vec3 delta=vec3(0.0); ${waveHeightGLSL} return delta*(1.0+stormAt(p)*1.8);}
      void main(){vUv=uv;vAlpha=wakeAlpha;vec4 world=modelMatrix*instanceMatrix*vec4(position,1.0);
        vec2 p=world.xz;for(int i=0;i<4;i++){vec3 d=wave(p);p=world.xz-d.xz;}
        world.y=wave(p).y+0.085;gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader:`uniform sampler2D uDetail;uniform vec3 uTint; varying float vAlpha;varying vec2 vUv;
      void main(){vec2 p=vUv*2.0-1.0;float edge=1.0-smoothstep(0.35,1.0,dot(p,p));
        float lace=texture2D(uDetail,vUv*0.43).b;float alpha=edge*vAlpha*0.32*(0.38+lace*0.62);
        if(alpha<0.005)discard;gl_FragColor=vec4(uTint,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }),[]);
  const transform=useMemo(()=>new THREE.Object3D(),[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useEffect(()=>()=>material.dispose(),[material]);
  useFrame((state,dt)=>{
    if(!mesh.current)return;
    const store=useGameStore.getState(),ship=findShip(store.ships,shipId);
    const delta=Math.min(dt,0.1);
    const x=hullRef?.current?.position.x??ship?.x??0,z=hullRef?.current?.position.z??ship?.z??0;
    const heading=hullRef?.current?.rotation.y??ship?.rotationY??0;
    const inFrustum = !isEnemy || isSeaEntityInFrustum(state.camera, x, z, shipLength * 0.75, 8, 20);
    const visible = !!ship && !ship.isSunk && inFrustum && Math.hypot(state.camera.position.x - x, state.camera.position.z - z) < (isEnemy ? 110 : 220);
    mesh.current.visible = visible;
    if(!visible || (previous.current&&Math.hypot(x-previous.current.x,z-previous.current.z)>30)) {
      particles.forEach(p=>p.age=p.lifetime);emission.current=0;previous.current=null;
      if(!visible)return;
    }
    material.uniforms.uTime.value=getOceanTime(store,state.clock.elapsedTime);
    material.uniforms.uTint.value.set(store.timeOfDay==='NIGHT'?'#485e6b':'#bbc9c3');
    const speed=Math.max(0,ship?.speed??0);
    emission.current+=speed>0.5?delta*Math.min(18,4+speed):0;
    const old=previous.current??{x,z};
    const emissions=Math.min(4,Math.floor(emission.current));
    emission.current-=emissions;
    for(let i=0;i<emissions;i++){
      const p=particles[cursor.current++%count],t=(i+1)/emissions;
      const side=(Math.random()-0.5)*shipWidth*0.45;
      p.x=THREE.MathUtils.lerp(old.x,x,t)-Math.sin(heading)*shipLength*0.48+Math.cos(heading)*side;
      p.z=THREE.MathUtils.lerp(old.z,z,t)-Math.cos(heading)*shipLength*0.48-Math.sin(heading)*side;
      p.heading=heading+(Math.random()-0.5)*0.5;p.age=0;p.lifetime=2.8+Math.random()*1.0;p.width=shipWidth*(0.12+Math.random()*0.10);
    }
    previous.current={x,z};
    const alpha=geometry.attributes.wakeAlpha as THREE.InstancedBufferAttribute;
    let active=0;
    for(const p of particles){
      p.age+=delta;if(p.age>=p.lifetime)continue;
      const life=p.age/p.lifetime;
      transform.position.set(p.x,0,p.z);transform.rotation.set(0,p.heading,0);
      transform.scale.set(p.width*(1+life*0.9),1,p.width*(1.1+life*0.8));transform.updateMatrix();
      mesh.current.setMatrixAt(active,transform.matrix);
      alpha.setX(active,Math.min(1,p.age/0.18)*(1-life)*(1-life)*0.42);active++;
    }
    mesh.current.count=active;mesh.current.instanceMatrix.needsUpdate=true;
    alpha.clearUpdateRanges();if(active)alpha.addUpdateRange(0,active);alpha.needsUpdate=true;
  },0);
  return createPortal(<instancedMesh ref={mesh} args={[geometry,material,count]} frustumCulled={false} />,scene);
});

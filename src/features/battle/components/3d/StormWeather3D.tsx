import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';
import { getLocalStorm, getLightning } from '../../utils/weather';
import { getOceanTime } from '../../utils/oceanTime';
import { navalAudio } from '../../services/navalAudio';

export function StormWeather3D({ isMobile }: { isMobile: boolean }) {
  const rain = useRef<THREE.LineSegments>(null);
  const bolt = useRef<THREE.Line>(null);
  const lastThunderCycle = useRef(-1);
  const rainGeometry = useMemo(() => {
    const count = isMobile ? 160 : 480;
    const positions = new Float32Array(count * 6);
    const ends = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const x = (Math.sin(i * 127.1) * 43758.54) % 1 * 42;
      const z = (Math.sin(i * 311.7) * 23421.63) % 1 * 42;
      const y = ((i * 17.31) % 44);
      positions.set([x,y,z,x,y,z], i*6);
      ends[i*2+1] = 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions,3));
    g.setAttribute('aEnd', new THREE.BufferAttribute(ends,1));
    return g;
  }, [isMobile]);
  const rainMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime:{value:0}, uStrength:{value:0}, uWind:{value:new THREE.Vector2(1,0)} },
    transparent:true, depthWrite:false,
    vertexShader:`attribute float aEnd; uniform float uTime; uniform vec2 uWind; varying float vAlpha;
      void main(){ vec3 p=position; p.y=mod(p.y-uTime*26.0,44.0)-14.0;
        p.xz=mod(p.xz+uWind*uTime*5.0+44.0,88.0)-44.0; p.xz+=uWind*aEnd*0.6; p.y-=aEnd*1.8;
        vAlpha=(1.0-aEnd*0.7)*max(0.0,1.0-length(p.xz)/55.0);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }`,
    fragmentShader:`uniform float uStrength; varying float vAlpha;
      void main(){gl_FragColor=vec4(0.45,0.55,0.61,vAlpha*uStrength*0.42);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }), []);
  const boltGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0,170,0),new THREE.Vector3(-5,143,2),new THREE.Vector3(3,119,0),
    new THREE.Vector3(-9,92,-1),new THREE.Vector3(-3,80,2),new THREE.Vector3(-16,49,0),
    new THREE.Vector3(-11,28,-3),new THREE.Vector3(-24,0,0),
  ]), []);
  const boltMaterial = useMemo(() => new THREE.LineBasicMaterial({color:'#b9d3f5',transparent:true,depthWrite:false,toneMapped:false}), []);
  const boltObject = useMemo(() => new THREE.Line(boltGeometry, boltMaterial), [boltGeometry, boltMaterial]);
  useEffect(() => () => rainGeometry.dispose(), [rainGeometry]);
  useEffect(() => () => rainMaterial.dispose(), [rainMaterial]);
  useEffect(() => () => boltGeometry.dispose(), [boltGeometry]);
  useEffect(() => () => boltMaterial.dispose(), [boltMaterial]);
  useFrame(({camera,clock}) => {
    const storm = getLocalStorm(camera.position.x,camera.position.z);
    const time = getOceanTime(useGameStore.getState(),clock.elapsedTime);
    const flash = getLightning(time,storm);
    if(rain.current) {
      rain.current.visible=storm>0.12;
      rain.current.position.copy(camera.position);
      rainMaterial.uniforms.uTime.value=time;
      rainMaterial.uniforms.uStrength.value=storm;
      const wind=useGameStore.getState().windAngle;
      rainMaterial.uniforms.uWind.value.set(Math.sin(wind),Math.cos(wind));
    }
    if(bolt.current) {
      bolt.current.visible=flash>0.02;
      const angle=Math.floor(time/13)*2.4;
      bolt.current.position.set(camera.position.x+Math.sin(angle)*220,0,camera.position.z+Math.cos(angle)*220);
      boltMaterial.opacity=flash;
    }
    const cycle=Math.floor(time/13);
    if(storm>0.28 && time%13>3 && time%13<4 && lastThunderCycle.current!==cycle) {
      lastThunderCycle.current=cycle;
      navalAudio.playThunder(storm);
    }
  });
  return <>
    <lineSegments ref={rain} geometry={rainGeometry} material={rainMaterial} frustumCulled={false} />
    <primitive ref={bolt} object={boltObject} frustumCulled={false} />
  </>;
}

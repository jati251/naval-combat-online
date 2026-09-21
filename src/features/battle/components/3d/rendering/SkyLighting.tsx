import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getLocalStorm } from '../../../utils/weather';

/** Bake diffuse sky bounce and roughness-filtered reflections once per time of day. */
export function SkyLighting({ isNight, enabled }: { isNight: boolean; enabled: boolean }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    if (!enabled) return;
    const previous = scene.environment;
    const previousIntensity = scene.environmentIntensity;
    const sky = new THREE.Scene();
    const geometry = new THREE.SphereGeometry(10, 32, 16);
    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        zenith: { value: new THREE.Color(isNight ? '#172a44' : '#86b6de') },
        horizon: { value: new THREE.Color(isNight ? '#3a4b62' : '#d7e1e3') },
        ground: { value: new THREE.Color(isNight ? '#080e14' : '#52615c') },
      },
      vertexShader: `varying vec3 direction;
        void main(){ direction=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 zenith, horizon, ground; varying vec3 direction;
        void main(){ vec3 d=normalize(direction);
          vec3 radiance=mix(horizon,zenith,pow(max(d.y,0.0),0.45));
          radiance=mix(radiance,ground,smoothstep(0.0,0.65,-d.y));
          gl_FragColor=vec4(radiance,1.0); }`,
    });
    sky.add(new THREE.Mesh(geometry, material));
    const generator = new THREE.PMREMGenerator(gl);
    const environment = generator.fromScene(sky, 0.04, 0.1, 30);
    scene.environment = environment.texture;
    generator.dispose(); geometry.dispose(); material.dispose();
    return () => {
      scene.environment = previous;
      scene.environmentIntensity = previousIntensity;
      environment.dispose();
    };
  }, [enabled, gl, scene, isNight]);
  useFrame(({ camera }, delta) => {
    if (!enabled) return;
    const storm = getLocalStorm(camera.position.x, camera.position.z);
    scene.environmentIntensity = THREE.MathUtils.damp(scene.environmentIntensity,
      (isNight ? 0.65 : 0.8) * (1 - storm * 0.65), 2, delta);
  });
  return null;
}

import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getLocalStorm } from '../../../utils/weather';
import type { AtmospherePalette } from '../../../maps/types';

/**
 * Bake diffuse sky bounce, Mie solar corona, and turquoise ocean bounce once per time of day / map.
 * Provides authentic AC4 Black Flag PBR reflections on wet ship decks, brass cannons, and hulls.
 */
export function SkyLighting({
  isNight,
  enabled,
  atmosphere,
  isMaxQuality = false,
}: {
  isNight: boolean;
  enabled: boolean;
  atmosphere?: AtmospherePalette;
  isMaxQuality?: boolean;
}) {
  const { gl, scene } = useThree();
  useEffect(() => {
    if (!enabled) return;
    const previous = scene.environment;
    const previousIntensity = scene.environmentIntensity;
    const sky = new THREE.Scene();
    const geometry = new THREE.SphereGeometry(10, isMaxQuality ? 48 : 32, isMaxQuality ? 24 : 16);

    const zenithHex = isNight
      ? (atmosphere?.skyTopNight ?? '#0a1628')
      : (atmosphere?.skyTopDay ?? '#1868ae');
    const horizonHex = isNight
      ? (atmosphere?.skyHorizonNight ?? '#1c2d47')
      : (atmosphere?.skyHorizonDay ?? '#d4eef9');
    const groundHex = isNight
      ? (atmosphere?.hemiGroundNight ?? '#030810')
      : (atmosphere?.hemiGroundDay ?? '#14585c');
    const sunHex = isNight
      ? (atmosphere?.moonColorNight ?? '#a8c6dd')
      : (atmosphere?.sunColorDay ?? '#fff5de');

    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        zenith: { value: new THREE.Color(zenithHex) },
        horizon: { value: new THREE.Color(horizonHex) },
        ground: { value: new THREE.Color(groundHex) },
        sunColor: { value: new THREE.Color(sunHex) },
        lightDir: { value: new THREE.Vector3(70, 140, -50).normalize() },
      },
      vertexShader: `varying vec3 direction;
        void main(){ direction=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 zenith, horizon, ground, sunColor, lightDir;
        varying vec3 direction;
        void main(){
          vec3 d = normalize(direction);
          vec3 radiance = mix(horizon, zenith, pow(max(d.y, 0.0), 0.45));
          // Directional solar/lunar Mie corona in IBL for warm specular rim on ships & brass
          float mu = max(0.0, dot(d, lightDir));
          radiance += sunColor * (pow(mu, 6.0) * 0.22 + pow(mu, 32.0) * 0.65);
          // Turquoise ocean surface bounce into lower hemisphere
          vec3 oceanBounce = mix(horizon * 0.48, ground, smoothstep(0.0, 0.55, -d.y));
          radiance = mix(radiance, oceanBounce, smoothstep(-0.02, 0.35, -d.y));
          gl_FragColor = vec4(radiance, 1.0);
        }`,
    });
    sky.add(new THREE.Mesh(geometry, material));
    const generator = new THREE.PMREMGenerator(gl);
    const environment = generator.fromScene(sky, isMaxQuality ? 0.025 : 0.04, 0.1, 30);
    scene.environment = environment.texture;
    generator.dispose();
    geometry.dispose();
    material.dispose();
    return () => {
      scene.environment = previous;
      scene.environmentIntensity = previousIntensity;
      environment.dispose();
    };
  }, [enabled, gl, scene, isNight, atmosphere, isMaxQuality]);

  useFrame(({ camera }, delta) => {
    if (!enabled) return;
    const storm = getLocalStorm(camera.position.x, camera.position.z);
    const targetIntensity = (isNight ? 0.76 : isMaxQuality ? 1.05 : 0.95) * (1 - storm * 0.65);
    scene.environmentIntensity = THREE.MathUtils.damp(
      scene.environmentIntensity,
      targetIntensity,
      2,
      delta
    );
  });
  return null;
}

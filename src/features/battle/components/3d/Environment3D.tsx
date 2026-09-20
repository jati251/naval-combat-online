import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';
import type { GraphicProfile } from '@/features/settings';
import { SceneSunLight } from './rendering/SceneSunLight';
import { getWeatherNoise } from './textures/oceanTextures';
import { weatherUniformsGLSL, atmosphereFunctionsGLSL } from './atmosphereShaders';
import { getLightning, getLocalStorm } from '../../utils/weather';
import { getOceanTime } from '../../utils/oceanTime';
import { StormWeather3D } from './StormWeather3D';

export const FOG_COLOR = '#acbdc4';
export const NIGHT_FOG_COLOR = '#253847';
export const FOG_DENSITY_DESKTOP = 0.0025;
export const FOG_DENSITY_DESKTOP_NIGHT = 0.003;
export const FOG_DENSITY_MOBILE = 0.004;
export const FOG_DENSITY_MOBILE_NIGHT = 0.0045;
export const FOG_NEAR_DESKTOP = 160;
export const FOG_FAR_DESKTOP = 850;
export const MAX_VIEW_DISTANCE_DESKTOP = 850;
export const ISLAND_DETAIL_DISTANCE_DESKTOP = 180;
export const FOG_NEAR_MOBILE = 90;
export const FOG_FAR_MOBILE = 520;
export const MAX_VIEW_DISTANCE_MOBILE = 520;
export const ISLAND_DETAIL_DISTANCE_MOBILE = 100;
export const NAMEPLATE_CULL_DISTANCE = 220;
export const NAMEPLATE_CULL_DISTANCE_MOBILE = 160;
export const FOG_NEAR = FOG_NEAR_DESKTOP;
export const FOG_FAR = FOG_FAR_DESKTOP;
export const MAX_VIEW_DISTANCE = MAX_VIEW_DISTANCE_DESKTOP;
export const ISLAND_LOD_DISTANCE = ISLAND_DETAIL_DISTANCE_DESKTOP;
export function getFogConfig(isMobile: boolean, isNight: boolean, customFogColor?: string) {
  return {
    color: customFogColor ?? (isNight ? NIGHT_FOG_COLOR : FOG_COLOR),
    density: isMobile ? FOG_DENSITY_MOBILE : FOG_DENSITY_DESKTOP,
    near: isMobile ? FOG_NEAR_MOBILE : FOG_NEAR_DESKTOP,
    far: isMobile ? FOG_FAR_MOBILE : FOG_FAR_DESKTOP,
    viewDistance: isMobile ? MAX_VIEW_DISTANCE_MOBILE : MAX_VIEW_DISTANCE_DESKTOP,
    islandDetailDistance: isMobile ? ISLAND_DETAIL_DISTANCE_MOBILE : ISLAND_DETAIL_DISTANCE_DESKTOP,
  };
}

export const Environment3D: React.FC<{ isMobile?: boolean; profile?: GraphicProfile }> = React.memo(({ isMobile = false, profile }) => {
  const isNight = useGameStore(s => s.timeOfDay === 'NIGHT');
  const mobile = profile ? profile.id === 'fast' : isMobile;
  const ambient = useRef<THREE.AmbientLight>(null);
  const hemisphere = useRef<THREE.HemisphereLight>(null);
  const baseFog = useMemo(() => new THREE.Color(isNight ? NIGHT_FOG_COLOR : FOG_COLOR), [isNight]);
  const stormFog = useMemo(() => new THREE.Color(isNight ? '#18242d' : '#52616a'), [isNight]);
  const fog = useMemo(() => new THREE.FogExp2(baseFog, 0.0025), [baseFog]);
  const viewDistance = profile?.maxViewDistance ?? (mobile ? MAX_VIEW_DISTANCE_MOBILE : MAX_VIEW_DISTANCE_DESKTOP);
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uWeatherNoise: { value: getWeatherNoise() },
      uSkyTopColor: { value: new THREE.Color(isNight ? '#081321' : '#487a99') },
      uSkyHorizonColor: { value: fog.color },
      uSunColor: { value: new THREE.Color(isNight ? '#a8c6dd' : '#fff2d5') },
      uLightDir: { value: new THREE.Vector3(70,140,-50).normalize() },
      uIsNight: { value: isNight ? 1 : 0 },
      uTime: { value: 0 },
      uStorm: { value: 0 },
      uLightning: { value: 0 },
      uWind: { value: new THREE.Vector2(1,0) },
    },
    vertexShader: `varying vec3 vDirection;
      void main() {
        vDirection = position;
        // Ignore camera translation; camera rigs may move after this component updates.
        vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: `${weatherUniformsGLSL}
      uniform vec3 uSkyHorizonColor, uSunColor, uLightDir;
      uniform float uTime, uIsNight;
      varying vec3 vDirection;
      ${atmosphereFunctionsGLSL}
      void main() {
        vec3 dir = normalize(vDirection);
        vec3 color = atmosphereColor(dir, uSkyHorizonColor, uSunColor, uLightDir, uIsNight, uTime, cameraPosition.xz, true);
        if (uIsNight > 0.5 && dir.y > 0.08) {
          vec2 starUV = vec2(atan(dir.z, dir.x) / 6.2831853 + 0.5, asin(dir.y) / 3.1415927 + 0.5);
          float stars = texture2D(uWeatherNoise, starUV).b;
          float cloudCover = smoothstep(0.50, 0.66, cloudField(cameraPosition.xz * 0.3 + dir.xz * (210.0 / max(0.02, dir.y)), uTime));
          color += vec3(0.8, 0.95, 1.1) * stars * (1.0 - uStorm) * (1.0 - cloudCover);
        }
        gl_FragColor = vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
  }), [fog, isNight]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ camera, clock }, delta) => {
    const storm = getLocalStorm(camera.position.x, camera.position.z);
    const store = useGameStore.getState();
    const time = getOceanTime(store, clock.elapsedTime);
    material.uniforms.uTime.value = time;
    material.uniforms.uStorm.value = THREE.MathUtils.damp(material.uniforms.uStorm.value, storm, 1.5, delta);
    material.uniforms.uLightning.value = getLightning(time, storm);
    material.uniforms.uWind.value.set(Math.sin(store.windAngle), Math.cos(store.windAngle));
    const blend = material.uniforms.uStorm.value;
    fog.color.copy(baseFog).lerp(stormFog, blend);
    // Cull only after haze conceals distant geometry; storm visibility closes gradually.
    fog.density = THREE.MathUtils.lerp(2.4 / viewDistance, 0.014, blend);
    if (ambient.current) ambient.current.intensity = (isNight ? 0.2 : 0.32) * (1 - blend * 0.35);
    if (hemisphere.current) hemisphere.current.intensity = (isNight ? 0.55 : 1.35) * (1 - blend * 0.55) + material.uniforms.uLightning.value * 0.45;
  }, -20);

  return <>
    <primitive attach="fog" object={fog} />
    <mesh material={material} renderOrder={-1000} frustumCulled={false}>
      <sphereGeometry args={[1, 32, 16]} />
    </mesh>
    <SceneSunLight intensity={isNight ? 0.65 : 2.4} color={isNight ? '#a8c6dd' : '#fff2d5'} shadows={profile?.shadows ?? !mobile} shadowMapSize={profile?.shadowMapSize ?? 1024} />
    <ambientLight ref={ambient} color={isNight ? '#6c879c' : '#d0d8db'} intensity={0.32} />
    <hemisphereLight ref={hemisphere} args={[isNight ? '#657d92' : '#bdccd1', '#343b35', 1.35]} />
    <StormWeather3D isMobile={mobile} />
  </>;
});

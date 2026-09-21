import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';
import { findShip } from '@/stores/selectors/shipLookup';
import { getMapConfig } from '../../maps';
import type { GraphicProfile } from '@/features/settings';
import { getOceanVertexShader, getOceanFragmentShader } from './oceanShaders';
import { dampAngle } from '../../utils/math';
import { GERSTNER_WAVES, SHIP_PRESETS } from '@/types';
import { getOceanTime } from '../../utils/oceanTime';
import { createCoastalHeightField } from './islands/coastalHeightField';
import { getOceanDetail, getWeatherNoise } from './textures/oceanTextures';
import { getLightning, getLocalStorm } from '../../utils/weather';

interface OceanWaterProps {
  size?: number;
  isMobile?: boolean;
  profile?: GraphicProfile;
}

// Precompute mathematical constants for Gerstner waves at compile time (avoids ~500k redundant GPU vertex math ops/frame)
function makeWaveGLSL(dx: number, dy: number, steepness: number, wavelength: number, speed: number): string {
  const len = Math.hypot(dx, dy) || 1;
  const nx = (dx / len).toFixed(9);
  const ny = (dy / len).toFixed(9);
  const k = ((2 * Math.PI) / wavelength).toFixed(9);
  const a = (steepness / ((2 * Math.PI) / wavelength)).toFixed(9);
  const s = steepness.toFixed(4);
  const spd = speed.toFixed(3);
  return `Wave(vec2(${nx}, ${ny}), ${s}, ${k}, ${a}, ${spd})`;
}

export const OceanWater: React.FC<OceanWaterProps> = React.memo(({ size: requestedSize, isMobile = false, profile }) => {
  const size = requestedSize ?? 2 * ((profile?.waterShader.horizonLODCutoff ?? 950) + 32);
  const meshRef = useRef<THREE.Mesh>(null);
  const timeOfDay = useGameStore((s) => s.timeOfDay);
  const isNight = timeOfDay === 'NIGHT';

  const currentMapId = useGameStore((s) => s.currentMapId || s.currentRoom?.mapId || 'caribbean');
  const activeMap = useMemo(() => getMapConfig(currentMapId), [currentMapId]);
  const islands = activeMap.islands;

  const qualityTier = profile?.id ?? (isMobile ? 'fast' : 'balanced');

  const segments = profile ? profile.waterSegments : (isMobile ? 120 : 160);

  // Unified Continuous Ocean Mesh:
  // Continuous camera-relative tessellation; wave phases remain in world space.
  // Single draw call eliminates WebGL state-binding overhead.
  // frustumCulled={false} ensures vertex-displaced Gerstner wave crests never clip.
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);
    // Concentrate vertices around the vessel while retaining the full horizon.
    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const warp = (value: number) => {
        const n = value / (size * 0.5);
        return (n * 0.12 + n * n * n * 0.88) * size * 0.5;
      };
      positions.setXYZ(i, warp(positions.getX(i)), 0, warp(positions.getZ(i)));
    }
    geo.computeBoundingSphere();
    return geo;
  }, [size, segments]);

  const coastalField = useMemo(() => createCoastalHeightField(islands), [islands]);
  const coastalTexture = useMemo(() => {
    const texture = new THREE.DataTexture(coastalField.data, coastalField.resolution, coastalField.resolution, THREE.RGFormat);
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }, [coastalField]);
  useEffect(() => () => coastalTexture.dispose(), [coastalTexture]);

  // Every quality tier must use the same surface as hull buoyancy.
  const waveShaderChunk = useMemo(() => {
    return `const int NUM_WAVES = ${GERSTNER_WAVES.length};
      const Wave waves[NUM_WAVES] = Wave[NUM_WAVES](
      ${GERSTNER_WAVES.map(w => makeWaveGLSL(...w.direction, w.steepness, w.wavelength, w.speed)).join(',\n')});`;
  }, []);

  const fogDensity = profile
      ? (isNight ? profile.fogDensityNight : profile.fogDensityDay)
      : (isMobile ? (isNight ? 0.0015 : 0.0013) : (isNight ? 0.0011 : 0.0010));

    const horizonCutoff = profile?.waterShader.horizonLODCutoff ?? (qualityTier === 'fast' ? 650.0 : 950.0);
    const maxCapDist = profile?.waterShader.capillaryDist ?? (qualityTier === 'fast' ? 70.0 : qualityTier === 'performance' ? 320.0 : 200.0);
    const maxSSSDist = profile?.waterShader.sssDist ?? (qualityTier === 'fast' ? 60.0 : qualityTier === 'performance' ? 320.0 : 220.0);
    const maxFoamDist = profile?.waterShader.foamDist ?? (qualityTier === 'fast' ? 70.0 : qualityTier === 'performance' ? 280.0 : 180.0);
  const shaderMaterial = useMemo(() => {
    const wakesEnabled = 0; // Persistent world-space wake patches are rendered by each vessel.

    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWaterDetail: { value: getOceanDetail() },
        uWeatherNoise: { value: getWeatherNoise() },
        uSkyTopColor: { value: new THREE.Color(isNight ? '#081321' : '#487a99') },
        uStorm: { value: 0 },
        uLightning: { value: 0 },
        uWind: { value: new THREE.Vector2(1, 0) },
        uDeepWaterColor: { value: new THREE.Color(isNight ? '#071821' : activeMap.water.deepWaterColor).lerp(new THREE.Color('#082f38'), isNight ? 0 : 0.65) },
        uMidWaterColor: { value: new THREE.Color(isNight ? '#0d2835' : activeMap.water.midWaterColor).lerp(new THREE.Color('#14616a'), isNight ? 0 : 0.65) },
        uShallowColor: { value: new THREE.Color(isNight ? '#15333d' : activeMap.water.shallowColor).lerp(new THREE.Color('#367c7e'), isNight ? 0 : 0.6) },
        uLagoonColor: { value: new THREE.Color(isNight ? '#185880' : activeMap.water.lagoonColor) },
        uCrestGlowColor: { value: new THREE.Color(isNight ? '#3f78b8' : activeMap.water.crestGlowColor) },
        uSubsurfaceColor: { value: new THREE.Color(isNight ? '#18548a' : activeMap.water.subsurfaceColor) },
        uFoamColor: { value: new THREE.Color(isNight ? '#769ec9' : activeMap.water.foamColor) },
        uSunColor: { value: new THREE.Color(isNight ? '#a8c6dd' : '#fff2d5') },
        uSkyHorizonColor: { value: new THREE.Color(isNight ? activeMap.atmosphere.fogColorNight : activeMap.atmosphere.fogColorDay) },
        uLightDir: { value: new THREE.Vector3(70, 140, -50).normalize() },
        uCoastalHeight: { value: coastalTexture },
        uCoastalBounds: { value: new THREE.Vector4(coastalField.minX, coastalField.minZ, coastalField.spanX, coastalField.spanZ) },
        uCoastalResolution: { value: coastalField.resolution },
        uShipPos: { value: new THREE.Vector3(0, 0, 0) },
        uShipHeading: { value: 0 },
        uShipSpeed: { value: 0 },
        uShipLength: { value: 18 },
        uShipWidth: { value: 6 },
        uIsMobile: { value: qualityTier === 'fast' ? 1.0 : 0.0 },
        uIsNight: { value: isNight ? 1.0 : 0.0 },
        uFogDensity: { value: fogDensity },
        uQualityTier: { value: qualityTier === 'fast' ? 0.0 : qualityTier === 'performance' ? 2.0 : 1.0 },
        uHorizonCutoff: { value: horizonCutoff },
        uMaxCapDist: { value: maxCapDist },
        uMaxSSSDist: { value: maxSSSDist },
        uMaxFoamDist: { value: maxFoamDist },
        uWakesEnabled: { value: wakesEnabled },
      },
      vertexShader: getOceanVertexShader(waveShaderChunk),
      fragmentShader: getOceanFragmentShader(waveShaderChunk),
      transparent: false,
      wireframe: false,
    });
  }, [isNight, activeMap, coastalTexture, coastalField, waveShaderChunk, qualityTier,
    fogDensity, horizonCutoff, maxCapDist, maxSSSDist, maxFoamDist]);

  useEffect(() => () => shaderMaterial.dispose(), [shaderMaterial]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Smoothed real-time ship state refs to prevent 30Hz server-tick wake stutter
  const smoothShipPos = useRef(new THREE.Vector3(0, 0, 0));
  const smoothShipHeading = useRef(0);
  const smoothShipSpeed = useRef(0);

  useFrame((state, delta) => {
    const t = getOceanTime(useGameStore.getState(), state.clock.elapsedTime);
    if (shaderMaterial) {
      shaderMaterial.uniforms.uTime.value = t;
      const store = useGameStore.getState();
      const storm = getLocalStorm(state.camera.position.x, state.camera.position.z);
      shaderMaterial.uniforms.uStorm.value = THREE.MathUtils.damp(shaderMaterial.uniforms.uStorm.value, storm, 1.5, delta);
      shaderMaterial.uniforms.uLightning.value = getLightning(t, storm);
      shaderMaterial.uniforms.uWind.value.set(Math.sin(store.windAngle), Math.cos(store.windAngle));
      const fog = state.scene.fog;
      if (fog instanceof THREE.FogExp2) {
        shaderMaterial.uniforms.uFogDensity.value = fog.density;
        shaderMaterial.uniforms.uHorizonCutoff.value = Math.min(profile?.waterShader.horizonLODCutoff ?? 950, 2.5 / fog.density);
        shaderMaterial.uniforms.uSkyHorizonColor.value.copy(fog.color);
      }

      const { ships, selfId } = useGameStore.getState();
      const selfShip = findShip(ships, selfId);
      if (selfShip && !selfShip.isSunk) {
        const hull = SHIP_PRESETS[selfShip.shipClass];
        shaderMaterial.uniforms.uShipLength.value = hull.length;
        shaderMaterial.uniforms.uShipWidth.value = hull.width;
        smoothShipPos.current.x = THREE.MathUtils.damp(smoothShipPos.current.x, selfShip.x, 24, delta);
        smoothShipPos.current.y = THREE.MathUtils.damp(smoothShipPos.current.y, selfShip.y, 24, delta);
        smoothShipPos.current.z = THREE.MathUtils.damp(smoothShipPos.current.z, selfShip.z, 24, delta);
        smoothShipHeading.current = dampAngle(smoothShipHeading.current, selfShip.rotationY, 20, delta);
        smoothShipSpeed.current = THREE.MathUtils.damp(smoothShipSpeed.current, selfShip.speed ?? 0, 14, delta);

        shaderMaterial.uniforms.uShipPos.value.copy(smoothShipPos.current);
        shaderMaterial.uniforms.uShipHeading.value = smoothShipHeading.current;
        shaderMaterial.uniforms.uShipSpeed.value = smoothShipSpeed.current;
      } else {
        smoothShipSpeed.current = THREE.MathUtils.damp(smoothShipSpeed.current, 0, 10, delta);
        shaderMaterial.uniforms.uShipSpeed.value = smoothShipSpeed.current;
      }
    }

    if (meshRef.current) {
      meshRef.current.position.x = state.camera.position.x;
      meshRef.current.position.z = state.camera.position.z;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={shaderMaterial}
      position={[0, 0, 0]}
      frustumCulled={false}
    />
  );
});

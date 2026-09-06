import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';
import { findShip } from '@/stores/selectors/shipLookup';
import { getMapConfig } from '../../maps';
import type { GraphicProfile } from '@/features/settings';
import { getOceanVertexShader, getOceanFragmentShader } from './oceanShaders';

interface OceanWaterProps {
  size?: number;
  isMobile?: boolean;
  profile?: GraphicProfile;
}

// Precompute mathematical constants for Gerstner waves at compile time (avoids ~500k redundant GPU vertex math ops/frame)
function makeWaveGLSL(dx: number, dy: number, steepness: number, wavelength: number, speed: number): string {
  const len = Math.hypot(dx, dy) || 1;
  const nx = (dx / len).toFixed(5);
  const ny = (dy / len).toFixed(5);
  const k = ((2 * Math.PI) / wavelength).toFixed(5);
  const a = (steepness / ((2 * Math.PI) / wavelength)).toFixed(5);
  const s = steepness.toFixed(4);
  const spd = speed.toFixed(3);
  return `Wave(vec2(${nx}, ${ny}), ${s}, ${k}, ${a}, ${spd})`;
}

export const OceanWater: React.FC<OceanWaterProps> = React.memo(({ size = 1600, isMobile = false, profile }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeOfDay = useGameStore((s) => s.timeOfDay);
  const isNight = timeOfDay === 'NIGHT';

  const currentMapId = useGameStore((s) => s.currentMapId || s.currentRoom?.mapId || 'caribbean');
  const activeMap = useMemo(() => getMapConfig(currentMapId), [currentMapId]);
  const islands = activeMap.islands;

  const qualityTier = profile?.id ?? (isMobile ? 'fast' : 'balanced');

  // Responsive vertex grid density:
  // - fast: 90x90 quads (8,100 quads)
  // - balanced: 160x160 quads (25,600 quads)
  // - performance (Ultra Realism): 180x180 quads (32,400 quads) for high-framerate physical Gerstner curves
  const segments = profile ? profile.waterSegments : (isMobile ? 120 : 160);

  // Unified Continuous Ocean Mesh:
  // Centered around the camera, snaps to gridStep to eliminate vertex shimmer.
  // Single draw call eliminates WebGL state-binding overhead.
  // frustumCulled={false} ensures vertex-displaced Gerstner wave crests never clip.
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [size, segments]);

  // Pack arena islands data into uniform arrays: position/seed and elongation params (supports up to 12 islands)
  const islandPositions = useMemo(() => {
    const list: THREE.Vector4[] = [];
    for (let i = 0; i < 12; i++) {
      if (i < islands.length) {
        const isl = islands[i];
        const sandR = isl.settlement?.type === 'sea-arch' ? 0 : isl.sandRadius;
        list.push(new THREE.Vector4(isl.x, isl.z, sandR, isl.seed));
      } else {
        list.push(new THREE.Vector4(9999, 9999, 0, 0));
      }
    }
    return list;
  }, [islands]);

  const islandParams = useMemo(() => {
    const list: THREE.Vector4[] = [];
    for (let i = 0; i < 12; i++) {
      if (i < islands.length) {
        const isl = islands[i];
        list.push(
          isl.elongation
            ? new THREE.Vector4(isl.elongation.scaleX, isl.elongation.scaleZ, isl.elongation.angle, 1.0)
            : new THREE.Vector4(1.0, 1.0, 0.0, 0.0)
        );
      } else {
        list.push(new THREE.Vector4(1.0, 1.0, 0.0, 0.0));
      }
    }
    return list;
  }, [islands]);

  // Modular Gerstner wave spectrum based on quality tier (constants precalculated)
  const waveShaderChunk = useMemo(() => {
    if (qualityTier === 'fast') {
      return `
        const int NUM_WAVES = 2;
        const Wave waves[NUM_WAVES] = Wave[NUM_WAVES](
          ${makeWaveGLSL(1.0, 0.28, 0.11, 92.0, 2.6)},
          ${makeWaveGLSL(0.55, 0.85, 0.085, 48.0, 2.1)}
        );
      `;
    }
    if (qualityTier === 'performance') {
      return `
        const int NUM_WAVES = 6;
        const Wave waves[NUM_WAVES] = Wave[NUM_WAVES](
          // 1. Primary rolling Caribbean swell
          ${makeWaveGLSL(1.0, 0.28, 0.11, 96.0, 2.6)},
          // 2. Secondary diagonal cross-swell
          ${makeWaveGLSL(0.55, 0.85, 0.085, 52.0, 2.1)},
          // 3. Intermediate surface swell
          ${makeWaveGLSL(-0.35, 0.92, 0.065, 32.0, 1.8)},
          // 4. Moderate wind swell
          ${makeWaveGLSL(-0.75, -0.65, 0.045, 19.0, 1.5)},
          // 5. Transverse chop harmonic
          ${makeWaveGLSL(0.88, -0.47, 0.035, 12.5, 1.3)},
          // 6. Opposing sea ripple
          ${makeWaveGLSL(-0.25, 0.96, 0.025, 8.2, 1.1)}
        );
      `;
    }
    // Default / Balanced (4 Gerstner waves)
    return `
      const int NUM_WAVES = 4;
      const Wave waves[NUM_WAVES] = Wave[NUM_WAVES](
        ${makeWaveGLSL(1.0, 0.28, 0.11, 92.0, 2.6)},
        ${makeWaveGLSL(0.55, 0.85, 0.085, 48.0, 2.1)},
        ${makeWaveGLSL(-0.35, 0.92, 0.065, 28.0, 1.7)},
        ${makeWaveGLSL(-0.75, -0.65, 0.045, 18.0, 1.4)}
      );
    `;
  }, [qualityTier]);

  // Assassin's Creed IV: Black Flag & Sea of Thieves AAA Ocean Shader (Modularized)
  const shaderMaterial = useMemo(() => {
    const fogDensity = profile
      ? (isNight ? profile.fogDensityNight : profile.fogDensityDay)
      : (isMobile ? (isNight ? 0.0015 : 0.0013) : (isNight ? 0.0011 : 0.0010));

    const horizonCutoff = profile?.waterShader.horizonLODCutoff ?? (qualityTier === 'fast' ? 650.0 : 950.0);
    const maxCapDist = profile?.waterShader.capillaryDist ?? (qualityTier === 'fast' ? 70.0 : qualityTier === 'performance' ? 320.0 : 200.0);
    const maxSSSDist = profile?.waterShader.sssDist ?? (qualityTier === 'fast' ? 60.0 : qualityTier === 'performance' ? 320.0 : 220.0);
    const maxFoamDist = profile?.waterShader.foamDist ?? (qualityTier === 'fast' ? 70.0 : qualityTier === 'performance' ? 280.0 : 180.0);
    const wakesEnabled = profile ? (profile.waterShader.wakesEnabled ? 1.0 : 0.0) : (isMobile ? 0.0 : 1.0);

    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDeepWaterColor: { value: new THREE.Color(isNight ? '#082040' : activeMap.water.deepWaterColor) },
        uMidWaterColor: { value: new THREE.Color(isNight ? '#0f3566' : activeMap.water.midWaterColor) },
        uShallowColor: { value: new THREE.Color(isNight ? '#154c8a' : activeMap.water.shallowColor) },
        uLagoonColor: { value: new THREE.Color(isNight ? '#185880' : activeMap.water.lagoonColor) },
        uCrestGlowColor: { value: new THREE.Color(isNight ? '#3f78b8' : activeMap.water.crestGlowColor) },
        uSubsurfaceColor: { value: new THREE.Color(isNight ? '#18548a' : activeMap.water.subsurfaceColor) },
        uFoamColor: { value: new THREE.Color(isNight ? '#769ec9' : activeMap.water.foamColor) },
        uSunColor: { value: new THREE.Color(isNight ? activeMap.atmosphere.moonColorNight : activeMap.atmosphere.sunColorDay) },
        uSkyHorizonColor: { value: new THREE.Color(isNight ? activeMap.atmosphere.fogColorNight : activeMap.atmosphere.fogColorDay) },
        uLightDir: { value: new THREE.Vector3(70, 140, -50).normalize() },
        uIslandPos: { value: islandPositions },
        uIslandParams: { value: islandParams },
        uShipPos: { value: new THREE.Vector3(0, 0, 0) },
        uShipHeading: { value: 0 },
        uShipSpeed: { value: 0 },
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
      fragmentShader: getOceanFragmentShader(),
      transparent: false,
      wireframe: false,
    });
  }, [isNight, isMobile, activeMap, islandPositions, islandParams, waveShaderChunk, qualityTier, profile]);

  useEffect(() => () => shaderMaterial.dispose(), [shaderMaterial]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Smoothed real-time ship state refs to prevent 30Hz server-tick wake stutter
  const smoothShipPos = useRef(new THREE.Vector3(0, 0, 0));
  const smoothShipHeading = useRef(0);
  const smoothShipSpeed = useRef(0);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    if (shaderMaterial) {
      shaderMaterial.uniforms.uTime.value = t;

      const { ships, selfId } = useGameStore.getState();
      const selfShip = findShip(ships, selfId);
      if (selfShip && !selfShip.isSunk) {
        smoothShipPos.current.x = THREE.MathUtils.lerp(smoothShipPos.current.x, selfShip.x, Math.min(1.0, 24 * delta));
        smoothShipPos.current.y = THREE.MathUtils.lerp(smoothShipPos.current.y, selfShip.y, Math.min(1.0, 24 * delta));
        smoothShipPos.current.z = THREE.MathUtils.lerp(smoothShipPos.current.z, selfShip.z, Math.min(1.0, 24 * delta));
        smoothShipHeading.current = THREE.MathUtils.lerp(smoothShipHeading.current, selfShip.rotationY, Math.min(1.0, 20 * delta));
        smoothShipSpeed.current = THREE.MathUtils.lerp(smoothShipSpeed.current, selfShip.speed ?? 0, Math.min(1.0, 14 * delta));

        shaderMaterial.uniforms.uShipPos.value.copy(smoothShipPos.current);
        shaderMaterial.uniforms.uShipHeading.value = smoothShipHeading.current;
        shaderMaterial.uniforms.uShipSpeed.value = smoothShipSpeed.current;
      } else {
        smoothShipSpeed.current = THREE.MathUtils.lerp(smoothShipSpeed.current, 0, Math.min(1.0, 10 * delta));
        shaderMaterial.uniforms.uShipSpeed.value = smoothShipSpeed.current;
      }
    }

    if (meshRef.current) {
      const gridStep = size / segments;
      meshRef.current.position.x = Math.round(state.camera.position.x / gridStep) * gridStep;
      meshRef.current.position.z = Math.round(state.camera.position.z / gridStep) * gridStep;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={shaderMaterial}
      position={[0, -0.05, 0]}
      frustumCulled={false}
    />
  );
});

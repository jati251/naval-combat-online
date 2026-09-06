import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';
import { findShip } from '@/stores/selectors/shipLookup';
import { getMapConfig } from '../../maps';
import type { GraphicProfile } from '@/features/settings';

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
      vertexShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying float vWaveHeight;
        varying float vCrestPinch;

        struct Wave {
          vec2 dir;
          float steepness;
          float k;
          float a;
          float speed;
        };

        ${waveShaderChunk}

        void main() {
          vec4 worldOrigin = modelMatrix * vec4(position, 1.0);
          vec3 pos = worldOrigin.xyz;
          vec3 displaced = pos;

          vec3 tangent = vec3(1.0, 0.0, 0.0);
          vec3 binormal = vec3(0.0, 0.0, 1.0);
          float pinchAccum = 0.0;

          for (int i = 0; i < NUM_WAVES; i++) {
            Wave w = waves[i];
            float dotProd = w.dir.x * pos.x + w.dir.y * pos.z;
            float phase = w.k * (dotProd - w.speed * uTime);
            float cosP = cos(phase);
            float sinP = sin(phase);

            // Gerstner trochoidal displacement (peaks pinch, troughs flatten)
            float aCos = w.a * cosP;
            displaced.x += w.dir.x * aCos;
            displaced.y += w.a * sinP;
            displaced.z += w.dir.y * aCos;

            // Analytical Jacobian derivatives for exact surface normals
            float sSin = w.steepness * sinP;
            float sCos = w.steepness * cosP;
            float dxdz = w.dir.x * w.dir.y;

            tangent.x -= w.dir.x * w.dir.x * sSin;
            tangent.y += w.dir.x * sCos;
            tangent.z -= dxdz * sSin;

            binormal.x -= dxdz * sSin;
            binormal.y += w.dir.y * sCos;
            binormal.z -= w.dir.y * w.dir.y * sSin;

            pinchAccum += sCos;
          }

          vec3 calcNormal = normalize(cross(binormal, tangent));
          vNormal = calcNormal;
          vWaveHeight = displaced.y;
          vCrestPinch = pinchAccum;
          vWorldPosition = displaced;

          gl_Position = projectionMatrix * viewMatrix * vec4(displaced, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uDeepWaterColor;
        uniform vec3 uMidWaterColor;
        uniform vec3 uShallowColor;
        uniform vec3 uLagoonColor;
        uniform vec3 uCrestGlowColor;
        uniform vec3 uSubsurfaceColor;
        uniform vec3 uFoamColor;
        uniform vec3 uSunColor;
        uniform vec3 uSkyHorizonColor;
        uniform vec3 uLightDir;
        uniform vec4 uIslandPos[12];
        uniform vec4 uIslandParams[12];
        uniform vec3 uShipPos;
        uniform float uShipHeading;
        uniform float uShipSpeed;
        uniform float uIsMobile;
        uniform float uIsNight;
        uniform float uFogDensity;
        uniform float uQualityTier;
        uniform float uHorizonCutoff;
        uniform float uMaxCapDist;
        uniform float uMaxSSSDist;
        uniform float uMaxFoamDist;
        uniform float uWakesEnabled;

        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying float vWaveHeight;
        varying float vCrestPinch;

        // Fast hash for procedural foam web
        vec2 hash22(vec2 p) {
          p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
          return fract(sin(p) * 43758.5453123);
        }

        // Procedural Voronoi cellular foam generator
        float cellularFoam(vec2 p) {
          vec2 n = floor(p);
          vec2 f = fract(p);
          float md = 8.0;
          for (int j = -1; j <= 1; j++) {
            for (int i = -1; i <= 1; i++) {
              vec2 g = vec2(float(i), float(j));
              vec2 o = hash22(n + g);
              vec2 r = g + o - f;
              float d = dot(r, r);
              md = min(md, d);
            }
          }
          return sqrt(md);
        }

        // Multi-Scale Directional Capillary Micro-Waves (crisp liquid shimmer with precomputed constants)
        vec3 computeCapillaryNormal(vec2 p, float time, float tier) {
          float c1 = cos(1.496 * (dot(vec2(0.7071, 0.7071), p) - 2.2 * time));
          float dh_dx = -(0.03385 * c1);
          float dh_dz = -(0.03385 * c1);

          if (tier > 0.5) {
            float c2 = cos(2.856 * (dot(vec2(-0.8000, 0.6000), p) - 2.8 * time));
            float c3 = cos(5.712 * (dot(vec2(0.3821, -0.9241), p) - 3.4 * time));
            dh_dx -= (-0.04113 * c2 + 0.01964 * c3);
            dh_dz -= (0.03085 * c2 - 0.04751 * c3);
          }

          if (tier > 1.5) {
            // Ultra Photorealism: 2 additional micro-capillary harmonics
            float c4 = cos(11.424 * (dot(vec2(-0.5524, -0.8336), p) - 4.1 * time));
            float c5 = cos(22.440 * (dot(vec2(0.9241, 0.3821), p) - 4.9 * time));
            dh_dx -= (-0.02840 * c4 + 0.04562 * c5);
            dh_dz -= (-0.04285 * c4 + 0.01886 * c5);
          }

          return vec3(dh_dx, 1.0, dh_dz);
        }

        void main() {
          float camDist = length(vWorldPosition - cameraPosition);

          // 0. DISTANCE LOD: Horizon Early Exit
          if (camDist > uHorizonCutoff) {
            gl_FragColor = vec4(uSkyHorizonColor, 1.0);
            return;
          }

          vec3 baseNormal = normalize(vNormal);
          vec3 lightDir = normalize(uLightDir);
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);

          // 1. High-Frequency Micro-Wave Capillary Normal Blending
          vec3 normal = baseNormal;
          if (camDist < uMaxCapDist) {
            float capStrength = 1.0 - smoothstep(uMaxCapDist * 0.35, uMaxCapDist, camDist);
            vec3 capNorm = computeCapillaryNormal(vWorldPosition.xz, uTime, uQualityTier);
            normal = normalize(vec3(
              baseNormal.x + capNorm.x * (0.34 * capStrength),
              baseNormal.y,
              baseNormal.z + capNorm.z * (0.34 * capStrength)
            ));
          }

          // 2. Coastal Water Depth & Island Proximity
          float minDistToShore = 9999.0;
          float maxInfluenceDist = uIsMobile > 0.5 ? 220.0 : 280.0;
          if (camDist < maxInfluenceDist) {
            for (int i = 0; i < 12; i++) {
              if (uIslandPos[i].z <= 0.0) continue;
              vec2 relPos = vWorldPosition.xz - uIslandPos[i].xy;
              float sandR = uIslandPos[i].z;

              float centerDistSq = dot(relPos, relPos);
              float maxInfluence = (sandR * 1.8 + 64.0);
              if (centerDistSq > maxInfluence * maxInfluence) {
                continue;
              }

              float seed = uIslandPos[i].w;
              float isElongated = uIslandParams[i].w;

              if (isElongated > 0.5) {
                float rotA = uIslandParams[i].z;
                float cosA = cos(rotA);
                float sinA = sin(rotA);
                vec2 localPos = vec2(relPos.x * cosA - relPos.y * sinA, relPos.x * sinA + relPos.y * cosA);

                float scaleX = uIslandParams[i].x;
                float scaleZ = uIslandParams[i].y;
                vec2 scaledPos = vec2(localPos.x / scaleX, localPos.y / scaleZ);
                float distScaled = length(scaledPos);
                float angle = atan(scaledPos.y, scaledPos.x);

                float coastNoise = (sin(angle * 5.0 + seed * 0.1) * 0.08 +
                                    sin(angle * 11.0 + seed * 0.3) * 0.04 +
                                    sin(angle * 17.0 + seed * 0.7) * 0.02) * sandR;

                float radialScale = length(vec2(cos(angle) * scaleX, sin(angle) * scaleZ));
                float distToSand = (distScaled - (sandR * 1.16 + coastNoise)) * radialScale;
                minDistToShore = min(minDistToShore, distToSand);
              } else {
                float distToCenter = sqrt(centerDistSq);
                float angle = atan(relPos.y, relPos.x);
                float coastNoise = (sin(angle * 5.0 + seed * 0.1) * 0.08 +
                                    sin(angle * 11.0 + seed * 0.3) * 0.04 +
                                    sin(angle * 17.0 + seed * 0.7) * 0.02) * sandR;
                float distToSand = distToCenter - (sandR * 1.16 + coastNoise);
                minDistToShore = min(minDistToShore, distToSand);
              }
            }
          }

          // 3. Optical Depth Absorption Model
          float waveMod = clamp((vWaveHeight + 1.2) / 2.4, 0.0, 1.0);
          vec3 deepOceanColor = uQualityTier > 1.5
            ? (uIsNight > 0.5 ? vec3(0.015, 0.035, 0.08) : mix(vec3(0.012, 0.08, 0.17), vec3(0.02, 0.14, 0.28), waveMod))
            : mix(uDeepWaterColor, uMidWaterColor, 0.14 + 0.86 * waveMod);
          vec3 waterColor = deepOceanColor;

          if (minDistToShore < 72.0) {
            float shoreDepthT = smoothstep(0.0, 54.0, max(0.0, minDistToShore));

            vec3 caribbeanTurquoise = mix(vec3(0.02, 0.64, 0.76), vec3(0.05, 0.22, 0.36), uIsNight);
            vec3 crystalCyan        = mix(vec3(0.06, 0.82, 0.88), vec3(0.08, 0.27, 0.42), uIsNight);
            vec3 goldenSandBed      = mix(vec3(0.84, 0.70, 0.46), vec3(0.25, 0.23, 0.20), uIsNight);

            vec3 reefTransition = mix(crystalCyan, caribbeanTurquoise, smoothstep(2.0, 22.0, minDistToShore));
            reefTransition = mix(reefTransition, uMidWaterColor, smoothstep(22.0, 54.0, minDistToShore));

            float sandVisibility = 1.0 - smoothstep(-0.5, 7.5, minDistToShore);
            vec3 shoreBlend = mix(reefTransition, goldenSandBed * 0.42 + crystalCyan * 0.58, sandVisibility * (uIsNight > 0.5 ? 0.35 : 0.82));

            waterColor = mix(shoreBlend, deepOceanColor, shoreDepthT);
          } else {
            vec3 crestGlow = uQualityTier > 1.5 ? (uIsNight > 0.5 ? vec3(0.08, 0.22, 0.40) : vec3(0.04, 0.45, 0.65)) : uCrestGlowColor;
            waterColor = mix(waterColor, crestGlow, smoothstep(0.70, 1.0, waveMod) * (uIsNight > 0.5 ? 0.34 : 0.28));
          }

          // 4. Subsurface Scattering (Translucent Wave Crests)
          vec3 sss = vec3(0.0);
          if (camDist < uMaxSSSDist) {
            vec3 sssLightDir = normalize(lightDir + normal * (uQualityTier > 1.5 ? 0.45 : 0.35));
            float sssPower = uQualityTier > 1.5 ? 2.2 : 3.2;
            float sssFactor = pow(max(dot(viewDir, -sssLightDir), 0.0), sssPower);
            float crestThickness = smoothstep(uQualityTier > 1.5 ? 0.10 : 0.20, 1.1, vWaveHeight);
            float sssDistFade = 1.0 - smoothstep(uMaxSSSDist * 0.5, uMaxSSSDist, camDist);
            float sssMult = uQualityTier > 1.5 ? (uIsNight > 0.5 ? 1.25 : 1.35) : (uIsNight > 0.5 ? 0.92 : 0.85);
            vec3 sssColor = uQualityTier > 1.5 ? (uIsNight > 0.5 ? vec3(0.08, 0.26, 0.48) : vec3(0.03, 0.72, 0.66)) : uSubsurfaceColor;
            sss = sssColor * (sssFactor * crestThickness * sssMult * sssDistFade);
          }

          // 5. Physical Fresnel & Sky Reflection
          float NdotV = max(dot(viewDir, normal), 0.0);
          float fresnel = 0.02 + 0.98 * pow(1.0 - NdotV, 5.0);
          vec3 daySkyRefl = mix(vec3(0.04, 0.28, 0.55), vec3(0.20, 0.55, 0.85), fresnel);
          vec3 nightSkyRefl = mix(vec3(0.03, 0.09, 0.19), vec3(0.08, 0.19, 0.36), fresnel);
          vec3 skyReflection = mix(daySkyRefl, nightSkyRefl, uIsNight);

          vec3 baseShaded = mix(waterColor + sss, skyReflection, fresnel * (uIsNight > 0.5 ? 0.28 : 0.28));

          // 6. Dual-Frequency Sun/Moon Specular Glitter Highlights (Trigger for Cinematic Bloom)
          vec3 halfVector = normalize(lightDir + viewDir);
          float NdotH = max(dot(normal, halfVector), 0.0);
          if (NdotH > 0.03) {
            float specIntensity = 0.0;
            if (uQualityTier < 0.5) {
              // Fast mobile mode
              specIntensity = pow(NdotH, 48.0) * (uIsNight > 0.5 ? 0.65 : 0.90);
            } else if (uQualityTier > 1.5 && camDist < 360.0) {
              // Ultra Photorealism: High-intensity diamond specular glints
              float specularCore = pow(NdotH, 64.0) * (uIsNight > 0.5 ? 0.85 : 1.20);
              float specularSharp = pow(NdotH, 190.0) * (uIsNight > 0.5 ? 1.70 : 2.50);
              if (NdotH > 0.40) {
                float glitterNoise1 = fract(sin(dot(vWorldPosition.xz * 2.8, vec2(12.9898, 78.233)) + uTime * 0.9) * 43758.5453);
                float glitterNoise2 = fract(sin(dot(vWorldPosition.xz * 5.6, vec2(93.989, 67.345)) - uTime * 1.3) * 23421.631);
                float glitter1 = pow(NdotH, 300.0) * step(0.48, glitterNoise1) * (uIsNight > 0.5 ? 2.2 : 3.8);
                float glitter2 = pow(NdotH, 150.0) * step(0.62, glitterNoise2) * (uIsNight > 0.5 ? 1.5 : 2.4);
                specIntensity = specularCore + specularSharp + glitter1 + glitter2;
              } else {
                specIntensity = specularCore + specularSharp;
              }
            } else if (camDist < 240.0) {
              // Balanced web mode
              float specularCore = pow(NdotH, 64.0) * (uIsNight > 0.5 ? 0.72 : 0.95);
              float specularSharp = pow(NdotH, 180.0) * (uIsNight > 0.5 ? 1.30 : 1.80);
              if (NdotH > 0.45) {
                float glitterNoise = fract(sin(dot(vWorldPosition.xz * 2.2, vec2(12.9898, 78.233)) + uTime * 0.8) * 43758.5453);
                float glitter = pow(NdotH, 220.0) * step(0.60, glitterNoise) * (uIsNight > 0.5 ? 1.6 : 2.4);
                specIntensity = specularCore + specularSharp + glitter;
              } else {
                specIntensity = specularCore + specularSharp;
              }
            } else {
              specIntensity = pow(NdotH, 64.0) * (uIsNight > 0.5 ? 0.35 : 0.45);
            }
            specIntensity *= (1.0 - smoothstep(90.0, 360.0, camDist));
            baseShaded += uSunColor * specIntensity;
          }

          // 7. Organic Sea Foam on Wave Crests
          float crestFoam = 0.0;
          float crestBreak = smoothstep(0.68, 1.25, vWaveHeight) * smoothstep(0.06, 0.28, vCrestPinch);
          if (crestBreak > 0.01 && camDist < uMaxFoamDist) {
            float foamCell = cellularFoam(vWorldPosition.xz * 0.75 + vec2(uTime * 0.05, -uTime * 0.03));
            float foamStreak = sin(vWorldPosition.x * 1.2 + vWorldPosition.z * 0.8 + uTime * 1.5) * 0.5 + 0.5;
            float solidFroth = 1.0 - smoothstep(0.12, 0.42, foamCell);
            float lacyFoam = clamp(solidFroth * 0.85 + foamStreak * 0.35, 0.0, 1.0);
            float foamDistFade = 1.0 - smoothstep(uMaxFoamDist * 0.5, uMaxFoamDist, camDist);
            crestFoam = crestBreak * lacyFoam * foamDistFade;
          }

          // 8. Shoreline Breaking Surf Foam Wavelets
          float totalShoreFoam = 0.0;
          if (minDistToShore > -0.5 && minDistToShore < 6.0 && camDist < 320.0) {
            float contactBand = smoothstep(-0.5, 0.2, minDistToShore) * (1.0 - smoothstep(1.0, 3.6, minDistToShore));
            float surfPulse = sin(uTime * 2.0 - minDistToShore * 1.5) * 0.5 + 0.5;
            float swashWave = smoothstep(0.3, 1.8, minDistToShore) * (1.0 - smoothstep(2.0, 4.5, minDistToShore)) * surfPulse;
            float frothDetail = cellularFoam(vWorldPosition.xz * 1.2 + vec2(uTime * 0.08, -uTime * 0.06));
            float lacyFroth = 1.0 - smoothstep(0.12, 0.50, frothDetail);
            float shoreNoise = sin(vWorldPosition.x * 0.9 + vWorldPosition.z * 0.7 + uTime * 0.4) * 0.2 + 0.8;
            totalShoreFoam = clamp((contactBand * 0.55 + swashWave * 0.45) * (0.55 + lacyFroth * 0.45) * shoreNoise, 0.0, 0.35);
          }

          // 9. Dynamic Broad-Spreading Ship Wake
          float shipWakeFoam = 0.0;
          if (uWakesEnabled > 0.5 && uShipSpeed > 0.35 && camDist < 180.0) {
            vec2 rel = vWorldPosition.xz - uShipPos.xz;
            float sinH = sin(uShipHeading);
            float cosH = cos(uShipHeading);
            float lx = cosH * rel.x - sinH * rel.y;
            float lz = sinH * rel.x + cosH * rel.y;

            float behind = -lz;
            float maxWakeReach = uQualityTier > 1.5 ? 110.0 : 88.0;
            if (behind > -1.0 && behind < maxWakeReach) {
              float latDist = abs(lx);

              // Soft expanding Kelvin V-wake arms
              float wakeSpread = 1.2 + pow(max(0.0, behind), 0.62) * 1.35;
              float vArm = (1.0 - smoothstep(0.0, 1.6, abs(latDist - wakeSpread))) * 0.55;

              // Smooth center churn field
              float centerSpread = 1.8 + behind * 0.12;
              float centerFroth = exp(-(latDist * latDist) / (centerSpread * centerSpread)) * 0.65;

              float ripple = sin(behind * 0.4 - uTime * 1.8) * 0.1 + 0.9;
              float leadIn = smoothstep(-0.5, 2.0, behind);
              float trailFade = exp(-max(0.0, behind) * 0.038) * (1.0 - smoothstep(55.0, maxWakeReach, behind));

              shipWakeFoam = (vArm + centerFroth) * ripple * leadIn * trailFade * min(1.0, uShipSpeed / 2.0);
              shipWakeFoam = clamp(shipWakeFoam, 0.0, 0.70);
            }
          }

          // Combine foam layers naturally
          float totalFoam = clamp(crestFoam * 0.75 + totalShoreFoam + shipWakeFoam * 0.9, 0.0, 1.0);
          vec3 finalColor = mix(baseShaded, uFoamColor, totalFoam);

          // 10. Horizon Fog Blend
          float horizonFog = 1.0 - exp(-pow(camDist * uFogDensity, 2.0));
          finalColor = mix(finalColor, uSkyHorizonColor, horizonFog);

          gl_FragColor = vec4(finalColor, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
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

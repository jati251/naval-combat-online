import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { FOG_COLOR } from './Environment3D';
import { ARENA_ISLANDS } from './Islands3D';
import { useGameStore } from '@/stores/useGameStore';

interface OceanWaterProps {
  size?: number;
}

export const OceanWater: React.FC<OceanWaterProps> = React.memo(({ size = 1600 }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // High-density 160x160 vertex grid (25,600 quads) centered dynamically on camera
  // Delivers buttery-smooth organic swells and eliminates polygon faceting
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, 160, 160);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [size]);

  // Pack arena islands data into uniform arrays: position/seed and elongation params
  const islandPositions = useMemo(() => {
    return ARENA_ISLANDS.map((isl) => new THREE.Vector4(isl.x, isl.z, isl.sandRadius, isl.seed));
  }, []);

  const islandParams = useMemo(() => {
    return ARENA_ISLANDS.map((isl) =>
      isl.elongation
        ? new THREE.Vector4(isl.elongation.scaleX, isl.elongation.scaleZ, isl.elongation.angle, 1.0)
        : new THREE.Vector4(1.0, 1.0, 0.0, 0.0)
    );
  }, []);

  // Assassin's Creed IV: Black Flag & Sea of Thieves AAA Caribbean Ocean Shader
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDeepWaterColor: { value: new THREE.Color('#074574') }, // Rich Caribbean deep sapphire (never pitch black!)
        uMidWaterColor: { value: new THREE.Color('#0b71b0') },  // Luminous tropical sapphire
        uShallowColor: { value: new THREE.Color('#06b6d4') },   // Sunlit turquoise aqua
        uLagoonColor: { value: new THREE.Color('#10e7b8') },    // Crystal shallow shoreline lagoon
        uCrestGlowColor: { value: new THREE.Color('#38bdf8') }, // Radiant crest highlight
        uSubsurfaceColor: { value: new THREE.Color('#14b8a6') },// Bright tropical SSS transmission
        uFoamColor: { value: new THREE.Color('#ffffff') },      // Crisp clean white sea froth
        uSunColor: { value: new THREE.Color('#fffbeb') },       // Warm brilliant Caribbean sun
        uSkyHorizonColor: { value: new THREE.Color(FOG_COLOR) }, // Fog horizon match
        uLightDir: { value: new THREE.Vector3(70, 140, -50).normalize() },
        uIslandPos: { value: islandPositions },
        uIslandParams: { value: islandParams },
        uShipPos: { value: new THREE.Vector3(0, 0, 0) },
        uShipHeading: { value: 0 },
        uShipSpeed: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying float vWaveHeight;
        varying float vCrestPinch;

        struct Wave {
          vec2 direction;
          float steepness;
          float wavelength;
          float speed;
        };

        // 4 Primary Gerstner wave swells synchronized with server simulation
        // Sub-grid micro ripples are handled in fragment shader capillary normals
        // to eliminate Nyquist aliasing and swimming during camera rotation.
        const int NUM_WAVES = 4;
        const Wave waves[NUM_WAVES] = Wave[NUM_WAVES](
          // 1. Dominant Caribbean rolling swell
          Wave(vec2(1.0, 0.28), 0.11, 92.0, 2.6),
          // 2. Secondary diagonal cross-swell
          Wave(vec2(0.55, 0.85), 0.085, 48.0, 2.1),
          // 3. Intermediate surface swell
          Wave(vec2(-0.35, 0.92), 0.065, 28.0, 1.7),
          // 4. Moderate wind swell
          Wave(vec2(-0.75, -0.65), 0.045, 18.0, 1.4)
        );

        void main() {
          // Compute world origin before displacement so waves stay rock-solid when mesh follows camera
          vec4 worldOrigin = modelMatrix * vec4(position, 1.0);
          vec3 pos = worldOrigin.xyz;
          vec3 displaced = pos;

          vec3 tangent = vec3(1.0, 0.0, 0.0);
          vec3 binormal = vec3(0.0, 0.0, 1.0);
          float pinchAccum = 0.0;

          for (int i = 0; i < NUM_WAVES; i++) {
            Wave w = waves[i];
            vec2 d = normalize(w.direction);
            float k = 6.2831853 / w.wavelength;
            float c = w.speed;
            float a = w.steepness / k;

            float dx = d.x;
            float dz = d.y;

            float dotProd = dx * pos.x + dz * pos.z;
            float phase = k * (dotProd - c * uTime);
            float cosP = cos(phase);
            float sinP = sin(phase);

            // Gerstner trochoidal displacement (peaks pinch, troughs flatten)
            displaced.x += dx * (a * cosP);
            displaced.y += a * sinP;
            displaced.z += dz * (a * cosP);

            // Analytical Jacobian derivatives for exact surface normals
            tangent.x -= dx * dx * (w.steepness * sinP);
            tangent.y += dx * (w.steepness * cosP);
            tangent.z -= dx * dz * (w.steepness * sinP);

            binormal.x -= dx * dz * (w.steepness * sinP);
            binormal.y += dz * (w.steepness * cosP);
            binormal.z -= dz * dz * (w.steepness * sinP);

            // Accumulate crest steepness for physics-based foam detection
            pinchAccum += w.steepness * cosP;
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
        uniform vec4 uIslandPos[9];
        uniform vec4 uIslandParams[9];
        uniform vec3 uShipPos;
        uniform float uShipHeading;
        uniform float uShipSpeed;

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

        // Multi-Scale Directional Capillary Micro-Waves (crisp liquid shimmer)
        vec3 computeCapillaryNormal(vec2 p, float time) {
          vec2 d1 = normalize(vec2(0.707, 0.707));
          vec2 d2 = normalize(vec2(-0.8, 0.6));
          vec2 d3 = normalize(vec2(0.38, -0.92));

          float k1 = 6.2831853 / 4.2;
          float k2 = 6.2831853 / 2.2;
          float k3 = 6.2831853 / 1.1;

          float phase1 = k1 * (dot(d1, p) - 2.2 * time);
          float phase2 = k2 * (dot(d2, p) - 2.8 * time);
          float phase3 = k3 * (dot(d3, p) - 3.4 * time);

          float a1 = 0.032;
          float a2 = 0.018;
          float a3 = 0.009;

          float c1 = cos(phase1);
          float c2 = cos(phase2);
          float c3 = cos(phase3);

          float dh_dx = -(d1.x * k1 * a1 * c1 + d2.x * k2 * a2 * c2 + d3.x * k3 * a3 * c3);
          float dh_dz = -(d1.y * k1 * a1 * c1 + d2.y * k2 * a2 * c2 + d3.y * k3 * a3 * c3);

          return vec3(dh_dx, 1.0, dh_dz);
        }

        void main() {
          vec3 baseNormal = normalize(vNormal);
          vec3 lightDir = normalize(uLightDir);
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);

          // 1. High-Frequency Micro-Wave Capillary Normal Blending
          vec3 capNorm = computeCapillaryNormal(vWorldPosition.xz, uTime);
          vec3 normal = normalize(vec3(
            baseNormal.x + capNorm.x * 0.18,
            baseNormal.y,
            baseNormal.z + capNorm.z * 0.18
          ));

          // 2. Island Proximity & Shoreline Lagoon Shallows (Supports 9 Arena Islands with Contour Matching)
          float minDistToShore = 9999.0;
          for (int i = 0; i < 9; i++) {
            vec2 relPos = vWorldPosition.xz - uIslandPos[i].xy;
            float seed = uIslandPos[i].w;
            float sandR = uIslandPos[i].z;
            float isElongated = uIslandParams[i].w;

            if (isElongated > 0.5) {
              float rotA = uIslandParams[i].z;
              float cosA = cos(-rotA);
              float sinA = sin(-rotA);
              vec2 localPos = vec2(relPos.x * cosA - relPos.y * sinA, relPos.x * sinA + relPos.y * cosA);

              float scaleX = uIslandParams[i].x;
              float scaleZ = uIslandParams[i].y;
              float halfRidge = sandR * (scaleZ - scaleX);
              float clampedZ = clamp(localPos.y, -halfRidge, halfRidge);
              vec2 spineOffset = vec2(localPos.x, localPos.y - clampedZ);
              float distSpine = length(spineOffset);

              float spineAngle = atan(spineOffset.y, spineOffset.x);
              float elongatedNoise = sin(spineAngle * 5.0 + localPos.y * 0.15) * (sandR * scaleX * 0.08);
              float distToSand = distSpine - (sandR * scaleX * 1.15 + elongatedNoise);
              minDistToShore = min(minDistToShore, distToSand);
            } else {
              float distToCenter = length(relPos);
              float angle = atan(relPos.y, relPos.x);
              // Harmonic coastal noise identically matching createBeachGeometry
              float coastNoise = (sin(angle * 5.0 + seed * 0.1) * 0.08 +
                                  sin(angle * 11.0 + seed * 0.3) * 0.04 +
                                  sin(angle * 17.0 + seed * 0.7) * 0.02) * sandR;
              float distToSand = distToCenter - (sandR * 1.15 + coastNoise);
              minDistToShore = min(minDistToShore, distToSand);
            }
          }
          float shoreProximity = 1.0 - smoothstep(0.0, 32.0, max(0.0, minDistToShore));

          // 3. Multi-Depth Sunlit Tropical Gradient (Beer-Lambert optical absorption)
          // Depth factor floor ensures troughs never sink to near-black
          float depthFactor = clamp((vWaveHeight + 1.3) / 2.6, 0.12, 1.0);
          vec3 waterColor = mix(uDeepWaterColor, uMidWaterColor, smoothstep(0.08, 0.52, depthFactor));
          waterColor = mix(waterColor, uShallowColor, smoothstep(0.40, 0.88, depthFactor));
          waterColor = mix(waterColor, uCrestGlowColor, smoothstep(0.72, 1.0, depthFactor) * 0.50);

          // Deep ambient radiance floor in troughs (prevents dark mud/blackness)
          waterColor = max(waterColor, vec3(0.03, 0.18, 0.32));

          // Blend into luminous turquoise lagoon near island shores
          waterColor = mix(waterColor, uLagoonColor, shoreProximity * 0.76);

          // 4. Subsurface Scattering (bright tropical emerald glow through wave crests)
          vec3 sssLightDir = normalize(lightDir + normal * 0.35);
          float sssFactor = pow(max(dot(viewDir, -sssLightDir), 0.0), 3.2);
          float crestThickness = smoothstep(0.25, 1.2, vWaveHeight);
          vec3 sss = uSubsurfaceColor * (sssFactor * crestThickness * 0.7);

          // 5. Accurate Physical Fresnel & Sky Reflection (Schlick approximation)
          float NdotV = max(dot(viewDir, normal), 0.0);
          float fresnel = 0.02 + 0.98 * pow(1.0 - NdotV, 5.0);
          vec3 skyReflection = mix(vec3(0.18, 0.52, 0.85), vec3(0.65, 0.86, 1.0), fresnel);

          vec3 baseShaded = mix(waterColor + sss, skyReflection, fresnel * 0.55);

          // 6. Stable Anisotropic Multi-Lobe Sun Glitter Road (Flicker-Free During Camera Orbit)
          vec3 halfVector = normalize(lightDir + viewDir);
          float NdotH = max(dot(normal, halfVector), 0.0);
          float oceanBloomSheen = pow(NdotH, 14.0) * 0.40;  // Broad warm golden sun trail
          float specularCore    = pow(NdotH, 64.0) * 0.90;  // Core sun highlight
          float specularSharp   = pow(NdotH, 140.0) * 1.6;  // Brilliant crisp center

          baseShaded += uSunColor * (oceanBloomSheen + specularCore + specularSharp);

          // 7. Organic Lacy Cellular Sea Foam on Wave Crests
          float crestBreak = smoothstep(0.95, 1.45, vWaveHeight) * smoothstep(0.08, 0.32, vCrestPinch);
          float foamCell = cellularFoam(vWorldPosition.xz * 0.85 + vec2(uTime * 0.05, -uTime * 0.03));
          float bubbleWeb = smoothstep(0.08, 0.45, foamCell) * (1.0 - smoothstep(0.50, 0.88, foamCell));
          float solidHead = 1.0 - smoothstep(0.0, 0.22, foamCell);
          float lacyFoam = clamp(bubbleWeb * 1.5 + solidHead * 0.9, 0.0, 1.0);
          float crestFoam = crestBreak * lacyFoam;

          // 8. Shoreline Breaking Surf Foam
          float surfWave = sin(minDistToShore * 0.45 - uTime * 2.8);
          float shoreFoam = smoothstep(0.4, 0.9, surfWave) * shoreProximity * (1.0 - smoothstep(0.0, 16.0, max(0.0, minDistToShore)));
          float totalShoreFoam = shoreFoam * (0.6 + lacyFoam * 0.6);

          // 9. Dynamic Ship Wake Foam
          float shipWakeFoam = 0.0;
          if (uShipSpeed > 0.35) {
            vec2 rel = vWorldPosition.xz - uShipPos.xz;
            float sinH = sin(uShipHeading);
            float cosH = cos(uShipHeading);
            // Local coordinates: X = starboard, Z = forward
            float lx = cosH * rel.x - sinH * rel.y;
            float lz = sinH * rel.x + cosH * rel.y;

            float behind = -lz;
            if (behind > 0.0 && behind < 75.0) {
              // V-shaped Kelvin wake expansion
              float wakeWidth = 2.8 + behind * 0.34;
              float distArm = abs(abs(lx) - wakeWidth);
              float armFoam = (1.0 - smoothstep(0.0, 2.4, distArm)) * (1.0 - behind / 75.0);

              // Churning propeller/hull froth directly behind stern
              float sternFoam = (1.0 - smoothstep(0.0, 3.8, abs(lx))) * (1.0 - smoothstep(0.0, 24.0, behind));

              float wakeCell = cellularFoam(rel * 1.4 + uTime * 0.25);
              shipWakeFoam = clamp((armFoam * 1.3 + sternFoam * 1.6) * (0.35 + wakeCell * 0.8), 0.0, 1.0) * min(1.0, uShipSpeed / 3.5);
            }
          }

          // Combine all foam layers naturally
          float totalFoam = clamp(crestFoam * 0.75 + totalShoreFoam * 0.85 + shipWakeFoam * 0.9, 0.0, 1.0);
          vec3 finalColor = mix(baseShaded, uFoamColor, totalFoam);

          // 10. Horizon Fog (Matches Scene FOG_NEAR: 120, FOG_FAR: 750 for seamless blend)
          float dist = length(vWorldPosition - cameraPosition);
          float horizonFog = smoothstep(120.0, 740.0, dist);
          finalColor = mix(finalColor, uSkyHorizonColor, horizonFog);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      transparent: false,
      wireframe: false,
    });
  }, [islandPositions, islandParams]);

  // Smoothed real-time ship state refs to prevent 30Hz server-tick wake stutter
  const smoothShipPos = useRef(new THREE.Vector3(0, 0, 0));
  const smoothShipHeading = useRef(0);
  const smoothShipSpeed = useRef(0);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    if (shaderMaterial) {
      shaderMaterial.uniforms.uTime.value = t;

      // Extract self ship state in real-time with smooth frame-by-frame interpolation
      const { ships, selfId } = useGameStore.getState();
      const selfShip = ships.find((s) => s.id === selfId);
      if (selfShip && !selfShip.isSunk) {
        // High-precision smooth position and heading tracking
        const targetPos = new THREE.Vector3(selfShip.x, selfShip.y, selfShip.z);
        smoothShipPos.current.lerp(targetPos, Math.min(1.0, 24 * delta));
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

    // Grid snapping: Snap mesh position to 10m vertex grid steps.
    // This stops vertices from sliding across the world-space Gerstner coordinates
    // during camera movement or orbit, completely eliminating wave swimming & crawling!
    if (meshRef.current) {
      const gridStep = 10.0;
      meshRef.current.position.x = Math.floor(state.camera.position.x / gridStep) * gridStep;
      meshRef.current.position.z = Math.floor(state.camera.position.z / gridStep) * gridStep;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={shaderMaterial} position={[0, -0.05, 0]} />
  );
});

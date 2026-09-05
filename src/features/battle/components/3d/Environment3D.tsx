import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/stores/useGameStore';

export const FOG_COLOR = '#2b7ab8';
export const NIGHT_FOG_COLOR = '#060e1d';

// Exponential Atmospheric Haze Densities (Beer-Lambert Atmospheric Scattering)
export const FOG_DENSITY_DESKTOP = 0.0020;
export const FOG_DENSITY_DESKTOP_NIGHT = 0.0024;
export const FOG_DENSITY_MOBILE = 0.0032;
export const FOG_DENSITY_MOBILE_NIGHT = 0.0038;

// Desktop Render Distance & View Limits
export const FOG_NEAR_DESKTOP = 120;
export const FOG_FAR_DESKTOP = 450;
export const MAX_VIEW_DISTANCE_DESKTOP = 550;
export const ISLAND_DETAIL_DISTANCE_DESKTOP = 140;

// Mobile Render Distance & View Limits
export const FOG_NEAR_MOBILE = 60;
export const FOG_FAR_MOBILE = 260;
export const MAX_VIEW_DISTANCE_MOBILE = 350;
export const ISLAND_DETAIL_DISTANCE_MOBILE = 80;

// Nameplate cull distances
export const NAMEPLATE_CULL_DISTANCE = 110;
export const NAMEPLATE_CULL_DISTANCE_MOBILE = 55;

// Backward-compatible aliases
export const FOG_NEAR = FOG_NEAR_DESKTOP;
export const FOG_FAR = FOG_FAR_DESKTOP;
export const MAX_VIEW_DISTANCE = MAX_VIEW_DISTANCE_DESKTOP;
export const ISLAND_LOD_DISTANCE = ISLAND_DETAIL_DISTANCE_DESKTOP;

export function getFogConfig(isMobile: boolean, isNight: boolean) {
  return {
    color: isNight ? NIGHT_FOG_COLOR : FOG_COLOR,
    density: isMobile
      ? (isNight ? FOG_DENSITY_MOBILE_NIGHT : FOG_DENSITY_MOBILE)
      : (isNight ? FOG_DENSITY_DESKTOP_NIGHT : FOG_DENSITY_DESKTOP),
    near: isMobile ? (isNight ? 45 : FOG_NEAR_MOBILE) : (isNight ? 85 : FOG_NEAR_DESKTOP),
    far: isMobile ? (isNight ? 240 : FOG_FAR_MOBILE) : (isNight ? 420 : FOG_FAR_DESKTOP),
    viewDistance: isMobile ? MAX_VIEW_DISTANCE_MOBILE : MAX_VIEW_DISTANCE_DESKTOP,
    islandDetailDistance: isMobile ? ISLAND_DETAIL_DISTANCE_MOBILE : ISLAND_DETAIL_DISTANCE_DESKTOP,
  };
}

/**
 * Procedural High-Definition Billowy Cumulus Cloud Texture
 * Multiple organic vapor puffs with sunlit silver-lining tops and soft tropical shaded bellies.
 */
function createCumulusCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 512, 256);

  const drawPuff = (cx: number, cy: number, rx: number, ry: number, r: number, g: number, b: number, alpha: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    const grad = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 1.0);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
    grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${alpha * 0.78})`);
    grad.addColorStop(0.75, `rgba(${r}, ${g}, ${b}, ${alpha * 0.28})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // 1. Shaded underside billows (tropical sea reflection tint)
  drawPuff(180, 175, 115, 45, 205, 228, 250, 0.55);
  drawPuff(260, 170, 145, 52, 200, 224, 248, 0.65);
  drawPuff(345, 178, 110, 42, 205, 228, 250, 0.55);

  // 2. Main volumetric cloud body
  drawPuff(160, 140, 95, 48, 240, 248, 255, 0.75);
  drawPuff(225, 125, 120, 58, 250, 252, 255, 0.88);
  drawPuff(295, 120, 125, 60, 255, 255, 255, 0.92);
  drawPuff(365, 135, 90, 46, 245, 250, 255, 0.8);

  // 3. Towering cumulus crest billows (bright sunlit silver lining)
  drawPuff(245, 88, 85, 42, 255, 255, 255, 0.98);
  drawPuff(310, 80, 75, 38, 255, 255, 255, 0.95);
  drawPuff(195, 102, 65, 32, 252, 254, 255, 0.9);

  // 4. Subtle wispy vapor trails along flanks
  drawPuff(90, 160, 70, 24, 225, 240, 255, 0.4);
  drawPuff(430, 162, 75, 24, 225, 240, 255, 0.4);
  drawPuff(130, 172, 60, 18, 220, 236, 252, 0.35);
  drawPuff(395, 175, 65, 18, 220, 236, 252, 0.35);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Procedural Delicate High-Altitude Cirrus Streak Texture
 */
function createCirrusCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 512, 128);

  const drawStreak = (cx: number, cy: number, rx: number, ry: number, alpha: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    const grad = ctx.createRadialGradient(0, 0, 0.1, 0, 0, 1.0);
    grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    grad.addColorStop(0.5, `rgba(245, 250, 255, ${alpha * 0.5})`);
    grad.addColorStop(1, 'rgba(235, 245, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawStreak(256, 64, 230, 18, 0.55);
  drawStreak(180, 54, 150, 12, 0.45);
  drawStreak(330, 72, 160, 14, 0.45);
  drawStreak(110, 68, 90, 8, 0.35);
  drawStreak(400, 58, 95, 9, 0.35);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Multi-Tiered Caribbean Celestial Cloudscapes
 * Includes trade-wind cumulus banks and majestic high-altitude cirrus veils.
 */
const CaribbeanClouds2D: React.FC<{ isNight: boolean; isMobile?: boolean }> = ({ isNight, isMobile = false }) => {
  const cumulusTex = useMemo(() => createCumulusCloudTexture(), []);
  const cirrusTex = useMemo(() => createCirrusCloudTexture(), []);
  const windAngle = useGameStore((s) => s.windAngle);
  const groupRef = useRef<THREE.Group>(null);

  // Layer 1: Volumetric Mid-Sky Cumulus Banks (24 dynamic clouds with fixed celestial orientation)
  const cumulusClouds = useMemo(() => {
    const items = [];
    const count = isMobile ? 8 : 24;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.3 - 0.15);
      const dist = 220 + Math.random() * 140;
      const x = Math.cos(angle) * dist;
      const y = 62 + Math.random() * 45; // 62m to 107m altitude
      const z = Math.sin(angle) * dist;
      const horizDist = Math.sqrt(x * x + z * z);

      // Fixed 3D orientation tangent to the celestial sphere:
      const rotY = Math.atan2(x, z);
      const rotX = -Math.atan2(y, horizDist) * 0.42;

      items.push({
        id: `cumulus-${i}`,
        x,
        y,
        z,
        rotX,
        rotY,
        scaleX: 95 + Math.random() * 65,  // 95m to 160m width
        scaleY: 34 + Math.random() * 22,  // 34m to 56m height
        opacity: (0.65 + Math.random() * 0.22) * (isNight ? 0.45 : 1.0),
      });
    }
    return items;
  }, [isNight, isMobile]);

  // Layer 2: High Stratospheric Cirrus Streaks (14 grand veils with fixed celestial orientation)
  const cirrusClouds = useMemo(() => {
    const items = [];
    const count = isMobile ? 4 : 14;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
      const dist = 360 + Math.random() * 150;
      const x = Math.cos(angle) * dist;
      const y = 145 + Math.random() * 50; // 145m to 195m high altitude
      const z = Math.sin(angle) * dist;
      const horizDist = Math.sqrt(x * x + z * z);

      const rotY = Math.atan2(x, z);
      const rotX = -Math.atan2(y, horizDist) * 0.35;

      items.push({
        id: `cirrus-${i}`,
        x,
        y,
        z,
        rotX,
        rotY,
        scaleX: 190 + Math.random() * 110, // 190m to 300m expansive streaks
        scaleY: 28 + Math.random() * 14,
        opacity: (0.35 + Math.random() * 0.18) * (isNight ? 0.35 : 1.0),
      });
    }
    return items;
  }, [isNight, isMobile]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Keep cloud system centered horizontally with the camera (infinite celestial horizon)
      groupRef.current.position.x = state.camera.position.x;
      groupRef.current.position.z = state.camera.position.z;

      // Realistic trade-wind atmospheric drift across the sky
      const driftSpeed = 0.0012;
      groupRef.current.rotation.y += delta * driftSpeed * Math.cos(windAngle);
    }
  });

  const cloudColor = isNight ? '#94a3b8' : '#ffffff';

  return (
    <group ref={groupRef}>
      {/* High-Altitude Cirrus Veils (Fixed 3D Celestial Meshes - No Camera Spin) */}
      {cirrusClouds.map((c) => (
        <mesh
          key={c.id}
          position={[c.x, c.y, c.z]}
          rotation={[c.rotX, c.rotY, 0]}
          scale={[c.scaleX, c.scaleY, 1]}
        >
          <planeGeometry />
          <meshBasicMaterial
            map={cirrusTex}
            color={cloudColor}
            transparent
            opacity={c.opacity}
            depthWrite={false}
            fog={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Volumetric Trade-Wind Cumulus Banks (Fixed 3D Celestial Meshes - No Camera Spin) */}
      {cumulusClouds.map((c) => (
        <mesh
          key={c.id}
          position={[c.x, c.y, c.z]}
          rotation={[c.rotX, c.rotY, 0]}
          scale={[c.scaleX, c.scaleY, 1]}
        >
          <planeGeometry />
          <meshBasicMaterial
            map={cumulusTex}
            color={cloudColor}
            transparent
            opacity={c.opacity}
            depthWrite={false}
            fog={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
};

/**
 * Ultra-Vivid Celestial Sky Dome
 * Day: Brilliant Rayleigh Atmospheric Scattering, Solar Corona, & Crepuscular Godrays
 * Night: Midnight Obsidian/Indigo Sky, Radiant Silver Moon Disc, Lunar Corona, & Twinkling Stars
 */
const CaribbeanSkyDome: React.FC<{ isNight: boolean; isMobile?: boolean }> = ({ isNight, isMobile = false }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const shaderMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uIsNight: { value: isNight ? 1.0 : 0.0 },
        uTopColor: { value: new THREE.Color(isNight ? '#030712' : '#0284c7') },
        uMidColor: { value: new THREE.Color(isNight ? '#0a1226' : '#38bdf8') },
        uHorizonColor: { value: new THREE.Color(isNight ? NIGHT_FOG_COLOR : FOG_COLOR) },
        uCelestialPos: { value: new THREE.Vector3(70, 140, -50).normalize() },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uIsNight;
        uniform vec3 uTopColor;
        uniform vec3 uMidColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uCelestialPos;
        varying vec3 vWorldPosition;

        // Hash function for procedural twinkling star field
        float starHash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        void main() {
          vec3 dir = normalize(vWorldPosition);
          float h = max(0.0, dir.y);

          // Rayleigh atmospheric gradient
          vec3 skyLower = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.35, h));
          vec3 sky = mix(skyLower, uTopColor, smoothstep(0.25, 0.95, h));

          float celestialDot = max(0.0, dot(dir, uCelestialPos));

          if (uIsNight > 0.5) {
            // ──────────────── NIGHT BATTLE SKY ────────────────
            // 1. Procedural High-Altitude Star Field (skipped on mobile for GPU savings)
            #ifndef MOBILE_MODE
            if (h > 0.12) {
              vec3 starCoord = floor(dir * 180.0);
              float starVal = starHash(starCoord);
              if (starVal > 0.985) {
                float starIntensity = pow((starVal - 0.985) / 0.015, 3.0) * smoothstep(0.12, 0.45, h);
                sky += vec3(0.85, 0.92, 1.0) * starIntensity * 1.6;
              }
            }
            #endif

            // 2. Glowing Silver Moon Disc
            float moonDisc = smoothstep(0.9984, 0.9996, celestialDot) * 2.8;

            // 3. Soft Cool Lunar Corona & Night Sheen
            float innerLunarCorona = pow(celestialDot, 36.0) * 0.95;
            float broadLunarGlow = pow(celestialDot, 5.0) * 0.28;

            vec3 moonLight = vec3(0.92, 0.96, 1.0) * moonDisc +
                            vec3(0.72, 0.85, 1.0) * innerLunarCorona +
                            vec3(0.55, 0.72, 0.95) * broadLunarGlow;

            sky += moonLight;
          } else {
            // ──────────────── DAY BATTLE SKY ────────────────
            // 1. Brilliant white-hot sun disc
            float sunDisc = smoothstep(0.9986, 0.9998, celestialDot) * 4.0;
            
            // 2. Warm golden inner corona bloom
            float innerCorona = pow(celestialDot, 42.0) * 1.6;
            
            // 3. Focused atmospheric sunlight sheen (attenuated near horizon to prevent washing out the center sea)
            float broadGlow = pow(celestialDot, 16.0) * 0.25 * smoothstep(0.04, 0.20, h);
            
            // 4. Subtle crepuscular godrays radiating from the tropical sun
            vec3 sunToDir = dir - uCelestialPos;
            float rayAngle = atan(sunToDir.x, sunToDir.z);
            float r1 = sin(rayAngle * 14.0);
            float r2 = sin(rayAngle * 28.0 + 1.2);
            float r3 = sin(rayAngle * 42.0 - 0.7);
            float rayPattern = pow(max(0.0, r1 * 0.5 + r2 * 0.35 + r3 * 0.15 + 0.28), 3.0);
            float rayFalloff = smoothstep(0.68, 0.995, celestialDot) * (1.0 - smoothstep(0.998, 1.0, celestialDot));
            float godrays = rayPattern * rayFalloff * 0.35;

            vec3 sunLight = vec3(1.0, 0.98, 0.92) * sunDisc +
                            vec3(1.0, 0.93, 0.72) * (innerCorona + godrays) +
                            vec3(0.98, 0.92, 0.78) * broadGlow;

            sky += sunLight;
          }

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
    // Inject mobile define to skip expensive star hash
    if (isMobile) {
      mat.defines = { MOBILE_MODE: '' };
    }
    return mat;
  }, [isNight, isMobile]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.copy(state.camera.position);
    }
  });

  return (
    <mesh ref={meshRef} material={shaderMaterial}>
      <sphereGeometry args={[1200, isMobile ? 16 : 28, isMobile ? 8 : 14]} />
    </mesh>
  );
};

export const Environment3D: React.FC<{ isMobile?: boolean }> = React.memo(({ isMobile = false }) => {
  const timeOfDay = useGameStore((s) => s.timeOfDay);
  const isNight = timeOfDay === 'NIGHT';

  const lightPos: [number, number, number] = [70, 140, -50];

  const fogCfg = getFogConfig(isMobile, isNight);

  return (
    <>
      {/* Dynamic Celestial Sky Dome (Day Azure or Night Obsidian with Stars & Moon) */}
      <CaribbeanSkyDome isNight={isNight} isMobile={isMobile} />

      {/* Atmospheric Exponential Maritime Sea Fog (Beer-Lambert Atmospheric Scattering) */}
      <fogExp2 attach="fog" args={[fogCfg.color, fogCfg.density]} />

      {/* Celestial Directional Light (Brilliant Sun vs Silver Moon) */}
      <directionalLight
        position={lightPos}
        intensity={isNight ? 0.75 : 2.35}
        color={isNight ? '#c8dcff' : '#fffbeb'}
        castShadow={!isMobile}
        shadow-mapSize-width={isMobile ? 0 : 1024}
        shadow-mapSize-height={isMobile ? 0 : 1024}
        shadow-camera-near={10}
        shadow-camera-far={250}
        shadow-camera-left={-75}
        shadow-camera-right={75}
        shadow-camera-top={75}
        shadow-camera-bottom={-75}
        shadow-bias={-0.0003}
      />

      {/* Ambient Fill Lighting */}
      <ambientLight
        intensity={isNight ? 0.42 : 0.9}
        color={isNight ? '#162038' : '#cce6ff'}
      />

      {/* Ocean Reflection Hemisphere Fill */}
      <hemisphereLight
        args={
          isNight
            ? ['#1e293b', '#090d16', 0.45]
            : ['#38bdf8', '#0284c7', 0.85]
        }
      />

      {/* Multi-Tiered Celestial Cloudscapes (Cumulus & Cirrus) */}
      <CaribbeanClouds2D isNight={isNight} isMobile={isMobile} />
    </>
  );
});


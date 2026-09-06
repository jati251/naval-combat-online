import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "@/stores/useGameStore";
import { getMapConfig } from "../../maps";
import { SceneSunLight } from "./rendering/SceneSunLight";

export const FOG_COLOR = "#82bfe8";
export const NIGHT_FOG_COLOR = "#0d2444";

// Exponential Atmospheric Haze Densities (Beer-Lambert Atmospheric Scattering)
export const FOG_DENSITY_DESKTOP = 0.001;
export const FOG_DENSITY_DESKTOP_NIGHT = 0.0011;
export const FOG_DENSITY_MOBILE = 0.0013;
export const FOG_DENSITY_MOBILE_NIGHT = 0.0015;

// Desktop Render Distance & View Limits
export const FOG_NEAR_DESKTOP = 160;
export const FOG_FAR_DESKTOP = 550;
export const MAX_VIEW_DISTANCE_DESKTOP = 650;
export const ISLAND_DETAIL_DISTANCE_DESKTOP = 160;

// Mobile Render Distance & View Limits
export const FOG_NEAR_MOBILE = 90;
export const FOG_FAR_MOBILE = 350;
export const MAX_VIEW_DISTANCE_MOBILE = 450;
export const ISLAND_DETAIL_DISTANCE_MOBILE = 100;

// Nameplate cull distances (combat-relevant range for engagement and visibility)
export const NAMEPLATE_CULL_DISTANCE = 220;
export const NAMEPLATE_CULL_DISTANCE_MOBILE = 160;

// Backward-compatible aliases
export const FOG_NEAR = FOG_NEAR_DESKTOP;
export const FOG_FAR = FOG_FAR_DESKTOP;
export const MAX_VIEW_DISTANCE = MAX_VIEW_DISTANCE_DESKTOP;
export const ISLAND_LOD_DISTANCE = ISLAND_DETAIL_DISTANCE_DESKTOP;

export function getFogConfig(
  isMobile: boolean,
  isNight: boolean,
  customFogColor?: string,
) {
  return {
    color: customFogColor || (isNight ? NIGHT_FOG_COLOR : FOG_COLOR),
    density: isMobile
      ? isNight
        ? FOG_DENSITY_MOBILE_NIGHT
        : FOG_DENSITY_MOBILE
      : isNight
        ? FOG_DENSITY_DESKTOP_NIGHT
        : FOG_DENSITY_DESKTOP,
    near: isMobile
      ? isNight
        ? 70
        : FOG_NEAR_MOBILE
      : isNight
        ? 130
        : FOG_NEAR_DESKTOP,
    far: isMobile
      ? isNight
        ? 360
        : FOG_FAR_MOBILE
      : isNight
        ? 520
        : FOG_FAR_DESKTOP,
    viewDistance: isMobile
      ? MAX_VIEW_DISTANCE_MOBILE
      : MAX_VIEW_DISTANCE_DESKTOP,
    islandDetailDistance: isMobile
      ? ISLAND_DETAIL_DISTANCE_MOBILE
      : ISLAND_DETAIL_DISTANCE_DESKTOP,
  };
}

/**
 * Procedural High-Definition Billowy Cumulus Cloud Texture
 * Multiple organic vapor puffs with sunlit silver-lining tops and soft tropical shaded bellies.
 */
/**
 * Procedural High-Definition Billowy Cumulus Cloud Texture
 * Authored with a continuous vertical ambient-lighting gradient (source-in)
 * and soft feathered billow lobes for smooth 3D volume without harsh cutouts or overexposure.
 */
function createCumulusCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 512, 256);

  // Soft quadratic falloff puff drawing
  const drawDensityPuff = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    alpha: number,
  ) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    const grad = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 1.0);
    grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    grad.addColorStop(0.4, `rgba(255, 255, 255, ${alpha * 0.85})`);
    grad.addColorStop(0.7, `rgba(255, 255, 255, ${alpha * 0.4})`);
    grad.addColorStop(0.92, `rgba(255, 255, 255, ${alpha * 0.06})`);
    grad.addColorStop(1.0, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // ── PASS 1: Build the Cumulus Silhouette & Thickness Mask ──
  // Flat cumulus lifting condensation base
  drawDensityPuff(190, 168, 95, 34, 0.75);
  drawDensityPuff(260, 164, 115, 38, 0.85);
  drawDensityPuff(335, 168, 90, 32, 0.75);

  // Volumetric core body
  drawDensityPuff(170, 140, 80, 44, 0.85);
  drawDensityPuff(230, 128, 95, 50, 0.92);
  drawDensityPuff(295, 122, 100, 52, 0.94);
  drawDensityPuff(360, 136, 75, 40, 0.86);

  // Towering cumulus crest domes
  drawDensityPuff(245, 95, 70, 38, 0.9);
  drawDensityPuff(305, 88, 65, 35, 0.88);
  drawDensityPuff(195, 108, 55, 30, 0.82);

  // Soft flanking whisps
  drawDensityPuff(95, 158, 55, 22, 0.45);
  drawDensityPuff(425, 160, 60, 22, 0.45);
  drawDensityPuff(135, 168, 45, 18, 0.38);
  drawDensityPuff(390, 170, 50, 18, 0.38);

  // ── PASS 2: Unified Atmospheric Lighting Ramp (source-in) ──
  // Replaces color with a continuous vertical lighting ramp:
  // - Top: warm soft ivory white (calibrated to physically prevent clipping/overexposure under ACES tonemapping)
  // - Mid: soft sky-lit vapor
  // - Base: gentle tropical maritime ambient shadow
  ctx.globalCompositeOperation = "source-in";
  const lightGrad = ctx.createLinearGradient(0, 55, 0, 195);
  lightGrad.addColorStop(0.0, "rgba(224, 234, 244, 0.88)"); // Soft natural ivory crest
  lightGrad.addColorStop(0.35, "rgba(206, 220, 234, 0.84)"); // Volumetric upper body
  lightGrad.addColorStop(0.7, "rgba(168, 192, 216, 0.80)"); // Soft oceanic maritime shadow
  lightGrad.addColorStop(1.0, "rgba(135, 162, 190, 0.76)"); // Defined cloud base
  ctx.fillStyle = lightGrad;
  ctx.fillRect(0, 0, 512, 256);

  // ── PASS 3: Soft 3D Billow Crest Contours (source-atop) ──
  // Adds organic cauliflower billow volume to upper domes with subtle shading
  ctx.globalCompositeOperation = "source-atop";
  const drawContourPuff = (cx: number, cy: number, rx: number, ry: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    const grad = ctx.createRadialGradient(0, -0.2, 0.05, 0, 0, 1.0);
    grad.addColorStop(0, "rgba(235, 242, 250, 0.10)");
    grad.addColorStop(0.6, "rgba(225, 236, 246, 0.04)");
    grad.addColorStop(1.0, "rgba(215, 228, 242, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  drawContourPuff(245, 95, 60, 32);
  drawContourPuff(305, 88, 55, 30);
  drawContourPuff(210, 122, 70, 36);
  drawContourPuff(290, 116, 75, 38);

  // ── PASS 4: Soft Flat-Base Horizon Dissolve ──
  // Smoothly dissolves the very bottom of the cloud base into the atmospheric haze
  ctx.globalCompositeOperation = "destination-out";
  const baseDissolve = ctx.createLinearGradient(0, 180, 0, 210);
  baseDissolve.addColorStop(0, "rgba(0, 0, 0, 0)");
  baseDissolve.addColorStop(1, "rgba(0, 0, 0, 0.85)");
  ctx.fillStyle = baseDissolve;
  ctx.fillRect(0, 180, 512, 76);

  ctx.globalCompositeOperation = "source-over";

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Procedural Delicate High-Altitude Cirrus Streak Texture
 */
function createCirrusCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 512, 128);

  const drawStreak = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    alpha: number,
  ) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    const grad = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 1.0);
    grad.addColorStop(0, `rgba(215, 230, 245, ${alpha})`);
    grad.addColorStop(0.4, `rgba(205, 222, 240, ${alpha * 0.65})`);
    grad.addColorStop(0.75, `rgba(190, 212, 235, ${alpha * 0.2})`);
    grad.addColorStop(1, "rgba(180, 205, 230, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Ethereal stratospheric wisps
  drawStreak(256, 64, 170, 14, 0.35);
  drawStreak(185, 54, 120, 10, 0.26);
  drawStreak(330, 72, 130, 11, 0.26);
  drawStreak(125, 66, 70, 7, 0.18);
  drawStreak(390, 58, 75, 8, 0.18);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Multi-Tiered Caribbean Celestial Cloudscapes
 * Includes trade-wind cumulus banks and majestic high-altitude cirrus veils.
 */
const CaribbeanClouds2D: React.FC<{ isNight: boolean; isMobile?: boolean }> = ({
  isNight,
  isMobile = false,
}) => {
  const cumulusTex = useMemo(() => createCumulusCloudTexture(), []);
  const cirrusTex = useMemo(() => createCirrusCloudTexture(), []);
  const windAngle = useGameStore((s) => s.windAngle);
  const groupRef = useRef<THREE.Group>(null);

  // Layer 1: Volumetric Mid-Sky Cumulus Banks (18 well-distributed clouds across the 360° horizon)
  const cumulusClouds = useMemo(() => {
    const items = [];
    const count = isMobile ? 8 : 18;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.28 - 0.14);
      const dist = 240 + Math.random() * 120;
      const x = Math.cos(angle) * dist;
      const y = 65 + Math.random() * 40; // 65m to 105m altitude
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
        scaleX: 110 + Math.random() * 50, // 110m to 160m width
        scaleY: 36 + Math.random() * 18,
        opacity: (0.75 + Math.random() * 0.15) * (isNight ? 0.45 : 0.9),
      });
    }
    return items;
  }, [isNight, isMobile]);

  // Layer 2: High Stratospheric Cirrus Streaks (8 expansive veils)
  const cirrusClouds = useMemo(() => {
    const items = [];
    const count = isMobile ? 4 : 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.35 - 0.17);
      const dist = 360 + Math.random() * 130;
      const x = Math.cos(angle) * dist;
      const y = 145 + Math.random() * 45; // 145m to 190m altitude
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
        scaleX: 170 + Math.random() * 80,
        scaleY: 26 + Math.random() * 12,
        opacity: (0.3 + Math.random() * 0.15) * (isNight ? 0.25 : 0.6),
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

  // Soft natural Caribbean cloud tint (cream-tinted non-clipping white)
  const cloudColor = isNight ? "#384c68" : "#e0ebf5";

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
const CaribbeanSkyDome: React.FC<{ isNight: boolean; isMobile?: boolean }> = ({
  isNight,
  isMobile = false,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const currentMapId = useGameStore(
    (s) => s.currentMapId || s.currentRoom?.mapId || "caribbean",
  );
  const activeMap = useMemo(() => getMapConfig(currentMapId), [currentMapId]);
  const atmosphere = activeMap.atmosphere;

  const shaderMaterial = useMemo(() => {
    const topCol = isNight ? atmosphere.skyTopNight : atmosphere.skyTopDay;
    const horizCol = isNight
      ? atmosphere.skyHorizonNight
      : atmosphere.skyHorizonDay;

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uIsNight: { value: isNight ? 1.0 : 0.0 },
        uTopColor: { value: new THREE.Color(topCol) },
        uHorizonColor: { value: new THREE.Color(horizCol) },
        uCelestialPos: { value: new THREE.Vector3(70, 140, -50).normalize() },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vWorldPosition = position;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uIsNight;
        uniform vec3 uTopColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uCelestialPos;
        varying vec3 vWorldPosition;

        float starHash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        void main() {
          vec3 dir = normalize(vWorldPosition);
          float h = max(0.0, dir.y);

          // Gradien 2 warna murni (horizon ke top) tanpa lewat perantara kuning/midcolor
          float horizonFade = smoothstep(0.0, 0.15, h);
          vec3 sky = mix(uHorizonColor, uTopColor, horizonFade);

          float celestialDot = max(0.0, dot(dir, uCelestialPos));

          if (uIsNight > 0.5) {
            #ifndef MOBILE_MODE
            float starVal = starHash(floor(dir * 280.0));
            if (starVal > 0.988) {
              float starIntensity = pow((starVal - 0.988) / 0.012, 6.0) * (0.6 + 0.4 * sin(dir.x * 40.0 + dir.z * 30.0));
              sky += vec3(0.85, 0.92, 1.0) * starIntensity * smoothstep(0.05, 0.35, h);
            }
            #endif

            float moonDisc = smoothstep(0.9984, 0.9996, celestialDot) * 3.5;
            float moonGlow = pow(celestialDot, 28.0) * 0.95;
            float moonAmbient = pow(celestialDot, 6.0) * 0.22;

            vec3 moonLight = vec3(0.92, 0.96, 1.0) * moonDisc +
                             vec3(0.55, 0.72, 0.98) * moonGlow +
                             vec3(0.20, 0.35, 0.65) * moonAmbient;

            sky += moonLight;
          } else {
            // Day Sun tanpa Mie haze yang tumpang-tindih jadi hijau
            float sunDisc = smoothstep(0.9990, 0.9998, celestialDot);
            float corona = pow(celestialDot, 36.0) * 0.55;
            
            sky += vec3(1.0, 0.96, 0.88) * corona;
            sky += vec3(1.0, 1.0, 0.96) * sunDisc * 3.0;
          }

          gl_FragColor = vec4(sky, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });

    if (isMobile) {
      mat.defines = { MOBILE_MODE: "" };
    }
    return mat;
  }, [isNight, isMobile, atmosphere]);

  useEffect(() => () => shaderMaterial.dispose(), [shaderMaterial]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.copy(state.camera.position);
    }
  });

  return (
    <mesh ref={meshRef} material={shaderMaterial} renderOrder={-1000}>
      <sphereGeometry args={[800, isMobile ? 24 : 36, isMobile ? 14 : 20]} />
    </mesh>
  );
};

export const Environment3D: React.FC<{
  isMobile?: boolean;
  profile?: import("@/features/settings").GraphicProfile;
}> = React.memo(({ isMobile = false, profile }) => {
  const timeOfDay = useGameStore((s) => s.timeOfDay);
  const isNight = timeOfDay === "NIGHT";
  const currentMapId = useGameStore(
    (s) => s.currentMapId || s.currentRoom?.mapId || "caribbean",
  );
  const activeMap = useMemo(() => getMapConfig(currentMapId), [currentMapId]);
  const atmosphere = activeMap.atmosphere;

  const activeIsMobile = profile ? profile.id === "fast" : isMobile;
  const isUltra = profile?.id === "performance";

  const fogCfg = profile
    ? {
        color: isNight ? atmosphere.fogColorNight : atmosphere.fogColorDay,
        density: isNight ? profile.fogDensityNight : profile.fogDensityDay,
        near: profile.fogNear,
        far: profile.fogFar,
        viewDistance: profile.maxViewDistance,
        islandDetailDistance: profile.islandDetailDistance,
      }
    : getFogConfig(
        activeIsMobile,
        isNight,
        isNight ? atmosphere.fogColorNight : atmosphere.fogColorDay,
      );

  return (
    <>
      {/* Dynamic Celestial Sky Dome (Day Azure or Night Obsidian with Stars & Moon) */}
      <CaribbeanSkyDome isNight={isNight} isMobile={activeIsMobile} />

      {/* Atmospheric Exponential Maritime Sea Fog (Beer-Lambert Atmospheric Scattering) */}
      <fogExp2 attach="fog" args={[fogCfg.color, fogCfg.density]} />

      {/* Celestial Directional Light (Brilliant Sun vs Silver Moon) */}
      <SceneSunLight
        intensity={isUltra ? (isNight ? 1.88 : 3.05) : isNight ? 1.75 : 2.85}
        color={isNight ? atmosphere.moonColorNight : atmosphere.sunColorDay}
        shadows={profile ? profile.shadows : !activeIsMobile}
        shadowMapSize={profile?.shadowMapSize ?? 1024}
      />

      {/* Ambient Fill Lighting - Rich atmospheric moonlight wash */}
      <ambientLight
        intensity={isUltra ? (isNight ? 1.28 : 1.35) : isNight ? 1.2 : 1.25}
        color={isNight ? atmosphere.ambientNight : atmosphere.ambientDay}
      />

      {/* Ocean Reflection Hemisphere Fill */}
      <hemisphereLight
        args={
          isNight
            ? [
                atmosphere.hemiSkyNight,
                atmosphere.hemiGroundNight,
                isUltra ? 1.15 : 1.05,
              ]
            : [
                atmosphere.hemiSkyDay,
                atmosphere.hemiGroundDay,
                isUltra ? 1.25 : 1.15,
              ]
        }
      />

      {/* Multi-Tiered Celestial Cloudscapes (Cumulus & Cirrus) */}
      <CaribbeanClouds2D isNight={isNight} isMobile={activeIsMobile} />
    </>
  );
});

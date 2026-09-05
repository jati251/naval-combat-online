import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const FOG_COLOR = '#4fa2e8';
export const FOG_NEAR = 40;
export const FOG_FAR = 320;
export const MAX_VIEW_DISTANCE = 320;
export const ISLAND_LOD_DISTANCE = 160;
export const NAMEPLATE_CULL_DISTANCE = 120;

/**
 * Procedural 2D Soft Natural Caribbean Cloud Texture
 * Slender horizontal wispy cumulus with sunlit highlights and soft shaded base.
 */
function createCloudSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 512, 128);

  const drawPuff = (cx: number, cy: number, rx: number, ry: number, r: number, g: number, b: number, alpha: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    const grad = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 1.0);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
    grad.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, ${alpha * 0.7})`);
    grad.addColorStop(0.8, `rgba(${r}, ${g}, ${b}, ${alpha * 0.2})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // 1. Soft shaded base puffs (subtle Caribbean blue-tinted underside)
  drawPuff(180, 78, 110, 24, 225, 240, 255, 0.45);
  drawPuff(256, 76, 130, 28, 220, 238, 255, 0.55);
  drawPuff(330, 80, 105, 22, 225, 240, 255, 0.45);

  // 2. Mid soft body
  drawPuff(210, 64, 95, 22, 250, 252, 255, 0.65);
  drawPuff(260, 60, 105, 24, 255, 255, 255, 0.75);
  drawPuff(310, 65, 85, 20, 250, 252, 255, 0.65);

  // 3. Delicate horizontal wispy trails on flanks
  drawPuff(110, 74, 75, 14, 240, 248, 255, 0.4);
  drawPuff(400, 76, 80, 14, 240, 248, 255, 0.4);

  // 4. Sunlit gentle crest billows
  drawPuff(245, 48, 70, 16, 255, 255, 255, 0.85);
  drawPuff(285, 52, 60, 15, 255, 255, 255, 0.8);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Standard Game Dev 2D Billboard Cloud Layer
 * Realistic proportions: slender, horizontal, high on the horizon sky.
 * Never encroaches on player ship or clips the top UI.
 */
const CaribbeanClouds2D: React.FC = () => {
  const texture = useMemo(() => createCloudSpriteTexture(), []);
  const groupRef = useRef<THREE.Group>(null);

  const cloudSprites = useMemo(() => {
    const items: Array<{
      id: number;
      x: number;
      y: number;
      z: number;
      scaleX: number;
      scaleY: number;
      opacity: number;
    }> = [];
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.3 - 0.15);
      const dist = 230 + Math.random() * 50; // Clean 230m - 280m distant horizon perimeter
      items.push({
        id: i,
        x: Math.cos(angle) * dist,
        y: 52 + Math.random() * 22, // Natural horizon sky altitude (52m - 74m)
        z: Math.sin(angle) * dist,
        scaleX: 90 + Math.random() * 35, // Slender horizontal width (90m - 125m)
        scaleY: 16 + Math.random() * 6,  // Natural slender height (16m - 22m)
        opacity: 0.58 + Math.random() * 0.12,
      });
    }
    return items;
  }, []);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Keep cloud dome centered horizontally with the camera
      groupRef.current.position.x = state.camera.position.x;
      groupRef.current.position.z = state.camera.position.z;
      // Gentle celestial drift
      groupRef.current.rotation.y += delta * 0.003;
    }
  });

  return (
    <group ref={groupRef}>
      {cloudSprites.map((c) => (
        <sprite key={c.id} position={[c.x, c.y, c.z]} scale={[c.scaleX, c.scaleY, 1]}>
          <spriteMaterial map={texture} transparent opacity={c.opacity} depthWrite={false} fog={false} />
        </sprite>
      ))}
    </group>
  );
};

/**
 * Ultra-Fast Caribbean Sky Dome with Solar Corona Bloom & Crepuscular Godrays
 * Centered on camera, 800m radius - rendered at infinity behind all world objects.
 */
const CaribbeanSkyDome: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTopColor: { value: new THREE.Color('#0278c7') },    // Deep Caribbean azure zenith
        uHorizonColor: { value: new THREE.Color(FOG_COLOR) },// Exact match with fog horizon
        uSunPos: { value: new THREE.Vector3(70, 140, -50).normalize() },
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
        uniform vec3 uTopColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunPos;
        varying vec3 vWorldPosition;

        void main() {
          vec3 dir = normalize(vWorldPosition);
          float h = max(0.0, dir.y);

          // Fast power gradient
          vec3 sky = mix(uHorizonColor, uTopColor, pow(h, 0.45));

          // Multi-layer Solar Bloom, Crepuscular Godrays & Radiant Corona
          float sunDot = max(0.0, dot(dir, uSunPos));
          
          // 1. Brilliant white-hot sun disc
          float sunDisc = smoothstep(0.9985, 0.9998, sunDot) * 3.5;
          
          // 2. Intense golden inner bloom corona
          float innerCorona = pow(sunDot, 48.0) * 1.5;
          
          // 3. Wide atmospheric sunlight bloom sheen
          float broadGlow = pow(sunDot, 6.0) * 0.45;
          
          // 4. Subtle crepuscular godrays radiating in the sky atmosphere
          vec3 sunToDir = dir - uSunPos;
          float rayAngle = atan(sunToDir.x, sunToDir.z);
          float r1 = sin(rayAngle * 14.0);
          float r2 = sin(rayAngle * 28.0 + 1.2);
          float r3 = sin(rayAngle * 42.0 - 0.7);
          float rayPattern = pow(max(0.0, r1 * 0.5 + r2 * 0.35 + r3 * 0.15 + 0.28), 3.2);
          float rayFalloff = smoothstep(0.7, 0.995, sunDot) * (1.0 - smoothstep(0.998, 1.0, sunDot));
          float godrays = rayPattern * rayFalloff * 0.32;

          vec3 sunLight = vec3(1.0, 0.98, 0.9) * sunDisc +
                          vec3(1.0, 0.94, 0.7) * (innerCorona + godrays) +
                          vec3(0.98, 0.9, 0.75) * broadGlow;

          sky += sunLight;

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.copy(state.camera.position);
    }
  });

  return (
    <mesh ref={meshRef} material={shaderMaterial}>
      <sphereGeometry args={[800, 24, 12]} />
    </mesh>
  );
};

export const Environment3D: React.FC = React.memo(() => {
  const sunPos: [number, number, number] = [70, 140, -50];

  return (
    <>
      {/* 100% Guaranteed Vivid Caribbean Azure Sky Dome */}
      <CaribbeanSkyDome />

      {/* Atmospheric Tropical Sea Fog (Standard Game Dev 90m - 440m) */}
      <fog attach="fog" args={[FOG_COLOR, FOG_NEAR, FOG_FAR]} />

      {/* Brilliant Overhead Caribbean Sunlight */}
      <directionalLight
        position={sunPos}
        intensity={2.2}
        color="#fffbeb"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={10}
        shadow-camera-far={250}
        shadow-camera-left={-75}
        shadow-camera-right={75}
        shadow-camera-top={75}
        shadow-camera-bottom={-75}
        shadow-bias={-0.0003}
      />

      {/* Rich Tropical Ambient Fill & Ocean Reflection */}
      <ambientLight intensity={0.85} color="#cce6ff" />
      <hemisphereLight args={['#38bdf8', '#0284c7', 0.8]} />

      {/* Standard Game Dev 2D Billboard Horizon Clouds */}
      <CaribbeanClouds2D />
    </>
  );
});



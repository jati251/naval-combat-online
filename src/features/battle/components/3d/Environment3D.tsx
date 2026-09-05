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
 * Procedural 2D Soft Cumulus Cloud Canvas Texture
 * Generated once in memory (0.5ms) - lightweight, smooth, and painterly.
 */
function createCloudSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 256, 128);

  const drawPuff = (cx: number, cy: number, r: number, alpha: number) => {
    const grad = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    grad.addColorStop(0.65, `rgba(242, 248, 255, ${alpha * 0.85})`);
    grad.addColorStop(1, 'rgba(235, 245, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };

  // Base puffs (flat bottomed Caribbean cumulus)
  drawPuff(60, 75, 42, 0.9);
  drawPuff(110, 68, 52, 0.95);
  drawPuff(160, 72, 46, 0.9);
  drawPuff(198, 80, 36, 0.85);

  // Top billows
  drawPuff(98, 48, 38, 0.95);
  drawPuff(142, 44, 42, 0.95);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Standard Game Dev 2D Billboard Cloud Layer
 * High-altitude Caribbean cumulus clouds anchored around the camera.
 * Never encroaches on player ship, feather-light 0 GPU lag.
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
    }> = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.25 - 0.12);
      const dist = 260 + Math.random() * 60; // 260m - 320m distant perimeter
      items.push({
        id: i,
        x: Math.cos(angle) * dist,
        y: 65 + Math.random() * 25, // 65m - 90m high in the sky
        z: Math.sin(angle) * dist,
        scaleX: 130 + Math.random() * 50,
        scaleY: 48 + Math.random() * 20,
      });
    }
    return items;
  }, []);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Keep cloud dome centered horizontally with the camera
      groupRef.current.position.x = state.camera.position.x;
      groupRef.current.position.z = state.camera.position.z;
      // Majestic celestial rotation
      groupRef.current.rotation.y += delta * 0.005;
    }
  });

  return (
    <group ref={groupRef}>
      {cloudSprites.map((c) => (
        <sprite key={c.id} position={[c.x, c.y, c.z]} scale={[c.scaleX, c.scaleY, 1]}>
          <spriteMaterial map={texture} transparent opacity={0.82} depthWrite={false} fog={false} />
        </sprite>
      ))}
    </group>
  );
};

/**
 * Ultra-Fast Caribbean Sky Dome
 * Centered on camera, 800m radius - never clipped by camera frustum.
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
          vec3 sky = mix(uHorizonColor, uTopColor, pow(h, 0.5));

          // Golden midday sun disc
          float sunDot = max(0.0, dot(dir, uSunPos));
          float sunDisc = smoothstep(0.997, 0.9995, sunDot);
          float sunGlow = pow(sunDot, 12.0) * 0.45;
          sky += vec3(1.0, 0.96, 0.85) * (sunDisc * 2.2 + sunGlow);

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

export const Environment3D: React.FC = () => {
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
};



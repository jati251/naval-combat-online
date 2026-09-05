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
 * Procedural 2D Feathery Cirrocumulus / Stratus Cloud Texture
 * Wide, soft, painterly horizontal wisps that look realistic and majestic.
 */
function createCloudSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 512, 128);

  // Helper to draw soft horizontal elliptical puffs
  const drawWisp = (cx: number, cy: number, rx: number, ry: number, alpha: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    const grad = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 1.0);
    grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    grad.addColorStop(0.35, `rgba(255, 255, 255, ${alpha * 0.85})`);
    grad.addColorStop(0.7, `rgba(240, 248, 255, ${alpha * 0.35})`);
    grad.addColorStop(1, 'rgba(235, 245, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Multiple soft, horizontally stretched wisps composing an elegant Caribbean sky cloud
  drawWisp(256, 64, 190, 32, 0.55);
  drawWisp(200, 60, 130, 26, 0.65);
  drawWisp(310, 68, 140, 24, 0.6);
  drawWisp(140, 66, 95, 20, 0.45);
  drawWisp(370, 62, 100, 20, 0.45);
  drawWisp(256, 52, 110, 20, 0.7);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Standard Game Dev 2D Billboard Cloud Layer
 * High-altitude Caribbean wispy clouds floating in the upper troposphere (120m - 165m).
 * Feather-light, zero visual clutter near the ship or HUD header.
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
      const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.35 - 0.17);
      const dist = 320 + Math.random() * 80; // Far on the horizon perimeter
      items.push({
        id: i,
        x: Math.cos(angle) * dist,
        y: 120 + Math.random() * 45, // Elevated high in the sky (120m - 165m)
        z: Math.sin(angle) * dist,
        scaleX: 180 + Math.random() * 80, // Wide horizontal wisps
        scaleY: 22 + Math.random() * 12,  // Flat vertical profile
        opacity: 0.45 + Math.random() * 0.15,
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
 * Ultra-Fast Caribbean Sky Dome with Solar Corona Bloom
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
          vec3 sky = mix(uHorizonColor, uTopColor, pow(h, 0.45));

          // Multi-layer Solar Bloom & Radiant Corona
          float sunDot = max(0.0, dot(dir, uSunPos));
          
          // 1. Brilliant white-hot sun disc
          float sunDisc = smoothstep(0.9985, 0.9998, sunDot) * 3.5;
          
          // 2. Intense golden inner bloom corona
          float innerCorona = pow(sunDot, 48.0) * 1.4;
          
          // 3. Wide atmospheric sunlight bloom sheen
          float broadGlow = pow(sunDot, 6.0) * 0.45;
          
          vec3 sunLight = vec3(1.0, 0.98, 0.88) * sunDisc +
                          vec3(1.0, 0.92, 0.65) * innerCorona +
                          vec3(0.95, 0.88, 0.72) * broadGlow;

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



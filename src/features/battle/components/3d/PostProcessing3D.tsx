import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * Lightweight native Three.js Post-Processing
 * Adds subtle cinematic bloom on sunlight glimmers and cannon fire
 * with full ACESFilmic tone mapping and sRGB color accuracy.
 */
export const PostProcessing3D: React.FC = () => {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef<EffectComposer | null>(null);

  useEffect(() => {
    const composer = new EffectComposer(gl);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Delicate bloom: threshold 0.95 ensures only extreme sun glints & muzzle flashes bloom
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      0.15, // bloom strength (delicate, anti-glare)
      0.2, // bloom radius
      0.95 // bloom threshold
    );
    composer.addPass(bloomPass);

    // OutputPass preserves ACESFilmic tone mapping & sRGB output curve
    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    composerRef.current = composer;

    return () => {
      composer.dispose();
      composerRef.current = null;
    };
  }, [gl, scene, camera, size]);

  // Override standard render loop with composer
  useFrame(() => {
    if (composerRef.current) {
      composerRef.current.render();
    }
  }, 1);

  return null;
};

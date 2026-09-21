import * as THREE from 'three';
import type { FXParticle } from './cannonParticlePool';

export function compileParticleAppearance(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.vertexShader = 'attribute vec2 particleStyle; varying float particleFade;\n' + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace('gl_PointSize = size;', 'gl_PointSize = particleStyle.x; particleFade = particleStyle.y;');
  shader.fragmentShader = 'varying float particleFade;\n' + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.a *= particleFade;');
}

export function writeParticleAppearance(attribute: THREE.BufferAttribute, index: number, p: FXParticle, kind: 'Smoke'|'Flash'|'Sparks'|'Plumes') {
  const remaining = Math.max(0, p.life / Math.max(0.001,p.maxLife));
  const age = 1 - remaining;
  const fade = kind === 'Flash' || kind === 'Sparks' ? remaining * remaining : Math.min(1,age*12) * remaining * remaining;
  const size = kind === 'Smoke' ? p.size * (0.3 + age*0.85)
    : kind === 'Flash' ? p.size * (0.1 + remaining*0.2)
    : kind === 'Sparks' ? Math.min(0.4,p.size) : p.size*(0.25+age*0.5);
  attribute.setXY(index,Math.max(0.05,size),fade);
}

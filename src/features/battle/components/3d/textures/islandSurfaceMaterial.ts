import * as THREE from 'three';
import { getWeatherNoise } from './oceanTextures';

let cachedIslandSurfaceMaterial: THREE.MeshStandardMaterial | undefined;

/** Height and slope blending keeps the beach attached to the actual terrain. */
export function islandSurfaceMaterial() {
  if (cachedIslandSurfaceMaterial) return cachedIslandSurfaceMaterial;
  const detail = getWeatherNoise();
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, bumpMap: detail, bumpScale: 0.16 });
  material.onBeforeCompile = shader => {
    shader.uniforms.groundDetail = { value: detail };
    shader.vertexShader = 'varying vec3 groundPosition; varying vec3 groundNormal;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      groundPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      vec3 scaleSquared = vec3(dot(modelMatrix[0].xyz, modelMatrix[0].xyz), dot(modelMatrix[1].xyz, modelMatrix[1].xyz), dot(modelMatrix[2].xyz, modelMatrix[2].xyz));
      groundNormal = normalize(mat3(modelMatrix) * (normal / scaleSquared));`);
    shader.fragmentShader = `varying vec3 groundPosition;
      varying vec3 groundNormal;
      uniform sampler2D groundDetail;
      float cachedGroundGrain = 0.5;
      float groundHeight(vec3 p) {
        vec3 n2 = groundNormal * groundNormal;
        vec3 w = n2 * n2;
        w /= max(w.x + w.y + w.z, 0.001);
        return dot(vec3(texture2D(groundDetail,p.zy*0.24).g, texture2D(groundDetail,p.xz*0.24).g, texture2D(groundDetail,p.xy*0.24).g), w);
      }
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      float broad = texture2D(groundDetail, groundPosition.xz * 0.013).r;
      float grain = groundHeight(groundPosition);
      cachedGroundGrain = grain;
      float fine = texture2D(groundDetail, groundPosition.xz * 0.85).g;
      float sand = 1.0 - smoothstep(1.2, 3.5, groundPosition.y + (broad - 0.5) * 2.0);
      float wet = 1.0 - smoothstep(0.1, 1.3, groundPosition.y);
      float cliff = smoothstep(0.22, 0.64, 1.0 - abs(normalize(groundNormal).y));
      vec3 soil = mix(vec3(0.105,0.075,0.041), vec3(0.19,0.15,0.08), broad);
      vec3 grass = mix(vec3(0.065,0.089,0.025), vec3(0.18,0.21,0.066), broad);
      vec3 land = mix(soil, grass, smoothstep(0.27,0.65,grain + broad * 0.25));
      vec3 rock = mix(vec3(0.17,0.155,0.125), vec3(0.31,0.29,0.24), grain);
      float strata = sin(groundPosition.y * 5.0 + broad * 12.0) * 0.04;
      rock *= 0.92 + strata + fine * 0.12;
      land = mix(land, rock, cliff);
      vec3 beach = mix(vec3(0.57,0.48,0.32), vec3(0.31,0.25,0.15), wet);
      beach *= 0.86 + grain * 0.20 + fine * 0.08;
      diffuseColor.rgb *= mix(land * (0.8 + fine * 0.3), beach, sand * (1.0 - cliff * 0.6));
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(0.88 + fine * 0.10, 0.30 + grain * 0.12, wet * sand);');
    shader.fragmentShader = shader.fragmentShader.replace('#include <bumpmap_pars_fragment>', THREE.ShaderChunk.bumpmap_pars_fragment
      .replace('texture2D( bumpMap, vBumpMapUv ).x', 'cachedGroundGrain')
      .replace('texture2D( bumpMap, vBumpMapUv + dSTdx ).x', 'groundHeight(groundPosition + dFdx(groundPosition))')
      .replace('texture2D( bumpMap, vBumpMapUv + dSTdy ).x', 'groundHeight(groundPosition + dFdy(groundPosition))'));
  };
  material.customProgramCacheKey = () => 'island-ground-v2';
  cachedIslandSurfaceMaterial = material;
  return material;
}

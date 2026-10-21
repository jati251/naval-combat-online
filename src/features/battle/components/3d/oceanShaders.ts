import { atmosphereFunctionsGLSL, weatherUniformsGLSL, stormMathGLSL } from './atmosphereShaders';

const coastSampling = `
        uniform sampler2D uCoastalHeight;
        uniform vec4 uCoastalBounds;
        uniform float uCoastalResolution;

        float terrainHeight(vec2 worldXZ) {
          vec2 uv = (worldXZ - uCoastalBounds.xy) / uCoastalBounds.zw;
          if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return -8.0;
          uv = uv * (1.0 - 1.0 / uCoastalResolution) + 0.5 / uCoastalResolution;
          vec2 packedHeight = texture2D(uCoastalHeight, uv).rg;
          return -8.0 + dot(packedHeight, vec2(65280.0, 255.0)) * (16.0 / 65535.0);
        }
        float shoreWaveWeight(float height) {
          return smoothstep(0.0, 2.5, max(0.0, -height));
        }
`;

export const getOceanVertexShader = (waveShaderChunk: string) => `
        uniform float uTime;
        ${coastSampling}
        ${stormMathGLSL}
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying float vWaveHeight;
        varying float vCrestPinch;
        varying float vSeabed;

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
          float seabed = terrainHeight(pos.xz);
          vSeabed = seabed;
          float waveWeight = shoreWaveWeight(seabed);
          float seaScale = 1.0 + stormAt(pos.xz) * 1.8;
          waveWeight *= seaScale;

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
            float sSin = w.steepness * waveWeight * sinP;
            float sCos = w.steepness * waveWeight * cosP;
            float dxdz = w.dir.x * w.dir.y;

            tangent.x -= w.dir.x * w.dir.x * sSin;
            tangent.y += w.dir.x * sCos;
            tangent.z -= dxdz * sSin;

            binormal.x -= dxdz * sSin;
            binormal.y += w.dir.y * sCos;
            binormal.z -= w.dir.y * w.dir.y * sSin;

            pinchAccum += sSin;
          }

          displaced = mix(pos, displaced, waveWeight);
          vec3 calcNormal = normalize(cross(binormal, tangent));
          vNormal = calcNormal;
          vWaveHeight = displaced.y;
          vCrestPinch = pinchAccum;
          vWorldPosition = displaced;

          gl_Position = projectionMatrix * viewMatrix * vec4(displaced, 1.0);
        }
`;

export const getOceanFragmentShader = (_waveShaderChunk: string) => `
        ${coastSampling}
        ${weatherUniformsGLSL}
        ${atmosphereFunctionsGLSL}
        uniform sampler2D uWaterDetail;
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
        uniform float uIsMobile;
        uniform float uIsNight;
        uniform float uFogDensity;
        uniform float uQualityTier;
        uniform float uHorizonCutoff;
        uniform float uMaxCapDist;
        uniform float uMaxSSSDist;
        uniform float uMaxFoamDist;

        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying float vWaveHeight;
        varying float vCrestPinch;
        varying float vSeabed;

        float pow5(float x) {
          float x2 = x * x;
          return x2 * x2 * x;
        }

        float cellularFoam(vec2 p) {
          return texture2D(uWaterDetail, p * 0.0625).b;
        }

        vec3 computeCapillaryNormal(vec2 p, float time, float tier) {
          vec2 wind = uWind;
          vec2 across = vec2(-wind.y, wind.x);
          vec2 q = vec2(dot(p, wind), dot(p, across));
          vec2 uv = q * 0.03125 - vec2(time * 0.008, time * 0.0015);
          vec2 n = texture2D(uWaterDetail, uv).rg - 0.5;
          if (tier > 0.5) {
            vec2 secondary = vec2(q.x * 0.94 - q.y * 0.342, q.x * 0.342 + q.y * 0.94);
            vec2 detail = texture2D(uWaterDetail, secondary * 0.073 + vec2(-time * 0.011, time * 0.002)).rg - 0.5;
            n += vec2(detail.x * 0.94 + detail.y * 0.342, -detail.x * 0.342 + detail.y * 0.94) * 0.42;
          }
          vec2 worldSlope = wind * n.x + across * n.y;
          return vec3(worldSlope.x, 1.0, worldSlope.y);
        }

        void main() {
          vec3 viewOffset = cameraPosition - vWorldPosition;
          float camDist = length(viewOffset);

          // Skip per-pixel coastal texture lookup in deep open water (>6.5m depth)
          float seabed = vSeabed > -6.5 ? terrainHeight(vWorldPosition.xz) : -8.0;
          if (seabed >= 0.0) discard;
          if (camDist >= uHorizonCutoff) {
            gl_FragColor = vec4(uSkyHorizonColor, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
            return;
          }
          float waveWeight = shoreWaveWeight(seabed);
          vec3 baseNormal = normalize(vNormal);
          vec3 lightDir = uLightDir;
          vec3 viewDir = viewOffset / max(camDist, 0.0001);

          // 1. High-Frequency Micro-Wave Capillary Normal Blending
          vec3 normal = baseNormal;
          if (camDist < uMaxCapDist) {
            float capStrength = (1.0 - smoothstep(uMaxCapDist * 0.35, uMaxCapDist, camDist)) * waveWeight;
            vec3 capNorm = computeCapillaryNormal(vWorldPosition.xz, uTime, uQualityTier);
            float capWeight = (0.68 + uStorm * 0.3) * capStrength;
            normal = normalize(vec3(
              baseNormal.x + capNorm.x * capWeight,
              baseNormal.y,
              baseNormal.z + capNorm.z * capWeight
            ));
          }

          // 2. Coastal Water Depth & Volumetric Trough/Crest Chromatic Gradient
          float minDistToShore = max(0.0, -seabed) * 4.0;

          float waveMod = clamp((vWaveHeight + 0.8) * 0.625, 0.0, 1.0);
          float troughAO = clamp(0.88 + vWaveHeight * 0.14 + vCrestPinch * 0.18, 0.72, 1.16);
          vec3 deepOceanColor = mix(uDeepWaterColor * 0.55, uMidWaterColor * 0.68, waveMod * 0.36) * troughAO;
          float depth = max(0.0, -seabed) * (1.0 + 8.0 * smoothstep(2.0, 4.0, -seabed)) + 0.5;
          vec3 transmission = exp(-vec3(0.45, 0.13, 0.09) * depth);
          vec3 shelfColor = mix(uShallowColor, uLagoonColor, 0.28);
          vec3 waterColor = mix(deepOceanColor, shelfColor, transmission);

          // 4. Subsurface Scattering (Translucent Wave Crests)
          vec3 sss = vec3(0.0);
          if (camDist < uMaxSSSDist) {
            vec3 sssLightDir = normalize(lightDir + normal * (uQualityTier > 1.5 ? 0.45 : 0.35));
            float sssDot = max(dot(viewDir, -sssLightDir), 0.0);
            float sssDot2 = sssDot * sssDot;
            float sssFactor = uQualityTier > 1.5 ? sssDot2 : (sssDot2 * sssDot);
            float crestThickness = smoothstep(uQualityTier > 1.5 ? 0.08 : 0.18, 1.05, vWaveHeight + vCrestPinch * 0.35);
            float sssDistFade = 1.0 - smoothstep(uMaxSSSDist * 0.5, uMaxSSSDist, camDist);
            float sssMult = uQualityTier > 1.5 ? (uIsNight > 0.5 ? 1.25 : 1.38) : (uIsNight > 0.5 ? 0.92 : 0.88);
            vec3 sssColor = uQualityTier > 1.5 ? (uIsNight > 0.5 ? vec3(0.08, 0.26, 0.48) : vec3(0.03, 0.74, 0.68)) : uSubsurfaceColor;
            sss = sssColor * (sssFactor * crestThickness * sssMult * sssDistFade);
          }

          // 5. Physical Fresnel & Sky Reflection
          float NdotV = max(dot(viewDir, normal), 0.001);
          float fresnel = 0.02 + 0.98 * pow5(1.0 - NdotV);
          vec3 reflNormal = normalize(mix(vec3(0.0, 1.0, 0.0), normal, 0.72));
          vec3 reflectionDir = reflect(-viewDir, reflNormal);
          vec3 skyReflection = atmosphereColor(reflectionDir, uSkyHorizonColor, uSunColor, lightDir, uIsNight, uTime, vWorldPosition.xz, false);
          waterColor = mix(waterColor, waterColor * vec3(0.48, 0.62, 0.65), uStorm);

          vec3 baseShaded = mix(waterColor + sss * 0.48, skyReflection, fresnel);

          // Normal variance broadens unresolved highlights instead of letting them shimmer.
          vec3 halfVector = normalize(lightDir + viewDir);
          float NdotH = max(dot(normal, halfVector), 0.0);
          float roughPatch = texture2D(uWaterDetail, vWorldPosition.xz * 0.009 + uWind * uTime * 0.001).a;
          vec3 normalDx = dFdx(normal), normalDy = dFdy(normal);
          float variance = min(0.12, dot(normalDx, normalDx) + dot(normalDy, normalDy));
          float rRough = mix(0.17, 0.29, roughPatch);
          float rRough2 = rRough * rRough;
          float alphaSquared = clamp(rRough2 * rRough2 + variance * 0.35, 0.001, 0.15);
          float denominator = NdotH * NdotH * (alphaSquared - 1.0) + 1.0;
          float distribution = alphaSquared / (3.14159265 * denominator * denominator);
          float NdotL = max(dot(normal, lightDir), 0.0);
          float visibilityV = NdotL * sqrt(NdotV * NdotV * (1.0 - alphaSquared) + alphaSquared);
          float visibilityL = NdotV * sqrt(NdotL * NdotL * (1.0 - alphaSquared) + alphaSquared);
          float sunFresnel = 0.02 + 0.98 * pow5(1.0 - max(dot(viewDir, halfVector), 0.0));
          float specIntensity = distribution * (0.5 / max(visibilityV + visibilityL, 0.001)) * sunFresnel * NdotL;
          baseShaded += uSunColor * specIntensity * (uIsNight > 0.5 ? 0.35 : 1.0) * (1.0 - uStorm * 0.95);

          // 7. Organic Sea Foam on Wave Crests
          float crestFoam = 0.0;
          float crestBreak = smoothstep(0.30, 0.80 + uStorm, vWaveHeight) * smoothstep(0.16, 0.30, vCrestPinch);
          if (crestBreak > 0.01 && camDist < uMaxFoamDist) {
            float foamCell = cellularFoam(vWorldPosition.xz * 2.5 + vec2(uTime * 0.05, -uTime * 0.03));
            float foamStreak = texture2D(uWaterDetail, vWorldPosition.xz * 0.023 - uWind * uTime * 0.004).a;
            float solidFroth = smoothstep(0.18, 0.65, foamCell);
            float lacyFoam = clamp(solidFroth * foamStreak * 0.85, 0.0, 1.0);
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
            float lacyFroth = smoothstep(0.15, 0.60, frothDetail);
            float shoreNoise = sin(vWorldPosition.x * 0.9 + vWorldPosition.z * 0.7 + uTime * 0.4) * 0.2 + 0.8;
            totalShoreFoam = clamp((contactBand * 0.58 + swashWave * 0.48) * (0.55 + lacyFroth * 0.45) * shoreNoise, 0.0, 0.42);
          }

          // Combine foam layers naturally
          float totalFoam = clamp(crestFoam * 0.45 + totalShoreFoam, 0.0, 1.0);
          vec3 litFoam = uFoamColor * mix(1.0, 0.42, uStorm);
          vec3 finalColor = mix(baseShaded, litFoam, totalFoam);

          // 10. Horizon Fog Blend
          float fogArg = camDist * uFogDensity;
          float horizonFog = 1.0 - exp(-(fogArg * fogArg));
          horizonFog = max(horizonFog, smoothstep(uHorizonCutoff * 0.65, uHorizonCutoff, camDist));
          finalColor = mix(finalColor, uSkyHorizonColor, horizonFog);

          gl_FragColor = vec4(finalColor, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
`;

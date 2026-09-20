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
        varying vec2 vSurfaceXZ;
        varying vec3 vWorldPosition;
        varying float vWaveHeight;
        varying float vCrestPinch;

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
          float waveWeight = shoreWaveWeight(terrainHeight(pos.xz));
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
          vSurfaceXZ = pos.xz;


          gl_Position = projectionMatrix * viewMatrix * vec4(displaced, 1.0);
        }
`;

export const getOceanFragmentShader = (waveShaderChunk: string) => `
        ${coastSampling}
        ${weatherUniformsGLSL}
        ${atmosphereFunctionsGLSL}
        ${stormMathGLSL}
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
        uniform vec3 uShipPos;
        uniform float uShipHeading;
        uniform float uShipSpeed;
        uniform float uShipLength;
        uniform float uShipWidth;
        uniform float uIsMobile;
        uniform float uIsNight;
        uniform float uFogDensity;
        uniform float uQualityTier;
        uniform float uHorizonCutoff;
        uniform float uMaxCapDist;
        uniform float uMaxSSSDist;
        uniform float uMaxFoamDist;
        uniform float uWakesEnabled;

        varying vec3 vNormal;
        varying vec2 vSurfaceXZ;
        varying vec3 vWorldPosition;
        varying float vWaveHeight;
        varying float vCrestPinch;

        struct Wave {
          vec2 dir;
          float steepness;
          float k;
          float a;
          float speed;
        };
        ${waveShaderChunk}

        vec3 surfaceNormal(vec2 worldXZ) {
          vec3 tangent = vec3(1.0, 0.0, 0.0);
          vec3 binormal = vec3(0.0, 0.0, 1.0);
          for (int i = 0; i < NUM_WAVES; i++) {
            Wave w = waves[i];
            float phase = w.k * (dot(w.dir, worldXZ) - w.speed * uTime);
            float seaScale = 1.0 + stormAt(worldXZ) * 1.8;
            float s = w.steepness * seaScale * sin(phase);
            float c = w.steepness * seaScale * cos(phase);
            tangent += vec3(-w.dir.x * w.dir.x * s, w.dir.x * c, -w.dir.x * w.dir.y * s);
            binormal += vec3(-w.dir.x * w.dir.y * s, w.dir.y * c, -w.dir.y * w.dir.y * s);
          }
          return normalize(cross(binormal, tangent));
        }

        float cellularFoam(vec2 p) {
          return texture2D(uWaterDetail, p / 16.0).b;
        }

        vec3 computeCapillaryNormal(vec2 p, float time, float tier) {
          vec2 wind = normalize(uWind + vec2(0.0001));
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
          float camDist = length(vWorldPosition - cameraPosition);

          float seabed = terrainHeight(vWorldPosition.xz);
          if (seabed >= 0.0) discard;
          if (camDist >= uHorizonCutoff) {
            gl_FragColor = vec4(uSkyHorizonColor, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
            return;
          }
          float waveWeight = shoreWaveWeight(seabed);
          vec3 baseNormal = normalize(vNormal);
          if (camDist < uMaxCapDist) {
            vec3 detailedNormal = normalize(mix(vec3(0.0, 1.0, 0.0), surfaceNormal(vSurfaceXZ), waveWeight));
            baseNormal = normalize(mix(detailedNormal, baseNormal, smoothstep(uMaxCapDist * 0.6, uMaxCapDist, camDist)));
          }
          vec3 lightDir = normalize(uLightDir);
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);

          // 1. High-Frequency Micro-Wave Capillary Normal Blending
          vec3 normal = baseNormal;
          if (camDist < uMaxCapDist) {
            float capStrength = (1.0 - smoothstep(uMaxCapDist * 0.35, uMaxCapDist, camDist)) * waveWeight;
            vec3 capNorm = computeCapillaryNormal(vWorldPosition.xz, uTime, uQualityTier);
            normal = normalize(vec3(
              baseNormal.x + capNorm.x * ((0.65 + uStorm * 0.3) * capStrength),
              baseNormal.y,
              baseNormal.z + capNorm.z * ((0.65 + uStorm * 0.3) * capStrength)
            ));
          }

          // 2. Coastal Water Depth (Calculated in Vertex Shader for performance)
          float minDistToShore = max(0.0, -seabed) * 4.0;

          // Depth absorption keeps the shelf narrow relative to a ship's beam.
          float waveMod = clamp((vWaveHeight + 0.8) / 1.6, 0.0, 1.0);
          vec3 deepOceanColor = mix(uDeepWaterColor * 0.55, uMidWaterColor * 0.65, waveMod * 0.3);
          float depth = max(0.0, -seabed) * (1.0 + 8.0 * smoothstep(2.0, 4.0, -seabed)) + 0.5;
          vec3 transmission = exp(-vec3(0.45, 0.13, 0.09) * depth);
          vec3 shelfColor = mix(uShallowColor, uLagoonColor, 0.25);
          vec3 waterColor = mix(deepOceanColor, shelfColor, transmission);

          // 4. Subsurface Scattering (Translucent Wave Crests)
          vec3 sss = vec3(0.0);
          if (camDist < uMaxSSSDist) {
            vec3 sssLightDir = normalize(lightDir + normal * (uQualityTier > 1.5 ? 0.45 : 0.35));
            float sssPower = uQualityTier > 1.5 ? 2.2 : 3.2;
            float sssFactor = pow(max(dot(viewDir, -sssLightDir), 0.0), sssPower);
            float crestThickness = smoothstep(uQualityTier > 1.5 ? 0.10 : 0.20, 1.1, vWaveHeight);
            float sssDistFade = 1.0 - smoothstep(uMaxSSSDist * 0.5, uMaxSSSDist, camDist);
            float sssMult = uQualityTier > 1.5 ? (uIsNight > 0.5 ? 1.25 : 1.35) : (uIsNight > 0.5 ? 0.92 : 0.85);
            vec3 sssColor = uQualityTier > 1.5 ? (uIsNight > 0.5 ? vec3(0.08, 0.26, 0.48) : vec3(0.03, 0.72, 0.66)) : uSubsurfaceColor;
            sss = sssColor * (sssFactor * crestThickness * sssMult * sssDistFade);
          }

          // 5. Physical Fresnel & Sky Reflection
          float NdotV = max(dot(viewDir, normal), 0.0);
          float fresnel = 0.02 + 0.98 * pow(1.0 - NdotV, 5.0);
          vec3 reflectionDir = reflect(-viewDir, normal);
          vec3 skyReflection = atmosphereColor(reflectionDir, uSkyHorizonColor, uSunColor, lightDir, uIsNight, uTime, vWorldPosition.xz, false);
          waterColor = mix(waterColor, waterColor * vec3(0.48, 0.62, 0.65), uStorm);

          vec3 baseShaded = mix(waterColor + sss * 0.45, skyReflection, fresnel);

          // Stable, distance-broadened highlights avoid animated hash glitter.
          vec3 halfVector = normalize(lightDir + viewDir);
          float NdotH = max(dot(normal, halfVector), 0.0);
          float roughPatch = texture2D(uWaterDetail, vWorldPosition.xz * 0.009 + uWind * uTime * 0.001).a;
          float exponent = mix(240.0, 85.0, roughPatch) * mix(1.0, 0.35, smoothstep(25.0, 250.0, camDist));
          float sunFresnel = 0.02 + 0.98 * pow(1.0 - max(dot(viewDir, halfVector), 0.0), 5.0);
          float specIntensity = pow(NdotH, exponent) * (exponent + 2.0) * 0.125 * sunFresnel;
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
            totalShoreFoam = clamp((contactBand * 0.55 + swashWave * 0.45) * (0.55 + lacyFroth * 0.45) * shoreNoise, 0.0, 0.35);
          }

          // 9. Dynamic Broad-Spreading Ship Wake
          float shipWakeFoam = 0.0;
          if (uWakesEnabled > 0.5 && uShipSpeed > 0.35 && camDist < 180.0) {
            vec2 rel = vWorldPosition.xz - uShipPos.xz;
            float sinH = sin(uShipHeading);
            float cosH = cos(uShipHeading);
            float lx = cosH * rel.x - sinH * rel.y;
            float lz = sinH * rel.x + cosH * rel.y;

            float behind = -lz - uShipLength * 0.45;
            float maxWakeReach = uShipLength * 1.2 + uShipSpeed * 3.0;
            float latDist = abs(lx);

            // Fast corridor bounding: skip expensive pow/exp if outside lateral wake reach
            if (behind > -1.0 && behind < maxWakeReach && latDist < 26.0) {
              // Soft expanding Kelvin V-wake arms
              float wakeSpread = uShipWidth * 0.38 + max(0.0, behind) * 0.354;
              if (latDist < wakeSpread + 3.0) {
                float vArm = (1.0 - smoothstep(0.0, 1.6, abs(latDist - wakeSpread))) * 0.55;

                // Smooth center churn field
                float centerSpread = uShipWidth * 0.28 + behind * 0.055;
                float centerFroth = exp(-(latDist * latDist) / (centerSpread * centerSpread)) * 0.65;

                float ripple = sin(behind * 0.4 - uTime * 1.8) * 0.1 + 0.9;
                float leadIn = smoothstep(-0.5, 2.0, behind);
                float trailFade = exp(-max(0.0, behind) * 0.05) * (1.0 - smoothstep(maxWakeReach * 0.5, maxWakeReach, behind));

                float breakup = 0.3 + 0.7 * smoothstep(0.12, 0.65, cellularFoam(vWorldPosition.xz * 4.0 + uTime * 0.12));
                shipWakeFoam = (vArm + centerFroth) * breakup * ripple * leadIn * trailFade * min(1.0, uShipSpeed / 6.0);
                shipWakeFoam = clamp(shipWakeFoam, 0.0, 0.45);
              }
            }
          }

          // Combine foam layers naturally
          float totalFoam = clamp(crestFoam * 0.45 + totalShoreFoam + shipWakeFoam * 0.9, 0.0, 1.0);
          vec3 litFoam = uFoamColor * mix(1.0, 0.42, uStorm);
          vec3 finalColor = mix(baseShaded, litFoam, totalFoam);

          // 10. Horizon Fog Blend
          float horizonFog = 1.0 - exp(-pow(camDist * uFogDensity, 2.0));
          horizonFog = max(horizonFog, smoothstep(uHorizonCutoff * 0.65, uHorizonCutoff, camDist));
          finalColor = mix(finalColor, uSkyHorizonColor, horizonFog);

          gl_FragColor = vec4(finalColor, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
`;

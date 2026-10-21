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

        // AAA Dual-Octave Counter-Flowing Capillary Ripple Field with Wind Directionality
        vec3 computeCapillaryNormal(vec2 p, float time, float tier) {
          vec2 wind = uWind;
          vec2 across = vec2(-wind.y, wind.x);

          // Octave 1: Primary wind-driven ripple set (large flowing swells)
          vec2 q1 = vec2(dot(p, wind), dot(p, across));
          vec2 uv1 = q1 * 0.038 - vec2(time * 0.012, time * 0.0028);
          vec2 n1 = texture2D(uWaterDetail, uv1).rg - 0.5;

          // Octave 2: Cross-wind turbulent chop flowing at 35 degrees angle
          vec2 q2 = vec2(q1.x * 0.819 - q1.y * 0.574, q1.x * 0.574 + q1.y * 0.819);
          vec2 uv2 = q2 * 0.082 + vec2(-time * 0.015, time * 0.0045);
          vec2 n2 = texture2D(uWaterDetail, uv2).rg - 0.5;

          vec2 combinedN = n1 + n2 * 0.65;

          // Octave 3: High-frequency micro chatter (for balanced & performance tiers)
          if (tier > 0.5) {
            vec2 q3 = vec2(q1.x * 0.5 - q1.y * 0.866, q1.x * 0.866 + q1.y * 0.5);
            vec2 uv3 = q3 * 0.165 + vec2(time * 0.022, -time * 0.007);
            vec2 n3 = texture2D(uWaterDetail, uv3).rg - 0.5;
            combinedN += n3 * 0.35;
          }

          vec2 worldSlope = wind * combinedN.x + across * combinedN.y;
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

          // 1. High-Frequency Micro-Wave Capillary Normal Blending (Reoriented Normal Mapping)
          vec3 normal = baseNormal;
          if (camDist < uMaxCapDist) {
            float capStrength = (1.0 - smoothstep(uMaxCapDist * 0.35, uMaxCapDist, camDist)) * waveWeight;
            vec3 capNorm = computeCapillaryNormal(vWorldPosition.xz, uTime, uQualityTier);
            float capWeight = (0.75 + uStorm * 0.35) * capStrength;
            normal = normalize(vec3(
              baseNormal.x + capNorm.x * capWeight,
              baseNormal.y,
              baseNormal.z + capNorm.z * capWeight
            ));
          }

          // 2. Physical Ocean Depth Optical Absorption & Tropical Chromatic Gradients
          float minDistToShore = max(0.0, -seabed) * 4.0;
          float waveMod = clamp((vWaveHeight + 0.9) * 0.55, 0.0, 1.0);
          float troughAO = clamp(0.85 + vWaveHeight * 0.16 + vCrestPinch * 0.22, 0.68, 1.18);

          // Deep pelagic abyss: rich deep sapphire with luminous volumetric gradient
          vec3 abyssalDeep = uDeepWaterColor * 0.72;
          vec3 oceanPelagic = mix(abyssalDeep, uMidWaterColor * 0.85, waveMod * 0.45) * troughAO;

          // Physical Beer-Lambert exponential depth extinction (Red absorbs fast, Blue slowly)
          float depth = max(0.0, -seabed) * (1.0 + 7.0 * smoothstep(1.8, 4.5, -seabed)) + 0.4;
          vec3 transmission = exp(-vec3(0.42, 0.11, 0.06) * depth);
          vec3 lagoonShallow = mix(uShallowColor, uLagoonColor, 0.32);
          vec3 waterColor = mix(oceanPelagic, lagoonShallow, transmission);

          // Shimmering underwater caustics visible in shallow coastal waters (< 5.5m depth)
          if (depth < 5.5 && camDist < 260.0) {
            vec2 cUV1 = vWorldPosition.xz * 0.14 + vec2(uTime * 0.035, uTime * 0.018);
            vec2 cUV2 = vWorldPosition.xz * 0.17 - vec2(uTime * 0.028, -uTime * 0.022);
            float caust1 = cellularFoam(cUV1);
            float caust2 = cellularFoam(cUV2);
            float caustics = min(caust1, caust2);
            caustics = smoothstep(0.42, 0.88, caustics);
            float causticFade = (1.0 - smoothstep(0.5, 5.0, depth)) * (1.0 - smoothstep(60.0, 260.0, camDist));
            vec3 causticTint = uIsNight > 0.5 ? vec3(0.1, 0.25, 0.4) : vec3(0.15, 0.85, 0.75);
            waterColor += causticTint * caustics * causticFade * 0.48 * (1.0 - uStorm * 0.85);
          }

          // 3. AAA Sea of Thieves-Tier Emerald Subsurface Scattering (Wave Crest Translucency)
          vec3 sss = vec3(0.0);
          if (camDist < uMaxSSSDist) {
            vec3 sssLightDir = normalize(lightDir + normal * (uQualityTier > 1.5 ? 0.48 : 0.36));
            float sssDot = max(dot(viewDir, -sssLightDir), 0.0);
            float sssFactor = pow(sssDot, uQualityTier > 1.5 ? 3.2 : 4.0);
            float crestThickness = smoothstep(uQualityTier > 1.5 ? 0.05 : 0.12, 0.95, vWaveHeight + vCrestPinch * 0.42);
            float sssDistFade = 1.0 - smoothstep(uMaxSSSDist * 0.45, uMaxSSSDist, camDist);

            // Ambient crest scattering (wave pinch illuminates crest tips even when off-angle)
            float ambientCrestGlow = pow(clamp(vCrestPinch, 0.0, 1.0), 2.2) * smoothstep(0.1, 0.85, vWaveHeight) * 0.38;

            vec3 sssColor = uQualityTier > 1.5
              ? (uIsNight > 0.5 ? vec3(0.12, 0.35, 0.62) : vec3(0.04, 0.88, 0.78))
              : (uIsNight > 0.5 ? uSubsurfaceColor * 0.85 : uSubsurfaceColor * 1.25);

            float sssTotal = (sssFactor * crestThickness * (uIsNight > 0.5 ? 1.1 : 1.75) + ambientCrestGlow) * sssDistFade;
            sss = sssColor * sssTotal * (1.0 - uStorm * 0.75);
          }

          // 4. Physical Fresnel & Atmospheric Sky Radiance Reflection
          float NdotV = max(dot(viewDir, normal), 0.001);
          float fresnel = 0.02 + 0.98 * pow5(1.0 - NdotV);
          vec3 reflNormal = normalize(mix(vec3(0.0, 1.0, 0.0), normal, 0.78));
          vec3 reflectionDir = reflect(-viewDir, reflNormal);
          vec3 skyReflection = atmosphereColor(reflectionDir, uSkyHorizonColor, uSunColor, lightDir, uIsNight, uTime, vWorldPosition.xz, false);
          waterColor = mix(waterColor, waterColor * vec3(0.45, 0.58, 0.62), uStorm);

          // Luminous physical layer blend: transmission + reflection + subsurface scattering
          vec3 baseShaded = mix(waterColor, skyReflection, fresnel) + sss * (1.0 - fresnel * 0.4);

          // 5. Anisotropic GGX Sun Path & Diamond Micro-Facet Sparkle (Glitter)
          vec3 halfVector = normalize(lightDir + viewDir);
          float NdotH = max(dot(normal, halfVector), 0.0);
          float NdotL = max(dot(normal, lightDir), 0.0);

          float roughPatch = texture2D(uWaterDetail, vWorldPosition.xz * 0.008 + uWind * uTime * 0.001).a;
          vec3 normalDx = dFdx(normal), normalDy = dFdy(normal);
          float variance = min(0.12, dot(normalDx, normalDx) + dot(normalDy, normalDy));
          float rRough = mix(0.15, 0.28, roughPatch);
          float alphaSquared = clamp(rRough * rRough * rRough * rRough + variance * 0.35, 0.001, 0.14);
          float denominator = NdotH * NdotH * (alphaSquared - 1.0) + 1.0;
          float distribution = alphaSquared / (3.14159265 * denominator * denominator);
          float visibilityV = NdotL * sqrt(NdotV * NdotV * (1.0 - alphaSquared) + alphaSquared);
          float visibilityL = NdotV * sqrt(NdotL * NdotL * (1.0 - alphaSquared) + alphaSquared);
          float sunFresnel = 0.02 + 0.98 * pow5(1.0 - max(dot(viewDir, halfVector), 0.0));
          float specIntensity = distribution * (0.5 / max(visibilityV + visibilityL, 0.001)) * sunFresnel * NdotL;

          // Luminous Sun Glitter Highway
          float specHighway = pow(NdotH, 16.0) * 0.28 * NdotL;

          // High-frequency diamond sparkles on micro-ripples
          float sparkleNoise = texture2D(uWaterDetail, vWorldPosition.xz * 1.5 + normal.xz * 6.0).r;
          float sparkle = pow(sparkleNoise, 7.0) * pow(NdotH, 14.0) * 4.2;
          float sparkleFade = 1.0 - smoothstep(15.0, 140.0, camDist);
          float totalSparkle = sparkle * sparkleFade * (1.0 - uStorm);

          baseShaded += uSunColor * (specIntensity + specHighway + totalSparkle) * (uIsNight > 0.5 ? 0.32 : 1.25) * (1.0 - uStorm * 0.95);

          // 6. Multi-Scale Sea Foam with Langmuir Trails & Shoreline Wavelets
          float crestBreak = smoothstep(0.26, 0.72 + uStorm * 0.35, vWaveHeight) * smoothstep(0.14, 0.28, vCrestPinch);
          float crestFoam = 0.0;
          if (crestBreak > 0.01 && camDist < uMaxFoamDist) {
            float foamCell = cellularFoam(vWorldPosition.xz * 2.2 + vec2(uTime * 0.045, -uTime * 0.025));
            float foamStreak = texture2D(uWaterDetail, vWorldPosition.xz * 0.019 - uWind * uTime * 0.003).a;
            float solidFroth = smoothstep(0.16, 0.62, foamCell);
            float lacyFoam = clamp(solidFroth * (0.4 + foamStreak * 0.8), 0.0, 1.0);
            float foamDistFade = 1.0 - smoothstep(uMaxFoamDist * 0.45, uMaxFoamDist, camDist);
            crestFoam = crestBreak * lacyFoam * foamDistFade;
          }

          // Shoreline Breaking Surf Foam
          float totalShoreFoam = 0.0;
          if (minDistToShore > -0.5 && minDistToShore < 6.5 && camDist < 350.0) {
            float contactBand = smoothstep(-0.5, 0.2, minDistToShore) * (1.0 - smoothstep(0.8, 3.8, minDistToShore));
            float surfPulse = sin(uTime * 2.2 - minDistToShore * 1.6) * 0.5 + 0.5;
            float swashWave = smoothstep(0.25, 1.6, minDistToShore) * (1.0 - smoothstep(1.8, 4.6, minDistToShore)) * surfPulse;
            float frothDetail = cellularFoam(vWorldPosition.xz * 1.1 + vec2(uTime * 0.07, -uTime * 0.05));
            float lacyFroth = smoothstep(0.14, 0.58, frothDetail);
            float shoreNoise = sin(vWorldPosition.x * 0.85 + vWorldPosition.z * 0.65 + uTime * 0.35) * 0.2 + 0.8;
            totalShoreFoam = clamp((contactBand * 0.65 + swashWave * 0.55) * (0.5 + lacyFroth * 0.5) * shoreNoise, 0.0, 0.55);
          }

          // Combine foam layers naturally
          float totalFoam = clamp(crestFoam * 0.52 + totalShoreFoam, 0.0, 1.0);
          vec3 litFoam = uFoamColor * mix(1.05, 0.45, uStorm);
          vec3 finalColor = mix(baseShaded, litFoam, totalFoam);

          // 7. Atmospheric Aerial Perspective & Horizon Integration
          float fogArg = camDist * uFogDensity;
          float horizonFog = 1.0 - exp(-(fogArg * fogArg));
          horizonFog = max(horizonFog, smoothstep(uHorizonCutoff * 0.65, uHorizonCutoff, camDist));
          finalColor = mix(finalColor, uSkyHorizonColor, horizonFog);

          gl_FragColor = vec4(finalColor, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
`;

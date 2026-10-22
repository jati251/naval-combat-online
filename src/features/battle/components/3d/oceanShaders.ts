import { atmosphereFunctionsGLSL, weatherUniformsGLSL, stormMathGLSL } from './atmosphereShaders';

const coastSampling = `
        uniform sampler2D uCoastalHeight;
        uniform vec4 uCoastalBounds;
        uniform float uCoastalResolution;

        float decodeCoastalTexel(vec2 uv) {
          vec2 packedHeight = texture2D(uCoastalHeight, uv).rg;
          return -8.0 + dot(packedHeight, vec2(65280.0, 255.0)) * (16.0 / 65535.0);
        }

        float terrainHeight(vec2 worldXZ) {
          vec2 uv = (worldXZ - uCoastalBounds.xy) / uCoastalBounds.zw;
          if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return -8.0;
          vec2 grid = uv * (uCoastalResolution - 1.0);
          vec2 i = floor(min(grid, vec2(uCoastalResolution - 2.0)));
          vec2 f = clamp(grid - i, 0.0, 1.0);
          vec2 baseUV = (i + 0.5) / uCoastalResolution;
          vec2 stepUV = vec2(1.0 / uCoastalResolution, 0.0);
          float a = decodeCoastalTexel(baseUV);
          float b = decodeCoastalTexel(baseUV + stepUV.xy);
          float c = decodeCoastalTexel(baseUV + stepUV.yx);
          float d = decodeCoastalTexel(baseUV + stepUV.xx);
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float shoreWaveWeight(float height) {
          return smoothstep(0.0, 2.5, max(0.0, -height));
        }
`;

export const getOceanVertexShader = (waveShaderChunk: string) => `
        uniform float uTime;
        uniform float uStorm;
        ${coastSampling}
        ${stormMathGLSL}
        varying vec3 vNormal;
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
          float seabed = terrainHeight(pos.xz);
          float waveWeight = shoreWaveWeight(seabed);
          float seaScale = 1.0 + stormAt(pos.xz) * uStorm * 1.8;
          waveWeight *= seaScale;

          // Attenuate short-wavelength vertex displacement at far distances to prevent coarse-grid Moire aliasing
          float camDist = length(cameraPosition.xz - pos.xz);

          vec3 tangent = vec3(1.0, 0.0, 0.0);
          vec3 binormal = vec3(0.0, 0.0, 1.0);
          float pinchAccum = 0.0;

          for (int i = 0; i < NUM_WAVES; i++) {
            Wave w = waves[i];
            float wavelength = 6.2831853 / w.k;
            float vertexLod = 1.0 - smoothstep(wavelength * 6.0, wavelength * 16.0, camDist);
            float dotProd = w.dir.x * pos.x + w.dir.y * pos.z;
            float phase = w.k * (dotProd - w.speed * uTime);
            float cosP = cos(phase);
            float sinP = sin(phase);

            // Gerstner trochoidal displacement (peaks pinch, troughs flatten)
            float aCos = w.a * vertexLod * cosP;
            displaced.x += w.dir.x * aCos;
            displaced.y += w.a * vertexLod * sinP;
            displaced.z += w.dir.y * aCos;

            // Analytical Jacobian derivatives for vertex normal fallback
            float sSin = w.steepness * waveWeight * vertexLod * sinP;
            float sCos = w.steepness * waveWeight * vertexLod * cosP;
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
          vNormal = normalize(cross(binormal, tangent));
          vWaveHeight = displaced.y;
          vCrestPinch = pinchAccum;
          vWorldPosition = displaced;

          gl_Position = projectionMatrix * viewMatrix * vec4(displaced, 1.0);
        }
`;

export const getOceanFragmentShader = (waveShaderChunk: string) => `
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

        struct Wave {
          vec2 dir;
          float steepness;
          float k;
          float a;
          float speed;
        };

        ${waveShaderChunk}

        float pow5(float x) {
          float x2 = x * x;
          return x2 * x2 * x;
        }

        float cellularFoam(vec2 p) {
          return texture2D(uWaterDetail, p * 0.0625).b;
        }

        // Per-pixel analytical evaluation of primary Gerstner + Meso swells.
        // Eliminates 100% of mesh-triangle interpolation saw-toothing and Moire artifacts!
        vec4 computeAnalyticalWaves(vec2 p, float time, float camDist, float tier, float waveWeight) {
          vec2 slope = vec2(0.0);
          float height = 0.0;
          float pinch = 0.0;

          float stormScale = 1.0 + uStorm * 0.65;

          // 1. Primary hull-scale Gerstner swells evaluated per-pixel
          for (int i = 0; i < NUM_WAVES; i++) {
            Wave w = waves[i];
            float wavelength = 6.2831853 / w.k;
            float distFade = 1.0 - smoothstep(wavelength * 12.0, wavelength * 38.0, camDist);
            float phase = w.k * (dot(w.dir, p) - w.speed * time);
            float s = sin(phase);
            float c = cos(phase);
            float effSteep = w.steepness * waveWeight * stormScale * distFade;
            slope += w.dir * (effSteep * c);
            height += (w.a * waveWeight * stormScale * distFade) * s;
            pinch += effSteep * s;
          }

          // 2. Sub-mesh meso-scale swells (1.9m - 9.2m wavelengths)
          float mesoFade = (1.0 - smoothstep(45.0, uMaxCapDist * 1.4, camDist)) * waveWeight;
          if (mesoFade > 0.005) {
            vec2 w = uWind;
            vec2 a = vec2(-w.y, w.x);

            vec2 d1 = normalize(w * 0.92 + a * 0.39);
            float ph1 = 0.683 * (dot(p, d1) - 3.8 * time);
            float s1 = sin(ph1), c1 = cos(ph1);

            vec2 d2 = normalize(w * 0.84 - a * 0.54);
            float ph2 = 1.163 * (dot(p, d2) - 2.9 * time);
            float s2 = sin(ph2), c2 = cos(ph2);

            vec2 d3 = normalize(w * 0.65 + a * 0.76);
            float ph3 = 1.904 * (dot(p, d3) - 2.2 * time);
            float s3 = sin(ph3), c3 = cos(ph3);

            vec2 mSlope = d1 * (0.095 * c1) + d2 * (0.075 * c2) + d3 * (0.055 * c3);
            float mHeight = 0.14 * s1 + 0.08 * s2 + 0.04 * s3;
            float mPinch = 0.095 * s1 + 0.075 * s2 + 0.055 * s3;

            if (tier > 0.5) {
              vec2 d4 = normalize(w * 0.45 - a * 0.89);
              float ph4 = 3.307 * (dot(p, d4) - 1.7 * time);
              mSlope += d4 * (0.038 * cos(ph4));
              mHeight += 0.02 * sin(ph4);
              mPinch += 0.038 * sin(ph4);
            }

            slope += mSlope * mesoFade * stormScale;
            height += mHeight * mesoFade;
            pinch += mPinch * mesoFade;
          }

          return vec4(slope, height, pinch);
        }

        // Silky Phillips-spectrum capillary normal perturbation
        vec2 computeCapillarySlope(vec2 p, float time, float tier) {
          vec2 wind = uWind;
          vec2 across = vec2(-wind.y, wind.x);
          vec2 q1 = vec2(dot(p, wind), dot(p, across));

          vec2 uv1 = q1 * 0.028 - vec2(time * 0.015, time * 0.004);
          vec2 n1 = texture2D(uWaterDetail, uv1).rg - 0.5;

          vec2 q2 = vec2(q1.x * 0.82 - q1.y * 0.57, q1.x * 0.57 + q1.y * 0.82);
          vec2 uv2 = q2 * 0.068 + vec2(-time * 0.020, time * 0.006);
          vec2 n2 = texture2D(uWaterDetail, uv2).rg - 0.5;

          vec2 localSlope = n1 * 0.58 + n2 * 0.42;
          if (tier > 0.5) {
            vec2 uv3 = q1 * 0.155 + vec2(time * 0.026, -time * 0.008);
            vec2 n3 = texture2D(uWaterDetail, uv3).rg - 0.5;
            vec2 uv4 = q2 * 0.31 - vec2(time * 0.032, time * 0.011);
            vec2 n4 = texture2D(uWaterDetail, uv4).rg - 0.5;
            localSlope += n3 * 0.26 + n4 * 0.14;
          }

          return wind * localSlope.x + across * localSlope.y;
        }

        void main() {
          vec3 viewOffset = cameraPosition - vWorldPosition;
          float camDist = length(viewOffset);

          float seabed = terrainHeight(vWorldPosition.xz);
          if (seabed >= 0.0) discard;
          if (camDist >= uHorizonCutoff) {
            gl_FragColor = vec4(uSkyHorizonColor, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
            return;
          }

          float waveWeight = shoreWaveWeight(seabed);
          vec3 lightDir = normalize(uLightDir);
          vec3 viewDir = viewOffset / max(camDist, 0.0001);

          // 1. Sub-Pixel Analytical Wave Surface Reconstruction (Zero Mesh Triangle Aliasing)
          vec4 waveState = computeAnalyticalWaves(vWorldPosition.xz, uTime, camDist, uQualityTier, waveWeight);
          vec3 macroMesoNormal = normalize(vec3(-waveState.x, 1.0, -waveState.y));
          float totalWaveHeight = waveState.z;
          float totalPinch = waveState.w;

          vec3 normal = macroMesoNormal;
          if (camDist < uMaxCapDist) {
            float capFade = (1.0 - smoothstep(uMaxCapDist * 0.25, uMaxCapDist, camDist)) * waveWeight;
            vec2 capSlope = computeCapillarySlope(vWorldPosition.xz, uTime, uQualityTier);
            float capWeight = (0.32 + uStorm * 0.12) * capFade;
            normal = normalize(vec3(
              macroMesoNormal.x + capSlope.x * capWeight,
              macroMesoNormal.y,
              macroMesoNormal.z + capSlope.y * capWeight
            ));
          }

          // 2. Assassin's Creed IV: Black Flag Cohesive Caribbean Water Coloring
          // Cohesive, vibrant tropical ocean body without blotchy height interference
          float slopeLight = clamp(dot(macroMesoNormal, lightDir) * 0.5 + 0.5, 0.0, 1.0);

          vec3 pelagicBase = mix(uDeepWaterColor, uMidWaterColor, 0.60);
          vec3 pelagicColor = pelagicBase * mix(0.90, 1.06, slopeLight);

          // True Shoreline Coral Reef & Lagoon Shallows (strictly seabed > -2.2m so underwater skirt noise never bleeds)
          float coastalMask = smoothstep(-2.2, -0.05, seabed);
          vec3 waterColor = pelagicColor;
          if (coastalMask > 0.001) {
            float reefBlend = pow(coastalMask, 1.5);
            float beachShallowness = smoothstep(0.35, 1.0, coastalMask);
            vec3 reefTurquoise = mix(vec3(0.035, 0.38, 0.48), uShallowColor, 0.35);
            vec3 lagoonAqua = mix(vec3(0.12, 0.65, 0.62), uLagoonColor, 0.35);
            vec3 shallowPalette = mix(reefTurquoise, lagoonAqua, beachShallowness);

            // Shimmering underwater caustics in shallow coastal waters
            if (camDist < 220.0) {
              vec2 cUV1 = vWorldPosition.xz * 0.12 + vec2(uTime * 0.03, uTime * 0.015);
              vec2 cUV2 = vWorldPosition.xz * 0.15 - vec2(uTime * 0.025, -uTime * 0.02);
              float caustics = smoothstep(0.45, 0.88, min(cellularFoam(cUV1), cellularFoam(cUV2)));
              float causticFade = coastalMask * (1.0 - smoothstep(50.0, 220.0, camDist));
              vec3 causticTint = uIsNight > 0.5 ? vec3(0.08, 0.22, 0.35) : vec3(0.18, 0.82, 0.74);
              shallowPalette += causticTint * caustics * causticFade * 0.28 * (1.0 - uStorm * 0.85);
            }

            waterColor = mix(pelagicColor, shallowPalette, reefBlend * 0.88);
          }

          // 3. Refined Wave Crest Subsurface Scattering (focused on steep sun-backlit wave ridges)
          vec3 sss = vec3(0.0);
          if (camDist < uMaxSSSDist) {
            vec3 sssLightDir = normalize(lightDir + macroMesoNormal * 0.38);
            float backScatter = pow(max(dot(viewDir, -sssLightDir), 0.0), 3.5);
            float slopeTilt = smoothstep(0.02, 0.22, 1.0 - macroMesoNormal.y);
            float crestMask = smoothstep(0.22, 0.78, totalWaveHeight) * smoothstep(0.06, 0.26, totalPinch);
            float sssDistFade = 1.0 - smoothstep(uMaxSSSDist * 0.35, uMaxSSSDist, camDist);

            vec3 emeraldSSS = uIsNight > 0.5
              ? vec3(0.06, 0.24, 0.42)
              : vec3(0.05, 0.72, 0.62);

            float sssStrength = (backScatter * 0.95 + slopeTilt * 0.35) * crestMask * sssDistFade;
            sss = emeraldSSS * sssStrength * (uIsNight > 0.5 ? 0.55 : 0.85) * (1.0 - uStorm * 0.7);
          }

          // 4. Bruneton Roughness-Attenuated Fresnel & Smooth Sky Reflection
          vec3 fresnelNormal = normalize(mix(vec3(0.0, 1.0, 0.0), macroMesoNormal, 0.08));
          float NdotV = clamp(dot(viewDir, fresnelNormal), 0.0, 1.0);
          float fresnel = 0.10 + 0.80 * pow(1.0 - NdotV, 3.5);

          vec3 reflNormal = normalize(mix(vec3(0.0, 1.0, 0.0), normal, 0.40));
          vec3 reflectionDir = reflect(-viewDir, reflNormal);
          reflectionDir.y = max(0.02, reflectionDir.y);

          vec3 skyZenith = uIsNight > 0.5 ? vec3(0.04, 0.10, 0.18) : mix(uSkyTopColor, vec3(0.10, 0.42, 0.68), 0.45);
          vec3 skyReflection = mix(uSkyHorizonColor, skyZenith, pow(clamp(reflectionDir.y, 0.0, 1.0), 0.55));
          float sunReflAlign = max(0.0, dot(reflectionDir, lightDir));
          skyReflection += uSunColor * pow(sunReflAlign, 8.0) * (uIsNight > 0.5 ? 0.08 : 0.20) * (1.0 - uStorm);

          waterColor = mix(waterColor, waterColor * vec3(0.45, 0.58, 0.62), uStorm);
          vec3 baseShaded = mix(waterColor + sss, skyReflection, fresnel);

          // 5. Dual-Lobe GGX Solar Specular Path (Liquid Gold Horizon Shimmer)
          vec3 halfVector = normalize(lightDir + viewDir);
          float NdotH = max(dot(normal, halfVector), 0.0);
          float NdotL = max(dot(normal, lightDir), 0.0);
          float specNdotV = max(dot(viewDir, normal), 0.01);

          float roughPatch = texture2D(uWaterDetail, vWorldPosition.xz * 0.012 + uWind * uTime * 0.0015).a;
          vec3 normalDx = dFdx(normal), normalDy = dFdy(normal);
          float variance = min(0.10, dot(normalDx, normalDx) + dot(normalDy, normalDy));
          float rRough = mix(0.11, 0.21, roughPatch);
          float alphaSquared = clamp(rRough * rRough * rRough * rRough + variance * 0.4, 0.0008, 0.12);
          float denominator = NdotH * NdotH * (alphaSquared - 1.0) + 1.0;
          float distribution = alphaSquared / (3.14159265 * denominator * denominator);
          float visibilityV = NdotL * sqrt(specNdotV * specNdotV * (1.0 - alphaSquared) + alphaSquared);
          float visibilityL = specNdotV * sqrt(NdotL * NdotL * (1.0 - alphaSquared) + alphaSquared);
          float sunFresnel = 0.02 + 0.98 * pow5(1.0 - max(dot(viewDir, halfVector), 0.0));
          float specIntensity = distribution * (0.5 / max(visibilityV + visibilityL, 0.001)) * sunFresnel * NdotL;

          float macroNdotH = max(dot(macroMesoNormal, halfVector), 0.0);
          float sunPathGlow = pow(macroNdotH, 28.0) * 0.20 * max(dot(macroMesoNormal, lightDir), 0.0);

          baseShaded += uSunColor * (specIntensity * 1.15 + sunPathGlow) * (uIsNight > 0.5 ? 0.30 : 1.05) * (1.0 - uStorm * 0.92);

          // 6. Organic Whitecap Foam on Peaking Wave Ridges & Shoreline Surf
          float crestBreak = smoothstep(0.36, 0.84 + uStorm * 0.35, totalWaveHeight) * smoothstep(0.18, 0.36, totalPinch);
          float crestFoam = 0.0;
          if (crestBreak > 0.01 && camDist < uMaxFoamDist) {
            float foamCell = cellularFoam(vWorldPosition.xz * 1.8 + vec2(uTime * 0.04, -uTime * 0.025));
            float foamPatch = texture2D(uWaterDetail, vWorldPosition.xz * 0.025 - uWind * uTime * 0.003).a;
            float lacyFoam = smoothstep(0.24, 0.70, foamCell) * (0.45 + foamPatch * 0.65);
            float foamDistFade = 1.0 - smoothstep(uMaxFoamDist * 0.45, uMaxFoamDist, camDist);
            crestFoam = crestBreak * lacyFoam * foamDistFade;
          }

          // Shoreline Breaking Surf Foam (strictly within 0m..1.6m depth along the beach)
          float minDistToShore = max(0.0, -seabed) * 4.0;
          float totalShoreFoam = 0.0;
          if (seabed > -1.65 && camDist < 350.0) {
            float contactBand = smoothstep(-0.4, 0.2, minDistToShore) * (1.0 - smoothstep(0.8, 3.6, minDistToShore));
            float surfPulse = sin(uTime * 2.2 - minDistToShore * 1.6) * 0.5 + 0.5;
            float swashWave = smoothstep(0.25, 1.5, minDistToShore) * (1.0 - smoothstep(1.8, 4.4, minDistToShore)) * surfPulse;
            float frothDetail = cellularFoam(vWorldPosition.xz * 1.1 + vec2(uTime * 0.07, -uTime * 0.05));
            float lacyFroth = smoothstep(0.18, 0.62, frothDetail);
            float shoreNoise = sin(vWorldPosition.x * 0.85 + vWorldPosition.z * 0.65 + uTime * 0.35) * 0.2 + 0.8;
            totalShoreFoam = clamp((contactBand * 0.58 + swashWave * 0.46) * (0.5 + lacyFroth * 0.5) * shoreNoise, 0.0, 0.50);
          }

          float totalFoam = clamp(crestFoam * 0.52 + totalShoreFoam, 0.0, 0.90);
          vec3 litFoam = uFoamColor * mix(0.96, 0.45, uStorm);
          vec3 finalColor = mix(baseShaded, litFoam, totalFoam);

          // 7. Continuous Atmospheric Aerial Perspective & Horizon Integration
          float fogArg = camDist * uFogDensity;
          float horizonFog = 1.0 - exp(-(fogArg * fogArg));
          horizonFog = mix(horizonFog, 1.0, smoothstep(uHorizonCutoff * 0.88, uHorizonCutoff, camDist));
          finalColor = mix(finalColor, uSkyHorizonColor, horizonFog);
          gl_FragColor = vec4(finalColor, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
`;

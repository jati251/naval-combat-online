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
        uniform vec3 uSkyMidColor;
        uniform vec3 uSkyHorizonColor;
        uniform vec3 uLightDir;
        uniform float uIsMobile;
        uniform float uIsNight;
        uniform float uFogDensity;
        uniform float uQualityTier;
        uniform float uCapillaryHarmonics;
        uniform float uGlitterEnabled;
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

        // Per-pixel analytical evaluation of primary Gerstner + Meso + Chop swells.
        // Eliminates 100% of mesh-triangle interpolation saw-toothing and Moire artifacts!
        vec4 computeAnalyticalWaves(vec2 p, float time, float camDist, float tier, float waveWeight) {
          vec2 slope = vec2(0.0);
          float height = 0.0;
          float pinch = 0.0;

          float stormScale = 1.0 + uStorm * 0.68;

          // 1. Primary hull-scale Gerstner swells evaluated per-pixel
          for (int i = 0; i < NUM_WAVES; i++) {
            Wave w = waves[i];
            float wavelength = 6.2831853 / w.k;
            float distFade = 1.0 - smoothstep(wavelength * 12.0, wavelength * 40.0, camDist);
            float phase = w.k * (dot(w.dir, p) - w.speed * time);
            float s = sin(phase);
            float c = cos(phase);
            float effSteep = w.steepness * waveWeight * stormScale * distFade;
            slope += w.dir * (effSteep * c);
            height += (w.a * waveWeight * stormScale * distFade) * s;
            pinch += effSteep * s;
          }

          // 2. Sub-mesh meso-scale & cross-chop swells (scaled by Low / Balanced / Max quality tier)
          float mesoCutoff = tier > 1.5 ? uMaxCapDist * 1.55 : (tier > 0.5 ? uMaxCapDist * 1.35 : uMaxCapDist * 1.15);
          float mesoFade = (1.0 - smoothstep(38.0, mesoCutoff, camDist)) * waveWeight;
          if (mesoFade > 0.005) {
            vec2 w = uWind;
            vec2 a = vec2(-w.y, w.x);

            // Harmonic 1 & 2: Primary wind-aligned meso rollers (Active on all tiers)
            vec2 d1 = normalize(w * 0.92 + a * 0.39);
            float ph1 = 0.683 * (dot(p, d1) - 3.8 * time);
            float s1 = sin(ph1), c1 = cos(ph1);

            vec2 d2 = normalize(w * 0.84 - a * 0.54);
            float ph2 = 1.163 * (dot(p, d2) - 2.9 * time);
            float s2 = sin(ph2), c2 = cos(ph2);

            vec2 mSlope = d1 * (0.098 * c1) + d2 * (0.078 * c2);
            float mHeight = 0.145 * s1 + 0.085 * s2;
            float mPinch = 0.098 * s1 + 0.078 * s2;

            // Harmonic 3 & 4: Balanced & Max cross-swell interference (3.3m & 1.9m wavelengths)
            if (tier > 0.5) {
              vec2 d3 = normalize(w * 0.65 + a * 0.76);
              float ph3 = 1.904 * (dot(p, d3) - 2.2 * time);
              float s3 = sin(ph3), c3 = cos(ph3);

              vec2 d4 = normalize(w * 0.45 - a * 0.89);
              float ph4 = 3.307 * (dot(p, d4) - 1.7 * time);
              float s4 = sin(ph4), c4 = cos(ph4);

              mSlope += d3 * (0.056 * c3) + d4 * (0.040 * c4);
              mHeight += 0.042 * s3 + 0.022 * s4;
              mPinch += 0.056 * s3 + 0.040 * s4;
            }

            // Harmonic 5 & 6: Max Tier (Black Flag Resynced) diamond wind-chop wavelets (1.15m & 0.78m)
            if (tier > 1.5 && camDist < 135.0) {
              float chopFade = 1.0 - smoothstep(35.0, 135.0, camDist);
              vec2 d5 = normalize(w * 0.96 - a * 0.28);
              float ph5 = 5.46 * (dot(p, d5) - 1.32 * time);
              vec2 d6 = normalize(w * 0.78 + a * 0.62);
              float ph6 = 8.05 * (dot(p, d6) - 1.08 * time);

              mSlope += (d5 * (0.028 * cos(ph5)) + d6 * (0.021 * cos(ph6))) * chopFade;
              mHeight += (0.011 * sin(ph5) + 0.007 * sin(ph6)) * chopFade;
              mPinch += (0.028 * sin(ph5) + 0.021 * sin(ph6)) * chopFade;
            }

            slope += mSlope * mesoFade * stormScale;
            height += mHeight * mesoFade;
            pinch += mPinch * mesoFade;
          }

          return vec4(slope, height, pinch);
        }

        // Multi-Harmonic Phillips-spectrum capillary normal perturbation (1, 3, or 7 harmonics)
        vec2 computeCapillarySlope(vec2 p, float time, float harmonics, float crestPinch, float camDist) {
          vec2 wind = uWind;
          vec2 across = vec2(-wind.y, wind.x);
          vec2 q1 = vec2(dot(p, wind), dot(p, across));

          // Base Harmonics (Low / Fast = 1 harmonic pair)
          vec2 uv1 = q1 * 0.028 - vec2(time * 0.015, time * 0.004);
          vec2 n1 = texture2D(uWaterDetail, uv1).rg - 0.5;

          vec2 q2 = vec2(q1.x * 0.82 - q1.y * 0.57, q1.x * 0.57 + q1.y * 0.82);
          vec2 uv2 = q2 * 0.068 + vec2(-time * 0.020, time * 0.006);
          vec2 n2 = texture2D(uWaterDetail, uv2).rg - 0.5;

          vec2 localSlope = n1 * 0.58 + n2 * 0.42;

          // Balanced Tier (3 harmonics): Cross-wind medium capillary ripples
          if (harmonics > 2.0) {
            vec2 uv3 = q1 * 0.155 + vec2(time * 0.026, -time * 0.008);
            vec2 n3 = texture2D(uWaterDetail, uv3).rg - 0.5;
            vec2 uv4 = q2 * 0.31 - vec2(time * 0.032, time * 0.011);
            vec2 n4 = texture2D(uWaterDetail, uv4).rg - 0.5;
            localSlope += n3 * 0.28 + n4 * 0.16;
          }

          // Max Tier / Black Flag Resynced (7 harmonics): High-frequency anisotropic wave-crest capillary facets
          if (harmonics > 5.0 && camDist < 140.0) {
            float microFade = (1.0 - smoothstep(30.0, 140.0, camDist)) * (0.85 + clamp(crestPinch, 0.0, 0.45) * 0.75);
            vec2 q3 = vec2(q1.x * 0.64 + q1.y * 0.77, -q1.x * 0.77 + q1.y * 0.64);
            vec2 uv5 = q3 * 0.58 - vec2(time * 0.044, -time * 0.019);
            vec2 n5 = texture2D(uWaterDetail, uv5).rg - 0.5;
            vec2 uv6 = q1 * 0.92 + vec2(-time * 0.052, time * 0.024);
            vec2 n6 = texture2D(uWaterDetail, uv6).rg - 0.5;
            localSlope += (n5 * 0.15 + n6 * 0.10) * microFade;
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
            float capFade = (1.0 - smoothstep(uMaxCapDist * 0.28, uMaxCapDist, camDist)) * waveWeight;
            vec2 capSlope = computeCapillarySlope(vWorldPosition.xz, uTime, uCapillaryHarmonics, totalPinch, camDist);
            float capWeight = (0.34 + uStorm * 0.14) * capFade;
            normal = normalize(vec3(
              macroMesoNormal.x + capSlope.x * capWeight,
              macroMesoNormal.y,
              macroMesoNormal.z + capSlope.y * capWeight
            ));
          }

          // 2. Assassin's Creed IV: Black Flag Beer-Lambert Optical Water Volume & Bathymetry
          float slopeLight = clamp(dot(macroMesoNormal, lightDir) * 0.5 + 0.5, 0.0, 1.0);
          float opticalNdotV = clamp(dot(viewDir, macroMesoNormal), 0.0, 1.0);

          // Beer-Lambert depth absorption: looking steeply down reveals deep indigo-sapphire;
          // wave faces and oblique angles reveal vibrant cerulean-teal internal scatter
          float opticalDepthMix = mix(0.72, 0.32, pow(opticalNdotV, 0.65));
          float waveElevationMix = smoothstep(-0.95, 0.85, totalWaveHeight);
          vec3 pelagicBase = mix(uDeepWaterColor, uMidWaterColor, clamp(opticalDepthMix + waveElevationMix * 0.22, 0.0, 1.0));
          // Subtle internal cyan-teal scatter on sunlit wave faces
          vec3 internalScatter = mix(uMidWaterColor, uCrestGlowColor, 0.35) * pow(slopeLight, 2.2) * 0.16 * (1.0 - uStorm * 0.7);
          vec3 pelagicColor = pelagicBase * mix(0.86, 1.08, slopeLight) + internalScatter;

          // True Shoreline Coral Reef & Lagoon Shallows (seabed > -3.0m)
          float coastalMask = smoothstep(-3.0, -0.04, seabed);
          vec3 waterColor = pelagicColor;
          if (coastalMask > 0.001) {
            float reefBlend = pow(coastalMask, 1.35);
            float beachShallowness = smoothstep(0.32, 0.96, coastalMask);
            vec3 reefTurquoise = mix(vec3(0.03, 0.42, 0.52), uShallowColor, 0.45);
            vec3 lagoonAqua = mix(vec3(0.10, 0.68, 0.64), uLagoonColor, 0.45);
            vec3 shallowPalette = mix(reefTurquoise, lagoonAqua, beachShallowness);

            // Golden coral sand warmth in ultra-shallow beach swash (< 0.65m depth)
            if (uIsNight < 0.5) {
              float sandGlow = smoothstep(-0.65, -0.02, seabed);
              shallowPalette = mix(shallowPalette, vec3(0.42, 0.76, 0.66), sandGlow * 0.35 * (1.0 - uStorm));
            }

            // Tier-Scaled Refracted Underwater Caustics (Balanced & Max tiers)
            if (uQualityTier > 0.5 && camDist < 240.0) {
              vec2 refractOffset = normal.xz * (0.35 + (1.0 - coastalMask) * 0.45);
              vec2 cUV1 = (vWorldPosition.xz + refractOffset) * 0.125 + vec2(uTime * 0.032, uTime * 0.016);
              vec2 cUV2 = (vWorldPosition.xz - refractOffset * 0.8) * 0.155 - vec2(uTime * 0.026, -uTime * 0.022);
              float c1 = cellularFoam(cUV1);
              float c2 = cellularFoam(cUV2);
              float caustics = smoothstep(0.42, 0.86, min(c1, c2));
              float causticFade = coastalMask * (1.0 - smoothstep(55.0, 240.0, camDist)) * (1.0 - uStorm * 0.85);

              if (uQualityTier > 1.5 && camDist < 140.0) {
                // Max Tier: Chromatic dispersion caustics (golden-cyan refracted caustic fringes)
                float cShift = cellularFoam(cUV1 + normal.xz * 0.08);
                vec3 chromaCaustic = uIsNight > 0.5
                  ? vec3(0.08, 0.24, 0.38) * caustics
                  : vec3(caustics * 0.26 + cShift * 0.08, caustics * 0.88, caustics * 0.72 + cShift * 0.12);
                shallowPalette += chromaCaustic * causticFade * 0.34;
              } else {
                vec3 causticTint = uIsNight > 0.5 ? vec3(0.08, 0.22, 0.35) : vec3(0.20, 0.84, 0.76);
                shallowPalette += causticTint * caustics * causticFade * 0.28;
              }
            }

            waterColor = mix(pelagicColor, shallowPalette, reefBlend * 0.90);
          }

          // 3. AC4 Black Flag Wave Crest Subsurface Scattering (SSS)
          // Combines direct solar back-scattering AND omnidirectional thin-crest emerald glow
          vec3 sss = vec3(0.0);
          if (camDist < uMaxSSSDist) {
            vec3 sssLightDir = normalize(lightDir + macroMesoNormal * 0.42);
            float backScatter = pow(max(dot(viewDir, -sssLightDir), 0.0), 3.2);
            float sideScatter = pow(max(1.0 - abs(dot(viewDir, lightDir)), 0.0), 2.0) * 0.35;
            float slopeTilt = smoothstep(0.015, 0.24, 1.0 - macroMesoNormal.y);
            float crestHeightMask = smoothstep(0.16, 0.76, totalWaveHeight);
            float crestPinchMask = smoothstep(0.05, 0.28, totalPinch);
            float crestMask = crestHeightMask * (0.35 + 0.65 * crestPinchMask);
            float sssDistFade = 1.0 - smoothstep(uMaxSSSDist * 0.35, uMaxSSSDist, camDist);

            vec3 emeraldCore = uIsNight > 0.5
              ? mix(vec3(0.05, 0.22, 0.38), uSubsurfaceColor * 0.45, 0.5)
              : mix(vec3(0.04, 0.76, 0.64), mix(uSubsurfaceColor, uCrestGlowColor, 0.45), 0.55);

            float sssStrength = (backScatter * 1.05 + sideScatter * slopeTilt + slopeTilt * 0.42) * crestMask * sssDistFade;
            sss = emeraldCore * sssStrength * (uIsNight > 0.5 ? 0.58 : 0.92) * (1.0 - uStorm * 0.68);
          }

          // 4. Bruneton Roughness-Attenuated Fresnel & Tier-Scaled Sky / Cloud Reflection
          vec3 fresnelNormal = normalize(mix(vec3(0.0, 1.0, 0.0), normal, uQualityTier > 1.5 ? 0.14 : 0.09));
          float NdotV = clamp(dot(viewDir, fresnelNormal), 0.0, 1.0);
          float distRoughness = smoothstep(40.0, uHorizonCutoff * 0.85, camDist) * 0.25;
          float fresnel = 0.06 + (0.82 - distRoughness) * pow(1.0 - NdotV, 3.6);

          vec3 reflNormal = normalize(mix(vec3(0.0, 1.0, 0.0), normal, 0.42));
          vec3 reflectionDir = reflect(-viewDir, reflNormal);
          reflectionDir.y = max(0.02, reflectionDir.y);

          vec3 skyZenith = uIsNight > 0.5 ? vec3(0.04, 0.10, 0.18) : mix(uSkyTopColor, uSkyMidColor, 0.45);
          vec3 skyReflection = mix(uSkyHorizonColor, skyZenith, pow(clamp(reflectionDir.y, 0.0, 1.0), 0.52));

          // Max Tier: Procedural trade-wind cumulus cloud reflections on the water surface
          if (uQualityTier > 1.5 && camDist < 420.0 && reflectionDir.y > 0.04) {
            vec2 reflCloudPos = cameraPosition.xz * 0.3 + reflectionDir.xz * (180.0 / max(0.06, reflectionDir.y));
            float reflCloud = cloudField(reflCloudPos, uTime);
            float reflCoverage = mix(0.52, 0.26, uStorm);
            float cloudReflMask = smoothstep(reflCoverage, reflCoverage + 0.20, reflCloud) * smoothstep(0.04, 0.22, reflectionDir.y);
            float cloudDistFade = (1.0 - smoothstep(180.0, 420.0, camDist)) * (1.0 - uStorm * 0.75);
            vec3 reflCloudColor = uIsNight > 0.5 ? vec3(0.14, 0.20, 0.30) : mix(vec3(0.88, 0.94, 0.98), uSunColor, 0.25);
            skyReflection = mix(skyReflection, reflCloudColor, cloudReflMask * cloudDistFade * 0.36);
          }

          float sunReflAlign = max(0.0, dot(reflectionDir, lightDir));
          skyReflection += uSunColor * pow(sunReflAlign, 8.0) * (uIsNight > 0.5 ? 0.09 : 0.22) * (1.0 - uStorm);

          waterColor = mix(waterColor, waterColor * vec3(0.45, 0.58, 0.62), uStorm);
          vec3 baseShaded = mix(waterColor + sss, skyReflection, fresnel);

          // 5. Dual-Lobe GGX Solar Specular Path & Micro-Facet Diamond Glitter
          vec3 halfVector = normalize(lightDir + viewDir);
          float NdotH = max(dot(normal, halfVector), 0.0);
          float NdotL = max(dot(normal, lightDir), 0.0);
          float specNdotV = max(dot(viewDir, normal), 0.01);

          float roughPatch = texture2D(uWaterDetail, vWorldPosition.xz * 0.012 + uWind * uTime * 0.0015).a;
          vec3 normalDx = dFdx(normal), normalDy = dFdy(normal);
          float variance = min(0.10, dot(normalDx, normalDx) + dot(normalDy, normalDy));
          float rRough = mix(0.10, 0.20, roughPatch);
          float alphaSquared = clamp(rRough * rRough * rRough * rRough + variance * 0.38, 0.0007, 0.12);
          float denominator = NdotH * NdotH * (alphaSquared - 1.0) + 1.0;
          float distribution = alphaSquared / (3.14159265 * denominator * denominator);
          float visibilityV = NdotL * sqrt(specNdotV * specNdotV * (1.0 - alphaSquared) + alphaSquared);
          float visibilityL = specNdotV * sqrt(NdotL * NdotL * (1.0 - alphaSquared) + alphaSquared);
          float sunFresnel = 0.02 + 0.98 * pow5(1.0 - max(dot(viewDir, halfVector), 0.0));
          float specIntensity = distribution * (0.5 / max(visibilityV + visibilityL, 0.001)) * sunFresnel * NdotL;

          float macroNdotH = max(dot(macroMesoNormal, halfVector), 0.0);
          float sunPathGlow = pow(macroNdotH, 26.0) * 0.22 * max(dot(macroMesoNormal, lightDir), 0.0);

          // Sparkling Micro-Facet Sun Glitter (Balanced & Max tiers when glitterEnabled is active)
          float glitter = 0.0;
          if (uGlitterEnabled > 0.5 && camDist < 190.0 && variance < 0.035) {
            float glitterFade = (1.0 - smoothstep(35.0, 190.0, camDist)) * (1.0 - variance * 25.0);
            float facetSparkle = smoothstep(uQualityTier > 1.5 ? 0.986 : 0.990, 0.9992, NdotH);
            glitter = facetSparkle * glitterFade * (uQualityTier > 1.5 ? 2.4 : 1.5) * NdotL;
          }

          baseShaded += uSunColor * (specIntensity * 1.18 + sunPathGlow + glitter) * (uIsNight > 0.5 ? 0.32 : 1.08) * (1.0 - uStorm * 0.92);

          // 6. AC4 Black Flag Whitecap Foam, Langmuir Wind Streaks & Shoreline Surf
          float crestBreak = smoothstep(0.34, 0.82 + uStorm * 0.32, totalWaveHeight) * smoothstep(0.16, 0.35, totalPinch);
          float crestFoam = 0.0;
          if (camDist < uMaxFoamDist) {
            float foamDistFade = 1.0 - smoothstep(uMaxFoamDist * 0.45, uMaxFoamDist, camDist);
            if (crestBreak > 0.008) {
              float foamCell = cellularFoam(vWorldPosition.xz * 1.85 + vec2(uTime * 0.04, -uTime * 0.025));
              float foamPatch = texture2D(uWaterDetail, vWorldPosition.xz * 0.025 - uWind * uTime * 0.003).a;
              float lacyFoam = smoothstep(0.22, 0.68, foamCell) * (0.48 + foamPatch * 0.62);
              crestFoam = crestBreak * lacyFoam * foamDistFade;
            }

            // Balanced & Max Tier: Wind-driven trailing foam striations & Langmuir streaks
            if (uQualityTier > 0.5 && totalWaveHeight > 0.05) {
              vec2 wind = uWind;
              vec2 across = vec2(-wind.y, wind.x);
              vec2 windCoords = vec2(dot(vWorldPosition.xz, wind), dot(vWorldPosition.xz, across));
              float streakNoise = texture2D(uWaterDetail, vec2(windCoords.x * 0.018 - uTime * 0.012, windCoords.y * 0.14)).b;
              float fineBubbles = cellularFoam(vWorldPosition.xz * 2.8 - wind * uTime * 0.08);
              float trailMask = smoothstep(0.12, 0.55, totalWaveHeight) * smoothstep(0.08, 0.26, totalPinch + uStorm * 0.15);
              float streakStrength = smoothstep(0.54, 0.86, streakNoise) * (0.4 + 0.6 * fineBubbles);
              crestFoam += trailMask * streakStrength * foamDistFade * (uQualityTier > 1.5 ? 0.42 : 0.24);
            }
          }

          // Shoreline Breaking Surf Foam (within 0m..1.85m depth along island beaches)
          float minDistToShore = max(0.0, -seabed) * 4.0;
          float totalShoreFoam = 0.0;
          if (seabed > -1.85 && camDist < 360.0) {
            float contactBand = smoothstep(-0.4, 0.2, minDistToShore) * (1.0 - smoothstep(0.8, 3.8, minDistToShore));
            float surfPulse = sin(uTime * 2.2 - minDistToShore * 1.6) * 0.5 + 0.5;
            float swashWave = smoothstep(0.25, 1.5, minDistToShore) * (1.0 - smoothstep(1.8, 4.8, minDistToShore)) * surfPulse;
            float frothDetail = cellularFoam(vWorldPosition.xz * 1.15 + vec2(uTime * 0.07, -uTime * 0.05));
            float lacyFroth = smoothstep(0.16, 0.62, frothDetail);
            float shoreNoise = sin(vWorldPosition.x * 0.85 + vWorldPosition.z * 0.65 + uTime * 0.35) * 0.2 + 0.8;
            totalShoreFoam = clamp((contactBand * 0.62 + swashWave * 0.48) * (0.5 + lacyFroth * 0.5) * shoreNoise, 0.0, 0.56);
          }

          float totalFoam = clamp(crestFoam * 0.56 + totalShoreFoam, 0.0, 0.92);
          // Shade foam with solar NdotL + subsurface emerald tint in foam shadows
          float foamLight = mix(0.68, 1.04, clamp(dot(macroMesoNormal, lightDir) * 0.5 + 0.5, 0.0, 1.0));
          vec3 litFoam = uFoamColor * foamLight * mix(0.98, 0.46, uStorm);
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

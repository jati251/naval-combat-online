import { STORM_WARNING_RADIUS, STORM_FULL_RADIUS } from '../../../../../server/src/engine/StormSystem';

export const stormMathGLSL = `
  float stormAt(vec2 p) {
    float t = clamp((length(p) - ${STORM_WARNING_RADIUS.toFixed(1)}) / ${(STORM_FULL_RADIUS-STORM_WARNING_RADIUS).toFixed(1)}, 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
  }
`;

export const weatherUniformsGLSL = `
  uniform sampler2D uWeatherNoise;
  uniform vec3 uSkyTopColor;
  uniform float uStorm;
  uniform float uLightning;
  uniform vec2 uWind;
`;

export const atmosphereFunctionsGLSL = `
  float cloudField(vec2 p, float time) {
    vec2 uv = p * 0.00038 + uWind * time * 0.00065;
    float large = texture2D(uWeatherNoise, uv).r;
    float small = texture2D(uWeatherNoise, uv * 2.07 + vec2(0.37, 0.19)).g;
    return large * 0.76 + small * 0.24;
  }

  float cloudFieldSculpted(vec2 p, float time) {
    vec2 uv = p * 0.00038 + uWind * time * 0.00065;
    float large = texture2D(uWeatherNoise, uv).r;
    float med = texture2D(uWeatherNoise, uv * 2.07 + vec2(0.37, 0.19)).g;
    float fine = texture2D(uWeatherNoise, uv * 4.35 - uWind * time * 0.0004).r;
    return large * 0.64 + med * 0.24 + fine * 0.12;
  }

  vec3 atmosphereColor(vec3 dir, vec3 horizon, vec3 sun, vec3 sunDir, float night, float time, vec2 origin, bool detailed) {
    float elevation = max(0.0, dir.y);
    // Non-linear atmospheric Rayleigh sky gradient matching horizon fog at elevation = 0
    vec3 clear = mix(horizon, uSkyTopColor, pow(smoothstep(0.0, 0.92, elevation), 0.54));
    float midBelt = sin(smoothstep(0.0, 0.44, elevation) * 3.14159265);
    clear += vec3(0.025, 0.105, 0.16) * midBelt * (1.0 - night) * (1.0 - uStorm);

    // Warm tropical golden-hour horizon scattering band
    float horizonGlow = exp(-elevation * 7.5);
    float mu = max(0.0, dot(dir, sunDir));
    clear += sun * horizonGlow * (0.08 + 0.18 * pow(mu, 3.0)) * (1.0 - night * 0.65) * (1.0 - uStorm);

    // Multi-lobe Mie atmospheric solar halo (warm golden corona around sun)
    float mieHalo = pow(mu, 4.0) * 0.15 + pow(mu, 16.0) * 0.36 + pow(mu, 64.0) * 0.78;
    float sunDisc = smoothstep(0.99972, 0.99998, mu) * 8.5;
    clear += sun * (mieHalo + sunDisc) * (1.0 - uStorm);

    vec3 sky = mix(clear, mix(horizon, vec3(0.022, 0.03, 0.038), smoothstep(0.0, 0.65, elevation)), uStorm);
    if (dir.y > (detailed ? 0.022 : 0.05)) {
      vec2 p = origin * 0.3 + dir.xz * (210.0 / max(0.03, dir.y));
      float density = detailed
        ? cloudFieldSculpted(p, time)
        : texture2D(uWeatherNoise, p * 0.00038 + uWind * time * 0.00065).r;
      float coverage = mix(0.51, 0.24, uStorm);
      float body = smoothstep(coverage, coverage + 0.18, density);
      float lightDensity = detailed ? cloudField(p + sunDir.xz * 95.0, time) : density;
      float thickness = smoothstep(coverage, coverage + 0.28, density);
      float edge = clamp((density - lightDensity) * 5.2 + 0.54, 0.0, 1.0);
      // Beer-Powder volumetric cloud scattering approximation (AC4 Black Flag cumulus)
      float beer = exp(-thickness * 2.0);
      float powder = 1.0 - exp(-thickness * 3.8);
      float transmission = mix(0.82, 1.18, beer * (0.65 + 0.35 * powder));

      // Sun-drenched Caribbean trade-wind cumulus: airy azure-cerulean shadow bases & warm ivory tops
      vec3 cloudShadow = mix(vec3(0.50, 0.67, 0.83), vec3(0.19, 0.25, 0.31), uStorm);
      vec3 cloudLit = mix(vec3(1.03, 0.99, 0.93), sun, 0.22);
      vec3 base = mix(cloudShadow, cloudLit, edge) * transmission;
      base = mix(base, vec3(0.035, 0.045, 0.053), uStorm * 0.85);
      base *= mix(1.0, 0.17, night);

      // Silver-lining on cloud silhouettes back-lit by the sun + crepuscular god-ray shafts
      float silver = pow(mu, 12.0) * (1.0 - body) * body * 3.8;
      base += sun * silver * (1.0 - uStorm);
      base += vec3(0.42, 0.50, 0.63) * uLightning;

      float horizonFade = smoothstep(0.05, 0.23, dir.y);
      body *= horizonFade;
      sky = mix(sky, base, body);

      // Crepuscular atmospheric solar shafts streaming through cumulus gaps
      if (detailed && mu > 0.35) {
        float shaftGap = 1.0 - smoothstep(coverage - 0.04, coverage + 0.10, lightDensity);
        float shaftStrength = pow(mu, 8.0) * shaftGap * horizonFade * (1.0 - elevation * 0.75) * 0.16;
        sky += sun * shaftStrength * (1.0 - uStorm) * (1.0 - night * 0.7);
      }
    }
    return sky + uLightning * vec3(0.08, 0.10, 0.13);
  }
`;


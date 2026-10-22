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
    return large * 0.78 + small * 0.22;
  }
  vec3 atmosphereColor(vec3 dir, vec3 horizon, vec3 sun, vec3 sunDir, float night, float time, vec2 origin, bool detailed) {
    float elevation = max(0.0, dir.y);
    // Non-linear atmospheric Rayleigh sky gradient matching horizon fog at elevation = 0
    vec3 clear = mix(horizon, uSkyTopColor, pow(smoothstep(0.0, 0.92, elevation), 0.56));
    float midBelt = sin(smoothstep(0.0, 0.42, elevation) * 3.14159265);
    clear += vec3(0.02, 0.09, 0.14) * midBelt * (1.0 - night) * (1.0 - uStorm);
    float mu = max(0.0, dot(dir, sunDir));

    // Multi-lobe Mie atmospheric solar halo (warm golden corona around sun)
    float mieHalo = pow(mu, 4.0) * 0.14 + pow(mu, 14.0) * 0.34 + pow(mu, 56.0) * 0.72;
    float sunDisc = smoothstep(0.99975, 0.99998, mu) * 8.0;
    clear += sun * (mieHalo + sunDisc) * (1.0 - uStorm);

    vec3 sky = mix(clear, mix(horizon, vec3(0.022, 0.03, 0.038), smoothstep(0.0, 0.65, elevation)), uStorm);
    if (dir.y > (detailed ? 0.025 : 0.05)) {
      vec2 p = origin * 0.3 + dir.xz * (210.0 / max(0.03, dir.y));
      float density = detailed
        ? cloudField(p, time)
        : texture2D(uWeatherNoise, p * 0.00038 + uWind * time * 0.00065).r;
      float coverage = mix(0.52, 0.25, uStorm);
      float body = smoothstep(coverage, coverage + 0.18, density);
      float lightDensity = detailed ? cloudField(p + sunDir.xz * 95.0, time) : density;
      float thickness = smoothstep(coverage, coverage + 0.28, density);
      float edge = clamp((density - lightDensity) * 5.0 + 0.52, 0.0, 1.0);
      float transmission = exp(-thickness * 2.1);
      // Sun-drenched Caribbean trade-wind cumulus: airy azure-cerulean shadow bases & warm ivory tops
      vec3 cloudShadow = mix(vec3(0.52, 0.68, 0.82), vec3(0.20, 0.26, 0.32), uStorm);
      vec3 cloudLit = vec3(1.02, 0.99, 0.94);
      vec3 base = mix(cloudShadow, cloudLit, edge);
      base *= mix(0.84, 1.14, transmission);
      base = mix(base, vec3(0.035, 0.045, 0.053), uStorm * 0.85);
      base *= mix(1.0, 0.16, night);

      // Silver-lining on cloud silhouettes back-lit by the sun
      float silver = pow(mu, 14.0) * (1.0 - body) * body * 3.4;
      base += sun * silver * (1.0 - uStorm);
      base += vec3(0.42, 0.50, 0.63) * uLightning;
      body *= smoothstep(0.06, 0.24, dir.y);
      sky = mix(sky, base, body);
    }
    return sky + uLightning * vec3(0.08, 0.10, 0.13);
  }
`;

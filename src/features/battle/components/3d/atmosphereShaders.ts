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
    return large * 0.8 + small * 0.2;
  }
  vec3 atmosphereColor(vec3 dir, vec3 horizon, vec3 sun, vec3 sunDir, float night, float time, vec2 origin, bool detailed) {
    float elevation = max(0.0, dir.y);
    vec3 clear = mix(horizon, uSkyTopColor, sqrt(smoothstep(0.0, 0.85, elevation)));
    float mu = max(0.0, dot(dir, sunDir));
    float mu2 = mu * mu;
    float mu4 = mu2 * mu2;
    float mu8 = mu4 * mu4;
    float mu16 = mu8 * mu8;
    float mu18 = mu16 * mu2;
    float mu36 = mu18 * mu18;
    clear += sun * (mu36 * 0.12 + smoothstep(0.99994, 0.999985, mu) * 7.0) * (1.0 - uStorm);
    vec3 sky = mix(clear, mix(horizon, vec3(0.022, 0.03, 0.038), smoothstep(0.0, 0.65, elevation)), uStorm);
    if (dir.y > (detailed ? 0.015 : 0.04)) {
      vec2 p = origin * 0.3 + dir.xz * (210.0 / max(0.02, dir.y));
      float density = detailed
        ? cloudField(p, time)
        : texture2D(uWeatherNoise, p * 0.00038 + uWind * time * 0.00065).r;
      float coverage = mix(0.50, 0.25, uStorm);
      float body = smoothstep(coverage, coverage + 0.16, density);
      float lightDensity = detailed ? cloudField(p + sunDir.xz * 95.0, time) : density;
      float thickness = smoothstep(coverage, coverage + 0.28, density);
      float edge = clamp((density - lightDensity) * 5.0 + 0.48, 0.0, 1.0);
      float transmission = exp(-thickness * 2.4);
      vec3 base = mix(vec3(0.22, 0.28, 0.34), vec3(0.88, 0.86, 0.79), edge);
      base *= mix(0.78, 1.12, transmission);
      base = mix(base, vec3(0.035, 0.045, 0.053), uStorm * 0.85);
      base *= mix(1.0, 0.14, night);
      float silver = mu18 * (1.0 - body) * body * 2.8;
      base += sun * silver * (1.0 - uStorm);
      base += vec3(0.42, 0.50, 0.63) * uLightning;
      body *= smoothstep(0.04, 0.22, dir.y);
      sky = mix(sky, base, body);
    }
    return sky + uLightning * vec3(0.08, 0.10, 0.13);
  }
`;

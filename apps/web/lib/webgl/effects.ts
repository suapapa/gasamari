export interface LyricsEffect {
  id: string;
  duration: number;
  vertexShader: string;
  fragmentShader: string;
}

const COMMON_VERT_HEAD = /* glsl */ `
varying vec2 vUv;
uniform float uProgress;
uniform float uSeed;
uniform float uTime;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float easeOutCubic(float t) {
  float u = 1.0 - t;
  return 1.0 - u * u * u;
}

float easeOutBack(float t) {
  float c1 = 1.70158;
  float c3 = c1 + 1.0;
  float u = t - 1.0;
  return 1.0 + c3 * u * u * u + c1 * u * u;
}
`;

const COMMON_FRAG_HEAD = /* glsl */ `
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uProgress;
uniform float uSeed;
uniform float uTime;
uniform vec3 uGlowColor;
uniform vec2 uResolution;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34 + uSeed, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float easeOutCubic(float t) {
  float u = 1.0 - t;
  return 1.0 - u * u * u;
}

float easeInOut(float t) {
  return t < 0.5 ? 2.0 * t * t : 1.0 - pow(-2.0 * t + 2.0, 2.0) / 2.0;
}
`;

const PASSTHROUGH_VERT = /* glsl */ `
${COMMON_VERT_HEAD}
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const LYRICS_EFFECTS: LyricsEffect[] = [
  {
    id: "scatterIn",
    duration: 0.85,
    vertexShader: /* glsl */ `
      ${COMMON_VERT_HEAD}
      void main() {
        vUv = uv;
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        float n = hash21(uv * 40.0 + uSeed);
        vec3 pos = position;
        vec2 dir = normalize(uv - 0.5 + vec2(0.001));
        float scatter = (1.0 - p);
        pos.xy += dir * scatter * (0.35 + n * 0.9);
        pos.xy += vec2(n - 0.5, hash21(uv.yx + uSeed) - 0.5) * scatter * 0.55;
        pos.z += scatter * (n - 0.5) * 0.2;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        vec4 color = texture2D(uTexture, vUv);
        float glow = color.a * (1.0 - p) * 0.65;
        color.rgb += uGlowColor * glow;
        color.a *= mix(0.15, 1.0, p);
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "shatter",
    duration: 0.9,
    vertexShader: /* glsl */ `
      ${COMMON_VERT_HEAD}
      void main() {
        vUv = uv;
        float p = easeOutBack(clamp(uProgress, 0.0, 1.0));
        vec2 cell = floor(uv * vec2(12.0, 8.0));
        float n = hash21(cell + uSeed);
        float ang = n * 6.28318;
        vec2 dir = vec2(cos(ang), sin(ang));
        vec3 pos = position;
        float scatter = 1.0 - p;
        pos.xy += dir * scatter * (0.25 + n * 0.7);
        pos.z += scatter * (n - 0.5) * 0.35;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = clamp(uProgress, 0.0, 1.0);
        vec2 cell = floor(vUv * vec2(12.0, 8.0));
        float n = hash21(cell + uSeed);
        vec2 local = fract(vUv * vec2(12.0, 8.0));
        float edge = smoothstep(0.0, 0.08, min(min(local.x, local.y), min(1.0 - local.x, 1.0 - local.y)));
        vec4 color = texture2D(uTexture, vUv);
        color.rgb += uGlowColor * (1.0 - p) * 0.4 * n;
        color.a *= mix(edge, 1.0, p);
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "liquidWave",
    duration: 0.8,
    vertexShader: PASSTHROUGH_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        float amp = (1.0 - p) * 0.08;
        vec2 uv = vUv;
        uv.x += sin(uv.y * 18.0 + uTime * 4.0 + uSeed * 6.0) * amp;
        uv.y += cos(uv.x * 14.0 - uTime * 3.0) * amp * 0.7;
        vec4 color = texture2D(uTexture, uv);
        color.rgb += uGlowColor * (1.0 - p) * color.a * 0.35;
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "glitchBurst",
    duration: 0.7,
    vertexShader: PASSTHROUGH_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = clamp(uProgress, 0.0, 1.0);
        float intensity = pow(1.0 - p, 1.4);
        float band = step(0.82, hash21(vec2(floor(vUv.y * 40.0), floor(uTime * 20.0) + uSeed)));
        float slice = (hash21(vec2(floor(vUv.y * 24.0), uSeed)) - 0.5) * 0.12 * intensity;
        vec2 uv = vUv + vec2(slice + band * 0.04 * intensity, 0.0);
        float chroma = 0.012 * intensity;
        float r = texture2D(uTexture, uv + vec2(chroma, 0.0)).r;
        float g = texture2D(uTexture, uv).g;
        float b = texture2D(uTexture, uv - vec2(chroma, 0.0)).b;
        float a = texture2D(uTexture, uv).a;
        vec3 rgb = vec3(r, g, b);
        rgb += uGlowColor * band * intensity * 0.5;
        if (a < 0.01) discard;
        gl_FragColor = vec4(rgb, a);
      }
    `,
  },
  {
    id: "vortex",
    duration: 0.9,
    vertexShader: PASSTHROUGH_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        vec2 centered = vUv - 0.5;
        float angle = (1.0 - p) * 3.5 * (0.4 + length(centered));
        float s = sin(angle);
        float c = cos(angle);
        vec2 spun = vec2(c * centered.x - s * centered.y, s * centered.x + c * centered.y);
        spun *= mix(1.6, 1.0, p);
        vec2 uv = spun + 0.5;
        vec4 color = texture2D(uTexture, uv);
        color.rgb += uGlowColor * (1.0 - p) * color.a * 0.45;
        color.a *= smoothstep(0.0, 0.2, p) * step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "pixelReveal",
    duration: 0.75,
    vertexShader: PASSTHROUGH_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        float blocks = mix(48.0, 1.0, p);
        vec2 grid = floor(vUv * blocks) / blocks + 0.5 / blocks;
        vec2 uv = mix(grid, vUv, p);
        vec4 color = texture2D(uTexture, uv);
        float n = hash21(floor(vUv * blocks) + uSeed);
        color.a *= mix(step(0.25, n), 1.0, p);
        color.rgb += uGlowColor * (1.0 - p) * 0.25 * color.a;
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "burnReveal",
    duration: 0.85,
    vertexShader: PASSTHROUGH_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = clamp(uProgress, 0.0, 1.0);
        vec4 color = texture2D(uTexture, vUv);
        float n = hash21(vUv * 6.0 + uSeed);
        // Higher in the center; corners stay above ~0 so p=1 can fully open.
        float field = 1.0 - length(vUv - 0.5) * 1.2 + n * 0.25;
        // p=0 → only the hot center shows; p=1 → cutoff below every pixel.
        float cutoff = mix(1.25, -0.35, easeOutCubic(p));
        float mask = smoothstep(cutoff - 0.12, cutoff + 0.18, field);
        mask = mix(mask, 1.0, smoothstep(0.9, 1.0, p));
        float edge = smoothstep(0.0, 0.15, mask) * (1.0 - smoothstep(0.45, 1.0, mask));
        color.rgb += uGlowColor * edge * 1.2 * (1.0 - p);
        color.a *= mask;
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "chromaticZoom",
    duration: 0.8,
    vertexShader: PASSTHROUGH_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        vec2 centered = vUv - 0.5;
        float zoom = mix(1.45, 1.0, p);
        float chroma = (1.0 - p) * 0.03;
        vec2 base = centered / zoom + 0.5;
        float r = texture2D(uTexture, centered / (zoom + chroma) + 0.5).r;
        float g = texture2D(uTexture, base).g;
        float b = texture2D(uTexture, centered / (zoom - chroma) + 0.5).b;
        float a = texture2D(uTexture, base).a;
        vec3 rgb = vec3(r, g, b) + uGlowColor * (1.0 - p) * a * 0.3;
        if (a < 0.01) discard;
        gl_FragColor = vec4(rgb, a);
      }
    `,
  },
  {
    id: "ripple",
    duration: 0.85,
    vertexShader: PASSTHROUGH_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        vec2 centered = vUv - 0.5;
        float dist = length(centered);
        float wave = sin(dist * 28.0 - uTime * 8.0 - uSeed * 4.0) * (1.0 - p) * 0.045;
        vec2 uv = vUv + normalize(centered + 0.0001) * wave;
        vec4 color = texture2D(uTexture, uv);
        color.rgb += uGlowColor * (1.0 - p) * color.a * 0.4;
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "explodeIn",
    duration: 0.75,
    vertexShader: /* glsl */ `
      ${COMMON_VERT_HEAD}
      void main() {
        vUv = uv;
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        vec3 pos = position;
        pos.xy *= mix(2.2, 1.0, p);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        float blurSpread = (1.0 - p) * 0.018;
        vec4 color = vec4(0.0);
        for (int i = -2; i <= 2; i++) {
          for (int j = -2; j <= 2; j++) {
            vec2 offset = vec2(float(i), float(j)) * blurSpread;
            color += texture2D(uTexture, vUv + offset);
          }
        }
        color /= 25.0;
        color.rgb += uGlowColor * (1.0 - p) * color.a * 0.5;
        color.a *= mix(0.35, 1.0, p);
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "scanReveal",
    duration: 0.7,
    vertexShader: PASSTHROUGH_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = clamp(uProgress, 0.0, 1.0);
        vec4 color = texture2D(uTexture, vUv);
        float sweep = smoothstep(p - 0.12, p, 1.0 - vUv.y);
        float line = smoothstep(0.02, 0.0, abs((1.0 - vUv.y) - p));
        color.rgb += uGlowColor * line * 1.4;
        color.a *= sweep;
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "magneticPull",
    duration: 0.85,
    vertexShader: /* glsl */ `
      ${COMMON_VERT_HEAD}
      void main() {
        vUv = uv;
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        vec3 pos = position;
        vec2 toCenter = -normalize(uv - 0.5 + 0.0001);
        float n = hash21(uv * 20.0 + uSeed);
        pos.xy += toCenter * (1.0 - p) * (0.4 + n * 0.5);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        vec4 color = texture2D(uTexture, vUv);
        color.rgb += uGlowColor * (1.0 - p) * color.a * 0.55;
        color.a *= mix(0.2, 1.0, p);
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "horizontalWipe",
    duration: 0.7,
    vertexShader: PASSTHROUGH_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = clamp(uProgress, 0.0, 1.0);
        vec4 color = texture2D(uTexture, vUv);
        float wipe = smoothstep(p - 0.1, p, vUv.x);
        float edge = smoothstep(0.02, 0.0, abs(vUv.x - p));
        color.rgb += uGlowColor * edge * 1.3;
        color.a *= wipe;
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "diagonalSlash",
    duration: 0.75,
    vertexShader: PASSTHROUGH_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = clamp(uProgress, 0.0, 1.0);
        vec4 color = texture2D(uTexture, vUv);
        float diag = (vUv.x + vUv.y) * 0.5;
        float mask = smoothstep(p - 0.14, p, diag);
        float edge = smoothstep(0.03, 0.0, abs(diag - p));
        color.rgb += uGlowColor * edge * 1.5;
        color.a *= mask;
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "typewriterBars",
    duration: 0.8,
    vertexShader: PASSTHROUGH_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = clamp(uProgress, 0.0, 1.0);
        float cols = 32.0;
        float col = floor(vUv.x * cols);
        float threshold = p * cols;
        float visible = step(col, threshold);
        float cursor = 1.0 - smoothstep(0.0, 1.2, abs(col - threshold));
        vec4 color = texture2D(uTexture, vUv);
        color.rgb += uGlowColor * cursor * 0.9;
        color.a *= visible;
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "mirrorFold",
    duration: 0.85,
    vertexShader: PASSTHROUGH_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        vec2 uv = vUv;
        float fold = (1.0 - p) * 0.5;
        uv.x = mix(abs(uv.x - 0.5) + 0.5 - fold, uv.x, p);
        vec4 color = texture2D(uTexture, uv);
        color.rgb += uGlowColor * (1.0 - p) * color.a * 0.4;
        color.a *= mix(0.3, 1.0, p);
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "elasticBounce",
    duration: 0.9,
    vertexShader: /* glsl */ `
      ${COMMON_VERT_HEAD}
      void main() {
        vUv = uv;
        float t = clamp(uProgress, 0.0, 1.0);
        float p = easeOutBack(t);
        vec3 pos = position;
        pos.y *= mix(0.2, 1.0, p);
        pos.x *= mix(1.35, 1.0, p);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = clamp(uProgress, 0.0, 1.0);
        vec4 color = texture2D(uTexture, vUv);
        color.rgb += uGlowColor * (1.0 - p) * color.a * 0.35;
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "smokeDrift",
    duration: 0.9,
    vertexShader: PASSTHROUGH_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        float n = hash21(vUv * 3.0 + uTime * 0.2 + uSeed);
        vec2 drift = vec2(
          sin(vUv.y * 10.0 + uTime * 2.0) * 0.04,
          (n - 0.5) * 0.06
        ) * (1.0 - p);
        vec4 color = texture2D(uTexture, vUv + drift);
        color.a *= mix(0.25 + n * 0.4, 1.0, p);
        color.rgb += uGlowColor * (1.0 - p) * color.a * 0.3;
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "neonPulse",
    duration: 0.75,
    vertexShader: PASSTHROUGH_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        vec4 color = texture2D(uTexture, vUv);
        float pulse = sin(uTime * 16.0 + uSeed) * 0.5 + 0.5;
        float glow = (1.0 - p) * (0.5 + pulse * 0.8);
        color.rgb += uGlowColor * glow * color.a;
        color.rgb = mix(color.rgb * 0.4, color.rgb, p);
        color.a *= mix(0.4, 1.0, p);
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "sliceAssemble",
    duration: 0.85,
    vertexShader: /* glsl */ `
      ${COMMON_VERT_HEAD}
      void main() {
        vUv = uv;
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        float row = floor(uv.y * 10.0);
        float n = hash21(vec2(row, uSeed));
        float dir = n > 0.5 ? 1.0 : -1.0;
        vec3 pos = position;
        pos.x += dir * (1.0 - p) * (0.55 + n * 0.45);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        vec4 color = texture2D(uTexture, vUv);
        float row = floor(vUv.y * 10.0);
        float line = 1.0 - smoothstep(0.0, 0.04, abs(fract(vUv.y * 10.0) - 0.5));
        color.rgb += uGlowColor * line * (1.0 - p) * 0.6;
        color.a *= mix(0.35, 1.0, p);
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "spiralIn",
    duration: 0.95,
    vertexShader: PASSTHROUGH_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        vec2 c = vUv - 0.5;
        float dist = length(c);
        float angle = (1.0 - p) * 6.28318 * (1.0 - dist);
        float s = sin(angle);
        float cs = cos(angle);
        vec2 spun = vec2(cs * c.x - s * c.y, s * c.x + cs * c.y);
        spun *= mix(0.3, 1.0, p);
        vec2 uv = spun + 0.5;
        vec4 color = texture2D(uTexture, uv);
        color.rgb += uGlowColor * (1.0 - p) * color.a * 0.5;
        color.a *= step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "inkBleed",
    duration: 0.9,
    vertexShader: PASSTHROUGH_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = clamp(uProgress, 0.0, 1.0);
        float n = hash21(vUv * 8.0 + uSeed);
        float bleed = (1.0 - p) * (0.02 + n * 0.03);
        vec4 color = vec4(0.0);
        color += texture2D(uTexture, vUv + vec2(bleed, 0.0));
        color += texture2D(uTexture, vUv - vec2(bleed, 0.0));
        color += texture2D(uTexture, vUv + vec2(0.0, bleed));
        color += texture2D(uTexture, vUv - vec2(0.0, bleed));
        color *= 0.25;
        float edge = smoothstep(0.0, 0.2, p) * (1.0 - smoothstep(0.7, 1.0, p));
        color.rgb += uGlowColor * edge * color.a * 0.8;
        color.a *= mix(0.4, 1.0, easeOutCubic(p));
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "strobeFlash",
    duration: 0.65,
    vertexShader: PASSTHROUGH_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = clamp(uProgress, 0.0, 1.0);
        vec4 color = texture2D(uTexture, vUv);
        float flash = step(0.5, fract(uTime * 12.0 + uSeed)) * (1.0 - p);
        color.rgb = mix(color.rgb, vec3(1.0), flash * 0.7);
        color.rgb += uGlowColor * flash * 0.5;
        color.a *= mix(0.2 + flash * 0.6, 1.0, p);
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "gravityDrop",
    duration: 0.8,
    vertexShader: /* glsl */ `
      ${COMMON_VERT_HEAD}
      void main() {
        vUv = uv;
        float t = clamp(uProgress, 0.0, 1.0);
        float p = easeOutBack(t);
        vec3 pos = position;
        float n = hash21(uv * 15.0 + uSeed);
        pos.y += (1.0 - p) * (0.7 + n * 0.4);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        vec4 color = texture2D(uTexture, vUv);
        color.rgb += uGlowColor * (1.0 - p) * color.a * 0.35;
        color.a *= mix(0.25, 1.0, p);
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "prismSplit",
    duration: 0.8,
    vertexShader: PASSTHROUGH_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        float spread = (1.0 - p) * 0.04;
        float r = texture2D(uTexture, vUv + vec2(spread, spread * 0.4)).r;
        float g = texture2D(uTexture, vUv).g;
        float b = texture2D(uTexture, vUv - vec2(spread, spread * 0.4)).b;
        float a = texture2D(uTexture, vUv).a;
        vec3 rgb = vec3(r, g, b) + uGlowColor * (1.0 - p) * a * 0.25;
        if (a < 0.01) discard;
        gl_FragColor = vec4(rgb, a);
      }
    `,
  },
  {
    id: "mosaicRain",
    duration: 0.9,
    vertexShader: PASSTHROUGH_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        float blocks = 24.0;
        vec2 cell = floor(vUv * blocks);
        float n = hash21(cell + uSeed);
        float appear = step(n * 0.85, p + 0.05);
        vec2 uv = (cell + 0.5) / blocks;
        uv = mix(uv, vUv, p);
        vec4 color = texture2D(uTexture, uv);
        color.a *= appear;
        color.rgb += uGlowColor * (1.0 - p) * color.a * 0.35 * n;
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "tunnelZoom",
    duration: 0.85,
    vertexShader: PASSTHROUGH_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        vec2 c = vUv - 0.5;
        float zoom = mix(0.25, 1.0, p);
        vec2 uv = c / zoom + 0.5;
        float rings = sin(length(c) * 40.0 - uTime * 10.0) * (1.0 - p) * 0.5 + 0.5;
        vec4 color = texture2D(uTexture, uv);
        color.rgb += uGlowColor * rings * (1.0 - p) * color.a * 0.45;
        color.a *= step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "waveWarp",
    duration: 0.8,
    vertexShader: PASSTHROUGH_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        float amp = (1.0 - p) * 0.1;
        vec2 uv = vUv;
        uv.x += sin(uv.y * 30.0 + uTime * 6.0) * amp;
        uv.y += sin(uv.x * 22.0 - uTime * 5.0 + uSeed) * amp * 0.6;
        vec4 color = texture2D(uTexture, uv);
        color.rgb += uGlowColor * (1.0 - p) * color.a * 0.4;
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "letterboxReveal",
    duration: 0.7,
    vertexShader: PASSTHROUGH_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        float band = mix(0.5, 0.0, p);
        float mask = step(band, vUv.y) * step(vUv.y, 1.0 - band);
        float edge =
          smoothstep(0.0, 0.02, abs(vUv.y - band)) *
          smoothstep(0.0, 0.02, abs(vUv.y - (1.0 - band)));
        edge = 1.0 - min(edge, 1.0);
        vec4 color = texture2D(uTexture, vUv);
        color.rgb += uGlowColor * edge * (1.0 - p) * 0.8;
        color.a *= mask;
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
  {
    id: "sparkAssemble",
    duration: 0.9,
    vertexShader: /* glsl */ `
      ${COMMON_VERT_HEAD}
      void main() {
        vUv = uv;
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        float n = hash21(uv * 55.0 + uSeed);
        float ang = hash21(uv.yx + uSeed) * 6.28318;
        vec2 dir = vec2(cos(ang), sin(ang));
        vec3 pos = position;
        pos.xy += dir * (1.0 - p) * (0.2 + n * 1.1);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON_FRAG_HEAD}
      void main() {
        float p = easeOutCubic(clamp(uProgress, 0.0, 1.0));
        vec4 color = texture2D(uTexture, vUv);
        float spark = hash21(vUv * 80.0 + floor(uTime * 20.0));
        color.rgb += uGlowColor * spark * (1.0 - p) * color.a * 0.9;
        color.a *= mix(0.15, 1.0, p);
        if (color.a < 0.01) discard;
        gl_FragColor = color;
      }
    `,
  },
];

export function pickRandomEffect(excludeId?: string): LyricsEffect {
  const pool =
    excludeId && LYRICS_EFFECTS.length > 1
      ? LYRICS_EFFECTS.filter((effect) => effect.id !== excludeId)
      : LYRICS_EFFECTS;
  return pool[Math.floor(Math.random() * pool.length)] ?? LYRICS_EFFECTS[0]!;
}

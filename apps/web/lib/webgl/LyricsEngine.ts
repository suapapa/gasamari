import * as THREE from "three";
import { pickRandomEffect, type LyricsEffect } from "@/lib/webgl/effects";
import {
  ensureLyricsFont,
  hexToRgb,
  renderLyricsTexture,
} from "@/lib/webgl/textCanvas";

export type LyricsEngineCallbacks = {
  onError?: (error: unknown) => void;
};

export class LyricsEngine {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private texture: THREE.CanvasTexture | null = null;
  private rafId = 0;
  private startMs = 0;
  private duration = 0.8;
  private lastEffectId: string | undefined;
  private disposed = false;
  private width = 1;
  private height = 1;
  private generation = 0;
  private failureReported = false;
  private callbacks: LyricsEngineCallbacks;
  private handleContextLost = (event: Event): void => {
    // 앱 WebView에서 GPU 메모리 압박 등으로 컨텍스트가 날아가면 캔버스가
    // 흰 박스로만 남는다. 복구를 기다리지 않고 DOM 폴백으로 전환한다.
    event.preventDefault();
    this.callbacks.onError?.(new Error("WebGL context lost"));
  };

  constructor(canvas: HTMLCanvasElement, callbacks: LyricsEngineCallbacks = {}) {
    this.callbacks = callbacks;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    canvas.addEventListener("webglcontextlost", this.handleContextLost);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 1;

    const geometry = new THREE.PlaneGeometry(2, 2, 48, 32);
    const material = this.createMaterial(
      /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      /* glsl */ `
        varying vec2 vUv;
        uniform sampler2D uTexture;
        void main() {
          vec4 color = texture2D(uTexture, vUv);
          if (color.a < 0.01) discard;
          gl_FragColor = color;
        }
      `,
      1,
    );

    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);
    this.tick = this.tick.bind(this);
  }

  resize(cssWidth: number, cssHeight: number): void {
    if (this.disposed) return;
    this.width = Math.max(1, cssWidth);
    this.height = Math.max(1, cssHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.width, this.height, false);
    this.mesh.material.uniforms.uResolution.value.set(this.width, this.height);
  }

  private createMaterial(
    vertexShader: string,
    fragmentShader: string,
    progress: number,
    glowColor = "#4338CA",
  ): THREE.ShaderMaterial {
    const [r, g, b] = hexToRgb(glowColor);
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      premultipliedAlpha: false,
      uniforms: {
        uTexture: { value: this.texture },
        uProgress: { value: progress },
        uSeed: { value: Math.random() * 100 },
        uTime: { value: 0 },
        uGlowColor: { value: new THREE.Vector3(r, g, b) },
        uResolution: {
          value: new THREE.Vector2(this.width, this.height),
        },
      },
      vertexShader,
      fragmentShader,
    });
  }

  /**
   * Rasterize and commit a new texture. Returns false when a newer line
   * (or a dispose) superseded this paint while it was in flight — in that
   * case nothing is touched, so a stale paint can never dispose or
   * replace the texture the mesh is currently sampling (흰 박스 방지).
   * The previous texture is disposed only after the new one is bound.
   */
  private async paintTexture(
    text: string,
    glowColor: string,
    isCurrent: () => boolean,
  ): Promise<boolean> {
    await ensureLyricsFont(500);
    if (this.disposed || !isCurrent()) return false;

    const { canvas } = renderLyricsTexture(
      text,
      this.width,
      this.height,
      glowColor,
    );
    if (this.disposed || !isCurrent()) return false;

    const nextTexture = new THREE.CanvasTexture(canvas);
    nextTexture.colorSpace = THREE.SRGBColorSpace;
    nextTexture.needsUpdate = true;
    nextTexture.generateMipmaps = false;
    nextTexture.minFilter = THREE.LinearFilter;
    nextTexture.magFilter = THREE.LinearFilter;

    const prevTexture = this.texture;
    this.texture = nextTexture;
    this.mesh.material.uniforms.uTexture.value = nextTexture;
    if (prevTexture && prevTexture !== nextTexture) {
      prevTexture.dispose();
    }
    return true;
  }

  async setLine(text: string, glowColor: string): Promise<void> {
    if (this.disposed || !text) return;

    const generation = ++this.generation;

    try {
      const painted = await this.paintTexture(
        text,
        glowColor,
        () => generation === this.generation,
      );
      if (!painted || this.disposed) return;

      this.failureReported = false;
      const effect = pickRandomEffect(this.lastEffectId);
      this.applyEffect(effect, glowColor);
      this.lastEffectId = effect.id;

      const preview = text.length > 48 ? `${text.slice(0, 48)}…` : text;
      console.log(
        `[Gasamari] lyrics effect: ${effect.id} (${effect.duration.toFixed(2)}s) — "${preview}"`,
      );

      this.mesh.material.uniforms.uTexture.value = this.texture;
      this.mesh.material.uniforms.uProgress.value = 0;
      this.mesh.material.uniforms.uSeed.value = Math.random() * 100;
      this.mesh.material.uniforms.uTime.value = 0;

      this.duration = effect.duration;
      this.startMs = performance.now();

      // Restart the loop so a mid-flight tick can't keep an old timeline.
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = 0;
      }
      this.rafId = requestAnimationFrame(this.tick);
    } catch (error) {
      this.callbacks.onError?.(error);
    }
  }

  /** Re-rasterize text after resize without restarting the entrance effect. */
  async relayout(text: string, glowColor: string): Promise<void> {
    if (this.disposed || !text) return;
    const generation = this.generation;

    try {
      const painted = await this.paintTexture(
        text,
        glowColor,
        () => generation === this.generation,
      );
      if (!painted || this.disposed) return;

      const [r, g, b] = hexToRgb(glowColor);
      this.mesh.material.uniforms.uGlowColor.value.set(r, g, b);
      this.mesh.material.uniforms.uProgress.value = 1;
      this.renderer.render(this.scene, this.camera);
      this.reportIfWhiteBox();
    } catch (error) {
      this.callbacks.onError?.(error);
    }
  }

  private applyEffect(effect: LyricsEffect, glowColor: string): void {
    const prev = this.mesh.material;
    const next = this.createMaterial(
      effect.vertexShader,
      effect.fragmentShader,
      0,
      glowColor,
    );
    next.uniforms.uTexture.value = this.texture;
    this.mesh.material = next;
    prev.dispose();
  }

  private tick(now: number): void {
    if (this.disposed) return;

    const elapsed = (now - this.startMs) / 1000;
    const progress = Math.min(1, elapsed / this.duration);
    const material = this.mesh.material;
    material.uniforms.uProgress.value = progress;
    material.uniforms.uTime.value = elapsed;

    this.renderer.render(this.scene, this.camera);

    if (progress < 1) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      this.rafId = 0;
      this.renderer.render(this.scene, this.camera);
      this.reportIfWhiteBox();
    }
  }

  /**
   * 앱 WebView에서 텍스처 알파가 통째로 깨지면 가사 대신 불투명한 흰
   * 박스가 그려지는 경우가 있다. 완성 프레임의 격자를 샘플링해 그런
   * 프레임이면 DOM 폴백으로 넘긴다 (정상 가사는 대부분이 투명하다).
   */
  private reportIfWhiteBox(): void {
    if (this.disposed || this.failureReported) return;

    const gl = this.renderer.getContext();
    if (gl.isContextLost()) return;

    const { x: width, y: height } = this.renderer.getDrawingBufferSize(
      new THREE.Vector2(),
    );
    if (width < 2 || height < 2) return;

    const cols = 8;
    const rows = 5;
    const pixel = new Uint8Array(4);
    let white = 0;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = Math.floor(((col + 0.5) / cols) * width);
        const y = Math.floor(((row + 0.5) / rows) * height);
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        if (
          (pixel[0] ?? 0) > 250 &&
          (pixel[1] ?? 0) > 250 &&
          (pixel[2] ?? 0) > 250 &&
          (pixel[3] ?? 0) > 250
        ) {
          white += 1;
        }
      }
    }

    if (white / (cols * rows) >= 0.9) {
      this.failureReported = true;
      this.callbacks.onError?.(
        new Error("WebGL lyrics rendered as a white box"),
      );
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer.domElement.removeEventListener(
      "webglcontextlost",
      this.handleContextLost,
    );
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.texture?.dispose();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.renderer.dispose();
  }
}

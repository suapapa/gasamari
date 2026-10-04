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
  private callbacks: LyricsEngineCallbacks;

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

  private async paintTexture(text: string, glowColor: string): Promise<void> {
    await ensureLyricsFont(500);
    if (this.disposed) return;

    const { canvas } = renderLyricsTexture(
      text,
      this.width,
      this.height,
      glowColor,
    );

    if (this.texture) {
      this.texture.dispose();
    }

    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.needsUpdate = true;
    this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.mesh.material.uniforms.uTexture.value = this.texture;
  }

  async setLine(text: string, glowColor: string): Promise<void> {
    if (this.disposed || !text) return;

    const generation = ++this.generation;

    try {
      await this.paintTexture(text, glowColor);
      if (this.disposed || generation !== this.generation) return;

      const effect = pickRandomEffect(this.lastEffectId);
      this.applyEffect(effect, glowColor);
      this.lastEffectId = effect.id;

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
      await this.paintTexture(text, glowColor);
      if (this.disposed || generation !== this.generation) return;

      const [r, g, b] = hexToRgb(glowColor);
      this.mesh.material.uniforms.uGlowColor.value.set(r, g, b);
      this.mesh.material.uniforms.uProgress.value = 1;
      this.renderer.render(this.scene, this.camera);
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
    }
  }

  dispose(): void {
    this.disposed = true;
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

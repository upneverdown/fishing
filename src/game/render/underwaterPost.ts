import * as THREE from 'three'

export interface UnderwaterPostParams {
  time: number
  depth: number
  oxygen: number
  exposure: number
  fisheye: number
  sunUv: THREE.Vector2
  sunVisible: number
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D tDiffuse;
  uniform float uTime;
  uniform float uDepth;
  uniform float uOxygen;
  uniform float uExposure;
  uniform float uFisheye;
  uniform float uAspect;
  uniform float uSunVisible;
  uniform vec2 uSun;

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float caustic(vec2 p, float t) {
    vec2 q = p * 3.4;
    float a = sin(q.x + sin(q.y * 1.7 + t * 0.9) * 1.2 + t * 0.35);
    float b = sin(q.y * 1.35 - sin(q.x * 1.5 - t * 0.7) * 1.1 - t * 0.27);
    float c = sin((q.x + q.y) * 0.9 + t * 0.5);
    return pow(max(0.0, (a + b + c) / 3.0), 3.2);
  }

  vec3 aces(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }

  void main() {
    vec2 centered = vUv * 2.0 - 1.0;
    centered.x *= uAspect;
    float r2 = dot(centered, centered);
    float radius = length(centered);

    // Barrel distortion / fisheye push, strongest at the rim.
    float warp = 1.0 + uFisheye * (r2 * 0.42 + r2 * r2 * 0.34);
    vec2 distorted = centered * warp;
    distorted.x /= uAspect;
    vec2 warpedUv = distorted * 0.5 + 0.5;

    // The barrel warp pushes the rim outside the frame; fall back to the
    // undistorted sample there so the border does not smear.
    vec2 over = max(max(-warpedUv, warpedUv - 1.0), 0.0);
    float outAmt = smoothstep(0.0, 0.05, max(over.x, over.y));
    vec2 uv = mix(warpedUv, vUv, outAmt);

    // Gentle chromatic split towards the edges.
    vec2 fringe = normalize(centered + 0.0001) * r2 * 0.0028;
    vec3 color;
    color.r = texture2D(tDiffuse, clamp(uv + fringe, 0.001, 0.999)).r;
    color.g = texture2D(tDiffuse, clamp(uv, 0.001, 0.999)).g;
    color.b = texture2D(tDiffuse, clamp(uv - fringe, 0.001, 0.999)).b;

    float luminance = dot(color, vec3(0.299, 0.587, 0.114));

    // Screen-space god rays: bright surface light bleeding towards the sun.
    if (uSunVisible > 0.001) {
      vec2 dir = uSun - uv;
      float dist = length(dir);
      vec2 stepv = dist > 0.0001 ? dir / dist : vec2(0.0);
      stepv *= dist / 12.0;
      vec2 p = uv;
      float ray = 0.0;
      float jitter = hash(gl_FragCoord.xy + uTime * 0.13);
      for (int i = 0; i < 12; i++) {
        p += stepv * (0.82 + 0.36 * jitter);
        float l = dot(texture2D(tDiffuse, clamp(p, 0.0, 1.0)).rgb, vec3(0.299, 0.587, 0.114));
        ray += max(0.0, l - 0.48);
      }
      ray /= 12.0;
      float falloff = smoothstep(0.0, 0.22, dist) * (1.0 - smoothstep(0.55, 1.15, dist));
      color += ray * falloff * uSunVisible * vec3(0.55, 0.9, 0.86) * 1.35;
      luminance = dot(color, vec3(0.299, 0.587, 0.114));
    }

    // Caustic light dancing on everything the camera sees.
    float ca = caustic(vUv * vec2(uAspect, 1.0), uTime);
    color += vec3(0.32, 0.72, 0.68) * ca * (0.12 + luminance * 0.5) * (0.35 + uDepth * 0.8);

    // Water absorption: deeper = darker and bluer, with a soft top glow.
    vec3 deepTint = vec3(0.035, 0.18, 0.22);
    color = mix(color, color * deepTint * 6.0 + deepTint * 0.22, uDepth * 0.42);
    color += vec3(0.1, 0.38, 0.4) * smoothstep(0.45, 1.0, vUv.y) * uDepth * 0.22;

    // Vignette and grain.
    float vignette = 1.0 - smoothstep(0.48, 1.45, radius);
    color *= mix(0.55, 1.0, vignette);
    color = mix(color, color * vec3(0.34, 0.6, 0.64) + vec3(0.004, 0.015, 0.022), smoothstep(0.7, 1.25, radius) * 0.8);
    float grain = hash(vUv * vec2(1920.0, 1080.0) + uTime * 37.0) - 0.5;
    color += grain * 0.014;

    // Low oxygen warning: pulsing red edge.
    float panic = 1.0 - uOxygen;
    if (panic > 0.02) {
      float pulse = 0.72 + 0.28 * sin(uTime * 4.2);
      color += vec3(0.62, 0.08, 0.05) * smoothstep(0.3, 1.15, radius) * panic * panic * pulse * 1.15;
    }

    color = aces(color * uExposure);
    color = pow(color, vec3(1.0 / 2.2));

    // Slight teal grade and contrast.
    color = mix(vec3(dot(color, vec3(0.299, 0.587, 0.114))), color, 1.08);
    color = clamp(color, 0.0, 1.0);

    gl_FragColor = vec4(color, 1.0);
  }
`

export class UnderwaterPost {
  private target: THREE.WebGLRenderTarget
  private scene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private material: THREE.ShaderMaterial
  private size = new THREE.Vector2(1, 1)

  constructor() {
    this.target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
    })

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tDiffuse: { value: this.target.texture },
        uTime: { value: 0 },
        uDepth: { value: 0 },
        uOxygen: { value: 1 },
        uExposure: { value: 1 },
        uFisheye: { value: 0.12 },
        uAspect: { value: 1 },
        uSunVisible: { value: 0 },
        uSun: { value: new THREE.Vector2(0.5, 0.9) },
      },
      depthTest: false,
      depthWrite: false,
    })

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material)
    quad.frustumCulled = false
    this.scene.add(quad)
  }

  setSize(width: number, height: number) {
    const w = Math.max(1, Math.floor(width))
    const h = Math.max(1, Math.floor(height))
    if (w === this.size.x && h === this.size.y) return
    this.size.set(w, h)
    this.target.setSize(w, h)
    this.material.uniforms.uAspect.value = w / h
  }

  render(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    params: UnderwaterPostParams,
  ) {
    const u = this.material.uniforms
    u.uTime.value = params.time
    u.uDepth.value = params.depth
    u.uOxygen.value = params.oxygen
    u.uExposure.value = params.exposure
    u.uFisheye.value = params.fisheye
    u.uSunVisible.value = params.sunVisible
    ;(u.uSun.value as THREE.Vector2).copy(params.sunUv)

    renderer.setRenderTarget(this.target)
    renderer.render(scene, camera)
    renderer.setRenderTarget(null)
    renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.target.dispose()
    this.material.dispose()
    for (const child of this.scene.children) {
      if (child instanceof THREE.Mesh) child.geometry.dispose()
    }
  }
}

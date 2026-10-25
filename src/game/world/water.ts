import * as THREE from 'three'
import { MAX_WATER_DEPTH, WORLD_HALF, WORLD_SIZE, depthAt } from './worldMap'
import { SKY } from './sky'

const TAU = Math.PI * 2

interface Wave {
  dx: number
  dz: number
  length: number
  amplitude: number
  steepness: number
}

// Three Gerstner waves, deep-water dispersion (omega = sqrt(g * k)).
const WAVES: Wave[] = [
  { dx: 0.938, dz: 0.346, length: 24, amplitude: 0.2, steepness: 0.5 },
  { dx: -0.459, dz: 0.888, length: 11.5, amplitude: 0.1, steepness: 0.4 },
  { dx: 0.583, dz: -0.812, length: 5.6, amplitude: 0.046, steepness: 0.3 },
]

const waveGLSL = WAVES.map((wave) => {
  const k = TAU / wave.length
  const omega = Math.sqrt(9.81 * k)
  const q = wave.steepness / (k * wave.amplitude * WAVES.length)
  return `
  {
    const vec2 D = vec2(${wave.dx.toFixed(6)}, ${wave.dz.toFixed(6)});
    const float K = ${k.toFixed(6)};
    const float A = ${wave.amplitude.toFixed(6)};
    const float Q = ${q.toFixed(6)};
    const float W = ${omega.toFixed(6)};
    float AS = A * uWaveScale;
    float phase = K * dot(D, p) - W * uTime;
    float s = sin(phase);
    float c = cos(phase);
    disp.x += Q * AS * D.x * c;
    disp.z += Q * AS * D.y * c;
    disp.y += AS * s;

    float wa = K * AS;
    tx.x -= Q * wa * D.x * D.x * s;
    tx.y += wa * D.x * c;
    tx.z -= Q * wa * D.x * D.y * s;
    tz.x -= Q * wa * D.x * D.y * s;
    tz.y += wa * D.y * c;
    tz.z -= Q * wa * D.y * D.y * s;
  }`
}).join('\n')

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uWaveScale;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vCrest;

  void main() {
    vec4 base = modelMatrix * vec4(position, 1.0);
    vec2 p = base.xz;

    vec3 disp = vec3(0.0);
    vec3 tx = vec3(1.0, 0.0, 0.0);
    vec3 tz = vec3(0.0, 0.0, 1.0);
    ${waveGLSL}

    vec3 world = base.xyz + disp;
    vWorld = world;
    vCrest = disp.y;
    vNormal = normalize(cross(tz, tx));

    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  #include <common>

  uniform float uTime;
  uniform sampler2D uDepth;
  uniform sampler2D uSlopeA;
  uniform sampler2D uSlopeB;
  uniform float uMin;
  uniform float uSize;
  uniform float uTileA;
  uniform float uTileB;
  uniform float uTileC;
  uniform float uSlopeScaleA;
  uniform float uSlopeScaleB;
  uniform float uDetailA;
  uniform float uDetailB;
  uniform float uDetailC;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uSkyZenith;
  uniform vec3 uSkyHorizon;
  uniform vec3 uShallow;
  uniform vec3 uDeep;
  uniform vec3 uScatter;
  uniform vec3 uFoam;
  uniform vec3 uFogColor;
  uniform vec2 uFogRange;
  uniform vec4 uContacts[6];

  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vCrest;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 3; i++) {
      v += amp * vnoise(p);
      p *= 2.03;
      amp *= 0.5;
    }
    return v;
  }

  vec3 skyColor(vec3 dir) {
    float up = clamp(dir.y, 0.0, 1.0);
    vec3 col = mix(uSkyHorizon, uSkyZenith, pow(up, 0.55));
    float sunAmt = max(dot(dir, uSunDir), 0.0);
    col += uSunColor * pow(sunAmt, 14.0) * 0.16;
    col += uSunColor * pow(sunAmt, 700.0) * 3.6;
    return col;
  }

  void main() {
    vec2 depthUv = clamp((vWorld.xz - vec2(uMin)) / uSize, 0.0, 1.0);
    float depth = texture2D(uDepth, depthUv).r * ${MAX_WATER_DEPTH.toFixed(2)};
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float dist = distance(cameraPosition, vWorld);

    if (!gl_FrontFacing) {
      vec3 toSurface = normalize(vWorld - cameraPosition);
      float cosUp = clamp(toSurface.y, 0.0, 1.0);
      float window = smoothstep(0.55, 0.75, cosUp);
      float rim = smoothstep(0.5, 0.62, cosUp) * (1.0 - smoothstep(0.65, 0.8, cosUp));
      vec3 skyTint = mix(uSkyHorizon, uSkyZenith, 0.55);
      skyTint = mix(skyTint, uScatter, 0.22);
      float shimmer = 0.92 + 0.08 * sin(vWorld.x * 1.7 + uTime * 0.9) * sin(vWorld.z * 1.3 - uTime * 0.7);
      vec3 windowCol = skyTint * shimmer;
      vec3 col = mix(uDeep * 0.72 + uScatter * 0.04, windowCol, window);
      col += uScatter * rim * 0.35;
      float caustic = pow(0.5 + 0.5 * sin(vWorld.x * 2.3 + uTime * 1.3) * sin(vWorld.z * 2.7 - uTime * 1.1), 6.0);
      col += uScatter * caustic * window * 0.16;
      float fogFactorUnder = smoothstep(uFogRange.x, uFogRange.y, dist);
      col = mix(col, uFogColor, fogFactorUnder);
      float alphaUnder = mix(0.97, 0.6, window);
      gl_FragColor = vec4(col, alphaUnder);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      return;
    }

    vec2 p = vWorld.xz;
    vec2 flow = vec2(uTime * 0.013, uTime * 0.0075);
    vec2 uvA = p / uTileA + flow;
    mat2 rotB = mat2(0.79, -0.613, 0.613, 0.79);
    vec2 uvB = (rotB * p) / uTileB - flow * 2.3;
    uvB += 0.008 * vec2(sin(p.y * 0.21 + uTime * 0.4), cos(p.x * 0.19 - uTime * 0.33));

    float farFade = 1.0 - smoothstep(40.0, 110.0, distance(cameraPosition, vWorld));
    vec2 slopeA = (texture2D(uSlopeA, uvA).rg - 0.5) * 2.0 * uSlopeScaleA / uTileA * uDetailA;
    vec2 slopeB = (texture2D(uSlopeB, uvB).rg - 0.5) * 2.0 * uSlopeScaleB / uTileB * uDetailB * farFade;

    mat2 rotC = mat2(0.878, -0.479, 0.479, 0.878);
    vec2 uvC = (rotC * p) / uTileC + flow * 3.4;
    vec2 slopeC = (texture2D(uSlopeA, uvC).rg - 0.5) * 2.0 * uSlopeScaleA / uTileC * uDetailC * farFade;

    vec3 gn = normalize(vNormal);
    vec2 gSlope = -gn.xz / max(gn.y, 0.35);
    vec2 slope = gSlope + slopeA + slopeB + slopeC;
    vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));

    float ndv = clamp(dot(n, viewDir), 0.001, 1.0);

    vec3 R = reflect(-viewDir, n);
    R = normalize(vec3(R.x, max(R.y, 0.015), R.z));
    vec3 reflection = skyColor(R) * 0.88;
    float fresnel = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
    fresnel *= 0.7;

    float depthT = 1.0 - exp(-depth * 0.34);
    vec3 body = mix(uShallow, uDeep, depthT);
    body += uScatter * smoothstep(0.02, 0.3, vCrest) * 0.22;
    body += uScatter * smoothstep(0.0, 1.4, depth) * 0.06;

    vec3 halfV = normalize(uSunDir + viewDir);
    vec2 microSlope = (texture2D(uSlopeB, uvB * 4.3 + vec2(0.17, 0.31)).rg - 0.5)
      * 2.0 * uSlopeScaleB / (uTileB / 4.3) * 0.035;
    vec3 nSpec = normalize(vec3(
      -slope.x - microSlope.x * 0.6,
      1.0,
      -slope.y - microSlope.y * 0.6
    ));
    float ndh = max(dot(nSpec, halfV), 0.0);
    float rough = mix(0.14, 0.26, smoothstep(0.0, 58.0, dist));
    rough += (1.0 - smoothstep(0.0, 1.2, depth)) * 0.05;
    float a = max(0.0025, rough * rough);
    float a2 = a * a;
    float denom = ndh * ndh * (a2 - 1.0) + 1.0;
    float D = a2 / (PI * denom * denom);
    float Fs = 0.02 + 0.98 * pow(1.0 - clamp(dot(halfV, viewDir), 0.0, 1.0), 5.0);
    float sunVisible = smoothstep(-0.06, 0.18, dot(nSpec, uSunDir));
    float glint = min(D * Fs * 0.018, 2.8) * sunVisible;
    float sheen = pow(max(dot(n, halfV), 0.0), 24.0) * 0.022 * sunVisible;

    vec3 color = mix(body, reflection, fresnel);
    color += uSunColor * glint;
    color += uSunColor * sheen;
    color += uSunColor * pow(ndh, 72.0) * 0.03;

    float foamNoise = fbm(p * 1.7 + vec2(uTime * 0.07, -uTime * 0.055));
    float foamNoise2 = fbm(p * 5.4 - vec2(uTime * 0.15, uTime * 0.11));

    float shoreBand = 1.0 - smoothstep(0.03, 0.5, depth);
    float shore = smoothstep(0.44, 0.76, foamNoise * 0.78 + foamNoise2 * 0.42) * shoreBand;
    shore += (1.0 - smoothstep(0.0, 0.07, depth)) * 0.6;

    float crest = smoothstep(0.28, 0.35, vCrest);
    float caps = crest * smoothstep(0.78, 0.93, foamNoise2) * 0.1 * farFade;

    float contact = 0.0;
    for (int i = 0; i < 6; i++) {
      vec4 c = uContacts[i];
      if (c.w <= 0.001) continue;
      float d = distance(p, c.xy);
      float ring = smoothstep(c.z * 0.18, c.z * 0.5, d)
        * (1.0 - smoothstep(c.z * 0.62, c.z, d));
      contact += ring * c.w * smoothstep(0.42, 0.68, foamNoise2 + 0.24);
    }

    float foam = clamp(shore + caps + contact, 0.0, 1.0);
    vec3 foamColor = uFoam * (0.9 + 0.1 * foamNoise2);
    color = mix(color, foamColor, foam * 0.92);

    float fogFactor = smoothstep(uFogRange.x, uFogRange.y, dist);
    color = mix(color, uFogColor, fogFactor);

    float alpha = mix(0.46, 0.93, smoothstep(0.0, 4.2, depth));
    alpha = mix(alpha, 1.0, fresnel * 0.6);
    alpha = mix(alpha, 0.98, foam);

    gl_FragColor = vec4(color, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const SLOPE_RES = 256
const SLOPE_RANGE = 20

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function createSlopeTexture(seed: number) {
  const rand = mulberry32(seed * 9176 + 13)
  const components: { fx: number; fz: number; amp: number; phase: number }[] = []
  for (let i = 0; i < 16; i++) {
    const angle = rand() * TAU
    const magnitude = 2 + Math.floor(rand() * 7)
    const fx = Math.round(Math.cos(angle) * magnitude)
    const fz = Math.round(Math.sin(angle) * magnitude)
    if (fx === 0 && fz === 0) continue
    const amp = (0.85 / magnitude) * (0.55 + rand() * 0.9)
    components.push({ fx, fz, amp, phase: rand() * TAU })
  }

  const dxs = new Float32Array(SLOPE_RES * SLOPE_RES)
  const dzs = new Float32Array(SLOPE_RES * SLOPE_RES)

  for (let j = 0; j < SLOPE_RES; j++) {
    for (let i = 0; i < SLOPE_RES; i++) {
      const u = (i + 0.5) / SLOPE_RES
      const v = (j + 0.5) / SLOPE_RES
      let dx = 0
      let dz = 0
      for (const c of components) {
        const phase = TAU * (c.fx * u + c.fz * v) + c.phase
        const wave = c.amp * TAU * Math.cos(phase)
        dx += wave * c.fx
        dz += wave * c.fz
      }
      dxs[j * SLOPE_RES + i] = dx
      dzs[j * SLOPE_RES + i] = dz
    }
  }

  const data = new Uint8Array(SLOPE_RES * SLOPE_RES * 4)
  const encode = 0.5 / SLOPE_RANGE
  for (let i = 0; i < SLOPE_RES * SLOPE_RES; i++) {
    data[i * 4] = Math.round(THREE.MathUtils.clamp(0.5 + dxs[i] * encode, 0, 1) * 255)
    data[i * 4 + 1] = Math.round(THREE.MathUtils.clamp(0.5 + dzs[i] * encode, 0, 1) * 255)
    data[i * 4 + 2] = 255
    data[i * 4 + 3] = 255
  }

  const texture = new THREE.DataTexture(data, SLOPE_RES, SLOPE_RES, THREE.RGBAFormat)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return { texture, maxSlope: SLOPE_RANGE }
}

const CONTACT_COUNT = 6

export class Water {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  waveScale = 1
  private depthTexture: THREE.DataTexture
  private contacts: THREE.Vector4[]
  private sunDir = new THREE.Vector3(0.5, 0.76, 0.33).normalize()

  constructor() {
    const depthRes = 320
    const depthData = new Uint8Array(depthRes * depthRes)
    for (let j = 0; j < depthRes; j++) {
      for (let i = 0; i < depthRes; i++) {
        const x = -WORLD_HALF + (i + 0.5) * (WORLD_SIZE / depthRes)
        const z = -WORLD_HALF + (j + 0.5) * (WORLD_SIZE / depthRes)
        const depth = Math.min(depthAt(x, z), MAX_WATER_DEPTH)
        depthData[j * depthRes + i] = Math.round((depth / MAX_WATER_DEPTH) * 255)
      }
    }

    const texture = new THREE.DataTexture(
      depthData,
      depthRes,
      depthRes,
      THREE.RedFormat,
      THREE.UnsignedByteType,
    )
    texture.unpackAlignment = 1
    texture.magFilter = THREE.LinearFilter
    texture.minFilter = THREE.LinearFilter
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.needsUpdate = true

    const slopeA = createSlopeTexture(0)
    const slopeB = createSlopeTexture(2.4)

    const geometry = new THREE.PlaneGeometry(400, 400, 220, 220)
    geometry.rotateX(-Math.PI / 2)

    this.contacts = Array.from({ length: CONTACT_COUNT }, () => new THREE.Vector4(0, 0, 0, 0))

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uWaveScale: { value: 1 },
        uDepth: { value: texture },
        uSlopeA: { value: slopeA.texture },
        uSlopeB: { value: slopeB.texture },
        uMin: { value: -WORLD_HALF },
        uSize: { value: WORLD_SIZE },
        uTileA: { value: 19 },
        uTileB: { value: 4.6 },
        uTileC: { value: 3.1 },
        uSlopeScaleA: { value: slopeA.maxSlope },
        uSlopeScaleB: { value: slopeB.maxSlope },
        uDetailA: { value: 0.1 },
        uDetailB: { value: 0.06 },
        uDetailC: { value: 0.024 },
        uSunDir: { value: this.sunDir },
        uSunColor: { value: new THREE.Color(SKY.sun) },
        uSkyZenith: { value: new THREE.Color('#5ba4b7') },
        uSkyHorizon: { value: new THREE.Color('#b3d2cb') },
        uShallow: { value: new THREE.Color('#4bb9a8') },
        uDeep: { value: new THREE.Color('#072f3c') },
        uScatter: { value: new THREE.Color('#5fe0c6') },
        uFoam: { value: new THREE.Color('#f6fffb') },
        uFogColor: { value: new THREE.Color(SKY.fog) },
        uFogRange: { value: new THREE.Vector2(78, 205) },
        uContacts: { value: this.contacts },
      },
    })

    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.position.y = 0
    this.mesh.renderOrder = 1
    this.mesh.frustumCulled = false
    this.depthTexture = texture
  }

  setTime(time: number) {
    this.mesh.material.uniforms.uTime.value = time
  }

  setSun(direction: THREE.Vector3, color: THREE.Color) {
    this.sunDir.copy(direction).normalize()
    ;(this.mesh.material.uniforms.uSunDir.value as THREE.Vector3).copy(this.sunDir)
    ;(this.mesh.material.uniforms.uSunColor.value as THREE.Color).copy(color)
  }

  setFogColor(color: THREE.Color) {
    ;(this.mesh.material.uniforms.uFogColor.value as THREE.Color).copy(color)
  }

  setFogRange(near: number, far: number) {
    ;(this.mesh.material.uniforms.uFogRange.value as THREE.Vector2).set(near, far)
  }

  setContact(index: number, x: number, z: number, radius: number, strength: number) {
    if (index < 0 || index >= CONTACT_COUNT) return
    this.contacts[index].set(x, z, radius, strength)
  }

  setWaveScale(scale: number) {
    this.waveScale = scale
    ;(this.mesh.material.uniforms.uWaveScale.value as number) = scale
  }

  setSeasonWater(colors: {
    shallow: string
    deep: string
    scatter: string
    skyZenith: string
    skyHorizon: string
  }) {
    const u = this.mesh.material.uniforms
    ;(u.uShallow.value as THREE.Color).set(colors.shallow)
    ;(u.uDeep.value as THREE.Color).set(colors.deep)
    ;(u.uScatter.value as THREE.Color).set(colors.scatter)
    ;(u.uSkyZenith.value as THREE.Color).set(colors.skyZenith)
    ;(u.uSkyHorizon.value as THREE.Color).set(colors.skyHorizon)
  }

  waveHeight(x: number, z: number, time: number) {
    let height = 0
    for (const wave of WAVES) {
      const k = TAU / wave.length
      const omega = Math.sqrt(9.81 * k)
      height +=
        wave.amplitude *
        this.waveScale *
        Math.sin(k * (wave.dx * x + wave.dz * z) - omega * time)
    }
    return height
  }
}

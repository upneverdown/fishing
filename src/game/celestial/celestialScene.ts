import * as THREE from 'three'
import { mulberry32 } from '@/game/utils/math'
import { bannerTexture, glowSprite, haloRing, runeRing, softSprite } from './celestialTextures'

const TAU = Math.PI * 2

export const CELESTIAL_SPAWN = { x: 0, z: 0 }
export const CELESTIAL_RADIUS = 200

const METEOR_COUNT = 3
const METEOR_TAIL = 14
const TRAIL_PER_CRANE = 10
const MOTE_COUNT = 150
const MOTE_REACH = 64
const MOTE_TOP = 27

const PAL = {
  seaShadow: '#c07f52',
  seaIvory: '#fff4dd',
  gold: '#ffbe63',
  cool: '#bfe4ee',
  haze: '#ffcf94',
  zenith: '#ffe9b8',
  horizon: '#ffb45a',
  glow: '#fff3d2',
  auroraA: '#8fe8cf',
  auroraB: '#ffb2d8',
}

const SUN_DIR = new THREE.Vector3(0.38, 0.52, -0.76).normalize()

const ARENA = { x: -92, z: -64, radius: 26 }

const ISLAND_SLOTS = [
  { x: -58, z: -104, r: 9, y: 9, seed: 11 },
  { x: 96, z: 62, r: 11, y: 13, seed: 23 },
  { x: 68, z: -86, r: 10, y: 16.5, seed: 37 },
  { x: -34, z: 128, r: 12, y: 11, seed: 41 },
  { x: 140, z: -30, r: 7.5, y: 6.5, seed: 59 },
  { x: 26, z: -42, r: 6.5, y: 8, seed: 73 },
]

const CRANE_SLOTS = [
  { cx: 10, cz: -20, rx: 70, rz: 56, height: 17, speed: 0.055 },
  { cx: -30, cz: 30, rx: 96, rz: 78, height: 25, speed: -0.042 },
  { cx: 0, cz: 0, rx: 132, rz: 112, height: 32, speed: 0.031 },
]

interface CloudWave {
  dx: number
  dz: number
  length: number
  amplitude: number
  omega: number
  phase: number
}

// surfaceAt() 与云海顶点位移共用同一组层结，船只才浮在视觉波峰上
const CLOUD_WAVES: CloudWave[] = [
  { dx: 0.928, dz: 0.372, length: 54, amplitude: 0.28, omega: 0.22, phase: 0 },
  { dx: -0.461, dz: 0.887, length: 32, amplitude: 0.17, omega: 0.29, phase: 1.9 },
  { dx: 0.699, dz: -0.715, length: 17.5, amplitude: 0.12, omega: 0.38, phase: 4.2 },
]

const waveGLSL = CLOUD_WAVES.map((wave) => {
  const k = TAU / wave.length
  return `
  {
    const vec2 D = vec2(${wave.dx.toFixed(6)}, ${wave.dz.toFixed(6)});
    const float K = ${k.toFixed(6)};
    const float A = ${wave.amplitude.toFixed(6)};
    const float PH = ${wave.phase.toFixed(6)};
    const float W = ${wave.omega.toFixed(6)};
    float ph = K * dot(D, p) + PH - W * uTime;
    disp += A * sin(ph);
    slope += A * K * D * cos(ph);
  }`
}).join('\n')

const noiseGLSL = /* glsl */ `
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
      p *= 2.04;
      amp *= 0.5;
    }
    return v;
  }
`

const seaVertexShader = /* glsl */ `
  uniform float uTime;

  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vCrest;

  void main() {
    vec4 base = modelMatrix * vec4(position, 1.0);
    vec2 p = base.xz;
    float disp = 0.0;
    vec2 slope = vec2(0.0);
    ${waveGLSL}

    vec3 world = base.xyz + vec3(0.0, disp, 0.0);
    vWorld = world;
    vCrest = disp;
    vNormal = normalize(vec3(-slope.x, 1.0, -slope.y));
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`

const seaFragmentShader = /* glsl */ `
  #include <common>

  uniform float uTime;
  uniform vec3 uSunDir;
  uniform vec3 uShadow;
  uniform vec3 uIvory;
  uniform vec3 uGold;
  uniform vec3 uCool;
  uniform vec3 uHaze;
  uniform vec2 uHazeRange;

  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vCrest;

  ${noiseGLSL}

  void main() {
    vec2 p = vWorld.xz;
    vec2 flow = vec2(uTime * 0.011, uTime * 0.0074);
    float f = fbm(p * 0.085 + flow);
    float g = fbm(p * 0.235 - flow * 2.6 + vec2(f * 1.3, f * 0.7));

    float body = smoothstep(0.12, 0.92, f * 0.78 + g * 0.42);
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorld);
    // 云团要靠明暗才有体积，只堆高光会糊成一张白纸
    float lambert = 0.6 + 0.56 * max(dot(n, uSunDir), 0.0);

    vec3 col = mix(uShadow, uIvory, body) * lambert;
    col += uGold * pow(max(g - 0.34, 0.0), 1.15) * 2.1;
    col += uCool * (1.0 - body) * 0.14;
    col = mix(col, col + uGold * 0.3, smoothstep(0.14, 0.58, vCrest));

    float ndv = clamp(dot(n, viewDir), 0.0, 1.0);
    col += uGold * pow(1.0 - ndv, 3.0) * (0.32 + 0.42 * body);

    vec3 halfV = normalize(uSunDir + viewDir);
    col += uGold * pow(max(dot(n, halfV), 0.0), 34.0) * 0.2 * body;

    float dist = distance(cameraPosition, vWorld);
    col = mix(col, uHaze, smoothstep(uHazeRange.x, uHazeRange.y, dist));

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const domeVertexShader = /* glsl */ `
  varying vec3 vDir;

  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const domeFragmentShader = /* glsl */ `
  #include <common>

  uniform float uTime;
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uGlow;
  uniform vec3 uGold;
  uniform vec3 uAuroraA;
  uniform vec3 uAuroraB;
  uniform vec3 uSunDir;

  varying vec3 vDir;

  ${noiseGLSL}

  void main() {
    vec3 dir = normalize(vDir);
    float up = clamp(dir.y, 0.0, 1.0);
    vec3 col = mix(uHorizon, uZenith, pow(up, 0.8));
    col = mix(col, uGlow, (1.0 - smoothstep(0.0, 0.05, dir.y)) * 0.3);

    float sunAmt = max(dot(dir, uSunDir), 0.0);
    col += uGold * pow(sunAmt, 7.0) * 0.4;
    col += uGold * pow(sunAmt, 220.0) * 2.2;

    vec2 cuv = dir.xz / max(dir.y + 0.24, 0.03);
    float neb = fbm(cuv * 0.42 + vec2(uTime * 0.0038, -uTime * 0.0021));
    col += uGold * smoothstep(0.42, 0.86, neb) * smoothstep(0.02, 0.34, dir.y) * 0.2;

    float band = fbm(vec2(dir.x * 1.25 + uTime * 0.014, dir.z * 1.1 - uTime * 0.008));
    float mask = smoothstep(0.16, 0.42, dir.y) * (1.0 - smoothstep(0.52, 0.94, dir.y));
    col += mix(uAuroraA, uAuroraB, band) * pow(band, 1.7) * mask * 0.5;

    vec2 sv = floor(dir.xz * 250.0 + dir.y * 86.0);
    float star = step(0.9965, hash21(sv));
    float twinkle = 0.5 + 0.5 * sin(uTime * 2.4 + hash21(sv + 7.3) * 40.0);
    col += vec3(1.0, 0.97, 0.88) * star * twinkle * smoothstep(0.2, 0.62, dir.y) * 0.75;

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const puffVertexShader = /* glsl */ `
  attribute float aSeed;

  uniform float uTime;

  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vSeed;
  varying float vUp;

  void main() {
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    world.y += sin(uTime * 0.34 + aSeed * 6.2831) * 0.22;
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * (mat3(instanceMatrix) * normal));
    vSeed = aSeed;
    vUp = position.y;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const puffFragmentShader = /* glsl */ `
  #include <common>

  uniform vec3 uSunDir;
  uniform vec3 uWarm;
  uniform vec3 uCool;
  uniform vec3 uGold;

  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vSeed;
  varying float vUp;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float ndv = clamp(dot(n, viewDir), 0.0, 1.0);
    float lam = 0.58 + 0.42 * max(dot(n, uSunDir), 0.0);
    float top = smoothstep(-0.45, 0.7, vUp);

    vec3 col = mix(uCool, uWarm, clamp(vSeed * 0.7 + 0.25, 0.0, 1.0));
    col *= lam;
    col = mix(col, col * 0.88 + uCool * 0.12, 1.0 - top);
    col += uGold * pow(1.0 - ndv, 2.2) * 0.45;
    col += uGold * top * 0.18;

    float alpha = mix(0.62, 0.04, pow(1.0 - ndv, 1.4)) * (0.52 + 0.48 * lam);
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const columnVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const columnFragmentShader = /* glsl */ `
  #include <common>

  uniform float uTime;
  uniform float uPulse;
  uniform vec3 uColor;
  uniform vec3 uAccent;

  varying vec2 vUv;
  varying vec3 vWorld;
  varying vec3 vNormal;

  void main() {
    float h = 1.0 - vUv.y;
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float shell = pow(1.0 - clamp(abs(dot(normalize(vNormal), viewDir)), 0.0, 1.0), 1.6);
    float shimmer = 0.62 + 0.38 * sin(vUv.y * 26.0 - uTime * 1.5 + vUv.x * 18.0);
    float alpha = pow(h, 1.5) * shell * shimmer * (0.18 + 0.16 * uPulse);
    vec3 col = mix(uColor, uAccent, pow(h, 2.2));
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const pointVertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec4 aColor;

  uniform float uScale;

  varying vec4 vColor;

  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / max(-mv.z, 0.08);
    gl_Position = projectionMatrix * mv;
  }
`

const pointFragmentShader = /* glsl */ `
  #include <common>

  uniform sampler2D uMap;

  varying vec4 vColor;

  void main() {
    vec4 sprite = texture2D(uMap, gl_PointCoord);
    float alpha = vColor.a * sprite.a;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(vColor.rgb * sprite.rgb, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

type Disposable = { dispose: () => void }

function pointScale() {
  return Math.min(window.innerHeight, 1600) * Math.min(window.devicePixelRatio || 1, 2) * 0.5
}

/** 复用的加法粒子层：每点独立尺寸与透明度，写入零分配 */
class ParticleLayer {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>
  readonly count: number
  readonly pos: Float32Array
  readonly col: Float32Array
  readonly siz: Float32Array

  constructor(count: number, map: THREE.Texture) {
    this.count = count
    this.pos = new Float32Array(count * 3)
    this.col = new Float32Array(count * 4)
    this.siz = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      this.pos[i * 3 + 1] = -9999
      this.siz[i] = 1
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3))
    geometry.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.siz, 1))

    const material = new THREE.ShaderMaterial({
      vertexShader: pointVertexShader,
      fragmentShader: pointFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uMap: { value: map },
        uScale: { value: pointScale() },
      },
    })

    this.points = new THREE.Points(geometry, material)
    this.points.frustumCulled = false
    this.points.renderOrder = 5
  }

  write(
    i: number,
    x: number,
    y: number,
    z: number,
    size: number,
    r: number,
    g: number,
    b: number,
    a: number,
  ) {
    this.pos[i * 3] = x
    this.pos[i * 3 + 1] = y
    this.pos[i * 3 + 2] = z
    this.col[i * 4] = r
    this.col[i * 4 + 1] = g
    this.col[i * 4 + 2] = b
    this.col[i * 4 + 3] = a
    this.siz[i] = size
  }

  hide(i: number) {
    this.pos[i * 3 + 1] = -9999
    this.col[i * 4 + 3] = 0
  }

  flush() {
    const geometry = this.points.geometry
    ;(geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    ;(geometry.getAttribute('aColor') as THREE.BufferAttribute).needsUpdate = true
    ;(geometry.getAttribute('aSize') as THREE.BufferAttribute).needsUpdate = true
  }

  dispose() {
    this.points.geometry.dispose()
    this.points.material.dispose()
    this.points.removeFromParent()
  }
}

interface CloudCluster {
  x: number
  y: number
  z: number
  spin: number
  bobAmp: number
  bobSpeed: number
  phase: number
  drift: number
}

interface Puff {
  cluster: number
  ox: number
  oy: number
  oz: number
  sx: number
  sy: number
  sz: number
  rx: number
  rz: number
}

interface Island {
  group: THREE.Group
  baseY: number
  bobAmp: number
  bobSpeed: number
  phase: number
  spin: number
}

interface Crane {
  node: THREE.Group
  right: THREE.Mesh
  left: THREE.Mesh
  cx: number
  cz: number
  rx: number
  rz: number
  height: number
  speed: number
  phase: number
  flapSpeed: number
  wobble: number
}

interface Pulse {
  node: THREE.Object3D
  base: number
  amp: number
  speed: number
  phase: number
  spin: number
}

function makeIslandGeometry(seed: number, radius: number) {
  const rand = mulberry32(seed * 131 + 7)
  const geometry = new THREE.IcosahedronGeometry(radius, 1)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const vector = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const freq = 1.5 + rand() * 1.2
  for (let i = 0; i < position.count; i++) {
    vector.fromBufferAttribute(position, i)
    dir.copy(vector).normalize()
    const lump =
      Math.sin(dir.x * freq + seed) *
      Math.cos(dir.z * freq * 1.3 - seed * 0.7) *
      Math.sin(dir.y * freq * 0.8 + seed * 1.7)
    const taper = dir.y < -0.2 ? 1 + (-dir.y - 0.2) * 1.85 : 1
    const scale = 1 + lump * 0.3 + (rand() - 0.5) * 0.07
    vector.copy(dir).multiplyScalar(radius * scale * taper)
    if (vector.y > 0) vector.y *= 0.4
    position.setXYZ(i, vector.x, vector.y, vector.z)
  }
  geometry.computeVertexNormals()
  return geometry
}

function makeWingGeometry() {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, 0, -0.12, 1.9, 0.07, -0.55, 0.34, 0.02, 0.82], 3),
  )
  geometry.computeVertexNormals()
  return geometry
}

export class CelestialScene {
  readonly group = new THREE.Group()
  readonly gatePosition = new THREE.Vector3(0, 0, -70)
  readonly merchantPosition = new THREE.Vector3(34, 3.6, 26)
  readonly bossArena = { x: ARENA.x, z: ARENA.z, radius: ARENA.radius }

  private follow = new THREE.Group()
  private statics = new THREE.Group()

  private sea: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  private dome: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>
  private columnMaterial: THREE.ShaderMaterial
  private cloudMesh: THREE.InstancedMesh<THREE.IcosahedronGeometry, THREE.ShaderMaterial>

  private hemi: THREE.HemisphereLight
  private sun: THREE.DirectionalLight
  private crystalMat: THREE.MeshStandardMaterial

  private clusters: CloudCluster[] = []
  private puffs: Puff[] = []
  private clusterState: Float32Array
  private islands: Island[] = []
  private cranes: Crane[] = []
  private pulses: Pulse[] = []
  private gateShards: THREE.Mesh[] = []
  private disposables: Disposable[] = []

  private runeA: THREE.Mesh
  private runeB: THREE.Mesh
  private gateSparks: ParticleLayer
  private gateSparkAngle: Float32Array
  private gateSparkLift: Float32Array
  private gateLight: THREE.PointLight

  private merchantGroup: THREE.Group
  private merchantLight: THREE.PointLight

  private meteors: ParticleLayer
  private meteorBase: Float32Array
  private meteorVel: Float32Array
  private meteorTime: Float32Array
  private meteorDur: Float32Array
  private meteorWait: Float32Array

  private craneTrail: ParticleLayer
  private motes: ParticleLayer
  private moteVel: Float32Array

  private burstLayer: ParticleLayer
  private burstVel: Float32Array
  private burstLife: Float32Array
  private burstMax: Float32Array
  private burstCursor = 0

  private arenaStorm: ParticleLayer
  private arenaStormAngle: Float32Array

  private spriteTex: THREE.CanvasTexture
  private glowTex: THREE.CanvasTexture
  private haloTex: THREE.CanvasTexture
  private haloGeo: THREE.PlaneGeometry

  private rimLight: THREE.PointLight
  private rimParent: THREE.Object3D | null = null
  private rimIntensity = 11

  private _active = false
  private dummy = new THREE.Object3D()
  private rand = mulberry32(20261024)

  constructor(scene: THREE.Scene) {
    this.spriteTex = softSprite(64)
    this.glowTex = glowSprite(192)
    this.haloTex = haloRing(256)
    this.disposables.push(this.spriteTex, this.glowTex, this.haloTex)
    this.haloGeo = this.own(new THREE.PlaneGeometry(1, 1))
    this.haloGeo.rotateX(-Math.PI / 2)
    this.clusterState = new Float32Array(0)

    scene.add(this.group)
    this.group.add(this.follow, this.statics)
    this.group.visible = false

    this.sea = this.buildSea()
    this.dome = this.buildDome()
    this.columnMaterial = this.buildColumn()

    this.hemi = new THREE.HemisphereLight('#fff2d8', '#e9b697', 1.15)
    this.hemi.castShadow = false
    this.sun = new THREE.DirectionalLight('#ffe4b8', 1.55)
    this.sun.position.copy(SUN_DIR).multiplyScalar(120)
    this.sun.castShadow = false
    this.group.add(this.hemi, this.sun)

    this.crystalMat = this.own(
      new THREE.MeshStandardMaterial({
        color: '#eafcff',
        emissive: '#6fe6ff',
        emissiveIntensity: 1.5,
        roughness: 0.24,
        flatShading: true,
        transparent: true,
        opacity: 0.92,
        fog: false,
      }),
    )

    this.cloudMesh = this.buildClouds()
    for (const slot of ISLAND_SLOTS) this.islands.push(this.buildIsland(slot))

    const gate = this.buildGate()
    this.runeA = gate.runeA
    this.runeB = gate.runeB
    this.gateSparks = gate.sparks
    this.gateSparkAngle = gate.sparkAngle
    this.gateSparkLift = gate.sparkLift
    this.gateLight = gate.light

    const merchant = this.buildMerchant()
    this.merchantGroup = merchant.group
    this.merchantLight = merchant.light

    const meteor = this.buildMeteors()
    this.meteors = meteor.layer
    this.meteorBase = meteor.base
    this.meteorVel = meteor.vel
    this.meteorTime = meteor.time
    this.meteorDur = meteor.dur
    this.meteorWait = meteor.wait

    const crane = this.buildCranes()
    this.cranes = crane.cranes
    this.craneTrail = crane.trail

    this.motes = this.buildMotes()
    this.moteVel = new Float32Array(this.motes.count * 3)
    this.seedMotes()

    this.burstLayer = new ParticleLayer(120, this.spriteTex)
    this.statics.add(this.burstLayer.points)
    this.burstVel = new Float32Array(this.burstLayer.count * 3)
    this.burstLife = new Float32Array(this.burstLayer.count)
    this.burstMax = new Float32Array(this.burstLayer.count)

    const arena = this.buildArena()
    this.arenaStorm = arena.layer
    this.arenaStormAngle = arena.angle

    this.rimLight = new THREE.PointLight('#ffd28c', 0, 30, 2)
    this.rimLight.castShadow = false

    this.prime()
  }

  get active() {
    return this._active
  }

  enter() {
    this._active = true
    this.group.visible = true
    this.hemi.intensity = 1.15
    this.sun.intensity = 1.55
    if (this.rimParent) this.rimLight.intensity = this.rimIntensity
  }

  exit() {
    this._active = false
    this.group.visible = false
    this.hemi.intensity = 0
    this.sun.intensity = 0
    this.rimLight.intensity = 0
  }

  surfaceAt(x: number, z: number, time: number) {
    let height = 0
    for (const wave of CLOUD_WAVES) {
      const k = TAU / wave.length
      height +=
        wave.amplitude * Math.sin(k * (wave.dx * x + wave.dz * z) + wave.phase - wave.omega * time)
    }
    return height
  }

  setRimTarget(target: THREE.Object3D | null) {
    if (target === this.rimParent) return
    if (this.rimParent) this.rimLight.removeFromParent()
    this.rimParent = target
    if (!target) {
      this.rimLight.intensity = 0
      return
    }
    target.add(this.rimLight)
    this.rimLight.position.set(0, 2.1, -2.6)
    this.rimLight.intensity = this._active ? this.rimIntensity : 0
  }

  burst(at: THREE.Vector3, count = 16) {
    const layer = this.burstLayer
    for (let n = 0; n < count; n++) {
      const i = this.burstCursor
      this.burstCursor = (this.burstCursor + 1) % layer.count
      const angle = this.rand() * TAU
      const spread = 1.4 + this.rand() * 2.2
      layer.write(
        i,
        at.x + Math.cos(angle) * 0.2,
        at.y + 0.3 + this.rand() * 0.3,
        at.z + Math.sin(angle) * 0.2,
        0.5 + this.rand() * 0.9,
        1,
        0.9 + this.rand() * 0.1,
        0.6 + this.rand() * 0.28,
        1,
      )
      this.burstVel[i * 3] = Math.cos(angle) * spread
      this.burstVel[i * 3 + 1] = 1.2 + this.rand() * 2.6
      this.burstVel[i * 3 + 2] = Math.sin(angle) * spread
      const life = 0.65 + this.rand() * 0.7
      this.burstLife[i] = life
      this.burstMax[i] = life
    }
  }

  update(dt: number, time: number, center: THREE.Vector3) {
    if (!this._active) return

    this.follow.position.set(center.x, 0, center.z)
    this.sea.material.uniforms.uTime.value = time
    this.dome.material.uniforms.uTime.value = time
    this.columnMaterial.uniforms.uTime.value = time
    this.cloudMesh.material.uniforms.uTime.value = time

    this.updateClouds(time)
    this.updateIslands(time, dt)
    this.updateGate(time, dt)
    this.updateMerchant(time)
    this.updateCranes(time)
    this.updateMeteors(dt)
    this.updateMotes(time, dt)
    this.updateArenaStorm(time)
    this.updateBurst(dt)
    this.updatePulses(time, dt)

    this.crystalMat.emissiveIntensity = 1.15 + (0.5 + 0.5 * Math.sin(time * 0.55)) * 0.8
  }

  dispose() {
    for (const layer of [
      this.meteors,
      this.craneTrail,
      this.motes,
      this.burstLayer,
      this.gateSparks,
      this.arenaStorm,
    ]) {
      layer.dispose()
    }
    for (const disposable of this.disposables) disposable.dispose()
    this.disposables.length = 0
    this.rimLight.removeFromParent()
    this.rimParent = null
    this.group.removeFromParent()
  }

  // ---------------------------------------------------------------- builders

  private own<T extends Disposable>(item: T): T {
    this.disposables.push(item)
    return item
  }

  private buildSea() {
    const geometry = this.own(new THREE.PlaneGeometry(470, 470, 148, 148))
    geometry.rotateX(-Math.PI / 2)
    const material = this.own(
      new THREE.ShaderMaterial({
        vertexShader: seaVertexShader,
        fragmentShader: seaFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uSunDir: { value: SUN_DIR.clone() },
          uShadow: { value: new THREE.Color(PAL.seaShadow) },
          uIvory: { value: new THREE.Color(PAL.seaIvory) },
          uGold: { value: new THREE.Color(PAL.gold) },
          uCool: { value: new THREE.Color(PAL.cool) },
          uHaze: { value: new THREE.Color(PAL.haze) },
          uHazeRange: { value: new THREE.Vector2(112, 246) },
        },
      }),
    )
    const mesh = new THREE.Mesh(geometry, material)
    mesh.frustumCulled = false
    this.follow.add(mesh)
    return mesh
  }

  private buildDome() {
    const geometry = this.own(new THREE.SphereGeometry(380, 40, 24))
    const material = this.own(
      new THREE.ShaderMaterial({
        vertexShader: domeVertexShader,
        fragmentShader: domeFragmentShader,
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uZenith: { value: new THREE.Color(PAL.zenith) },
          uHorizon: { value: new THREE.Color(PAL.horizon) },
          uGlow: { value: new THREE.Color(PAL.glow) },
          uGold: { value: new THREE.Color(PAL.gold) },
          uAuroraA: { value: new THREE.Color(PAL.auroraA) },
          uAuroraB: { value: new THREE.Color(PAL.auroraB) },
          uSunDir: { value: SUN_DIR.clone() },
        },
      }),
    )
    const mesh = new THREE.Mesh(geometry, material)
    mesh.renderOrder = -10
    mesh.frustumCulled = false
    this.follow.add(mesh)
    return mesh
  }

  private buildColumn() {
    return this.own(
      new THREE.ShaderMaterial({
        vertexShader: columnVertexShader,
        fragmentShader: columnFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uPulse: { value: 1 },
          uColor: { value: new THREE.Color('#ffe3ad') },
          uAccent: { value: new THREE.Color('#ffc873') },
        },
      }),
    )
  }

  private buildClouds() {
    const geometry = this.own(new THREE.IcosahedronGeometry(1, 1))
    const material = this.own(
      new THREE.ShaderMaterial({
        vertexShader: puffVertexShader,
        fragmentShader: puffFragmentShader,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uSunDir: { value: SUN_DIR.clone() },
          uWarm: { value: new THREE.Color('#fffaf0') },
          uCool: { value: new THREE.Color('#e7dceb') },
          uGold: { value: new THREE.Color(PAL.gold) },
        },
      }),
    )

    const rand = mulberry32(90210)
    for (let c = 0; c < 46; c++) {
      const angle = rand() * TAU
      const dist = 22 + rand() * 162
      this.clusters.push({
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        y: 1.6 + rand() * 26,
        spin: (rand() - 0.5) * 0.1,
        bobAmp: 0.3 + rand() * 0.7,
        bobSpeed: 0.18 + rand() * 0.22,
        phase: rand() * TAU,
        drift: 4 + rand() * 9,
      })

      const spread = 2.6 + rand() * 4.4
      const puffCount = 4 + Math.floor(rand() * 4)
      for (let p = 0; p < puffCount; p++) {
        const pa = rand() * TAU
        const pr = Math.sqrt(rand()) * spread
        const size = 1.5 + rand() * 2.6
        this.puffs.push({
          cluster: c,
          ox: Math.cos(pa) * pr,
          oy: (rand() - 0.5) * spread * 0.42,
          oz: Math.sin(pa) * pr,
          sx: size * (0.85 + rand() * 0.5),
          sy: size * (0.55 + rand() * 0.35),
          sz: size * (0.85 + rand() * 0.5),
          rx: (rand() - 0.5) * 0.5,
          rz: (rand() - 0.5) * 0.5,
        })
      }
    }

    const seeds = new Float32Array(this.puffs.length)
    for (let i = 0; i < seeds.length; i++) seeds[i] = rand()
    geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1))

    // 每簇缓存 cos / sin / 圆心，省掉逐云团的三角函数
    this.clusterState = new Float32Array(this.clusters.length * 5)

    const mesh = new THREE.InstancedMesh(geometry, material, this.puffs.length)
    mesh.frustumCulled = false
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.statics.add(mesh)
    return mesh
  }

  private registerPulse(node: THREE.Object3D, amp: number, speed: number, spin: number) {
    this.pulses.push({
      node,
      base: node.scale.x,
      amp,
      speed,
      phase: this.rand() * TAU,
      spin,
    })
  }

  private makeHalo(scale: number, opacity: number, color: string) {
    const geometry = this.own(new THREE.PlaneGeometry(1, 1))
    geometry.rotateX(-Math.PI / 2)
    const material = this.own(
      new THREE.MeshBasicMaterial({
        map: this.haloTex,
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      }),
    )
    const mesh = new THREE.Mesh(geometry, material)
    mesh.scale.setScalar(scale)
    mesh.renderOrder = 2
    return mesh
  }

  private makeGlow(scale: number, color: string, opacity: number, amp: number, speed: number) {
    const node = new THREE.Group()
    const spread = new THREE.Sprite(
      this.own(
        new THREE.SpriteMaterial({
          map: this.glowTex,
          color,
          transparent: true,
          opacity,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          fog: false,
        }),
      ),
    )
    spread.scale.setScalar(scale)
    const core = new THREE.Sprite(
      this.own(
        new THREE.SpriteMaterial({
          map: this.glowTex,
          color: '#fffbee',
          transparent: true,
          opacity: Math.min(0.95, opacity + 0.2),
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          fog: false,
        }),
      ),
    )
    core.scale.setScalar(scale * 0.42)
    node.add(spread, core)
    this.registerPulse(node, amp, speed, 0)
    return node
  }

  private buildIsland(slot: { x: number; z: number; r: number; y: number; seed: number }): Island {
    const rand = mulberry32(slot.seed * 977 + 13)
    const group = new THREE.Group()
    group.position.set(slot.x, slot.y, slot.z)

    const rock = new THREE.Mesh(
      this.own(makeIslandGeometry(slot.seed, slot.r)),
      this.own(
        new THREE.MeshStandardMaterial({
          color: '#b9a68e',
          roughness: 1,
          flatShading: true,
          fog: false,
        }),
      ),
    )
    group.add(rock)

    const cap = new THREE.Mesh(
      this.own(new THREE.SphereGeometry(slot.r * 0.84, 16, 7, 0, TAU, 0, 0.62)),
      this.own(
        new THREE.MeshStandardMaterial({
          color: '#a9d8b6',
          roughness: 0.92,
          flatShading: true,
          fog: false,
        }),
      ),
    )
    cap.scale.y = 0.3
    cap.position.y = slot.r * 0.1
    group.add(cap)

    const gemGeo = this.own(new THREE.OctahedronGeometry(1, 0))
    let leadX = 0
    let leadY = 0
    let leadZ = 0
    for (let i = 0; i < 3; i++) {
      const height = 0.9 + rand() * 1.9
      const angle = rand() * TAU
      const distance = slot.r * (0.14 + rand() * 0.42)
      const gem = new THREE.Mesh(gemGeo, this.crystalMat)
      gem.scale.set(0.4 + rand() * 0.22, height, 0.4 + rand() * 0.22)
      gem.position.set(Math.cos(angle) * distance, slot.r * 0.22 + height * 0.58, Math.sin(angle) * distance)
      gem.rotation.set((rand() - 0.5) * 0.4, rand() * TAU, (rand() - 0.5) * 0.4)
      group.add(gem)
      if (i === 0) {
        leadX = gem.position.x
        leadY = gem.position.y
        leadZ = gem.position.z
      }
    }

    const glow = this.makeGlow(slot.r * 1.6, '#bff0ff', 0.28, 0.16, 0.5 + rand() * 0.4)
    glow.position.set(leadX, leadY + 0.3, leadZ)
    group.add(glow)

    const halo = this.makeHalo(slot.r * 4.6, 0.45, '#ffe6b8')
    halo.position.y = -slot.r
    group.add(halo)
    // 水平圆盘只能沿 Y 自转，这里用缩放呼吸代替
    this.registerPulse(halo, 0.05, 0.3 + rand() * 0.3, 0)

    this.statics.add(group)
    return {
      group,
      baseY: slot.y,
      bobAmp: 0.5 + rand() * 0.8,
      bobSpeed: 0.15 + rand() * 0.17,
      phase: rand() * TAU,
      spin: (rand() - 0.5) * 0.035,
    }
  }

  private buildArena() {
    this.islands.push(this.buildIsland({ x: ARENA.x, z: ARENA.z, r: 14, y: 10, seed: 101 }))
    const nest = this.islands[this.islands.length - 1].group

    const spireGeo = this.own(new THREE.ConeGeometry(0.95, 7.5, 6))
    const reach = ARENA.radius * 0.78
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * TAU
      const spire = new THREE.Mesh(spireGeo, this.crystalMat)
      spire.position.set(Math.cos(angle) * reach, 3.4, Math.sin(angle) * reach)
      spire.rotation.set(Math.cos(angle) * 0.14, angle, Math.sin(angle) * 0.14)
      nest.add(spire)
    }

    const ring = this.makeHalo(ARENA.radius * 2.4, 0.4, '#d9f2ff')
    ring.position.set(ARENA.x, 1.1, ARENA.z)
    ring.renderOrder = 3
    this.statics.add(ring)
    this.registerPulse(ring, 0.08, 0.42, 0)

    const layer = new ParticleLayer(64, this.spriteTex)
    layer.points.position.set(ARENA.x, 0, ARENA.z)
    this.statics.add(layer.points)
    const angle = new Float32Array(layer.count)
    for (let i = 0; i < layer.count; i++) angle[i] = this.rand() * TAU
    return { layer, angle }
  }

  private buildGate() {
    const group = new THREE.Group()
    group.position.copy(this.gatePosition)

    const goldMat = this.own(
      new THREE.MeshStandardMaterial({
        color: '#ffeec2',
        emissive: '#ffbb58',
        emissiveIntensity: 1.25,
        metalness: 0.45,
        roughness: 0.34,
        flatShading: true,
        fog: false,
      }),
    )
    const stoneMat = this.own(
      new THREE.MeshStandardMaterial({
        color: '#f4ead8',
        roughness: 0.95,
        flatShading: true,
        fog: false,
      }),
    )

    const base = new THREE.Mesh(this.own(new THREE.CylinderGeometry(6.2, 7.1, 0.7, 12)), stoneMat)
    base.position.y = 0.35
    const step = new THREE.Mesh(this.own(new THREE.CylinderGeometry(4.9, 5.6, 0.45, 12)), stoneMat)
    step.position.y = 0.85
    group.add(base, step)

    const ring = new THREE.Mesh(this.own(new THREE.TorusGeometry(4.4, 0.34, 10, 44)), goldMat)
    ring.position.y = 5.1
    const innerRing = new THREE.Mesh(this.own(new THREE.TorusGeometry(3.05, 0.13, 8, 36)), goldMat)
    innerRing.position.y = 5.1
    group.add(ring, innerRing)
    this.registerPulse(ring, 0.035, 0.9, 0.1)
    this.registerPulse(innerRing, 0.05, 1.4, -0.16)

    const discGeo = this.own(new THREE.CircleGeometry(4.05, 48))
    const runeA = new THREE.Mesh(
      discGeo,
      this.own(
        new THREE.MeshBasicMaterial({
          map: this.own(runeRing(3, 512)),
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          fog: false,
        }),
      ),
    )
    const runeB = new THREE.Mesh(
      discGeo,
      this.own(
        new THREE.MeshBasicMaterial({
          map: this.own(runeRing(11, 512)),
          transparent: true,
          opacity: 0.7,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          fog: false,
        }),
      ),
    )
    runeA.position.y = 5.1
    runeB.position.set(0, 5.1, 0.07)
    runeB.scale.setScalar(0.6)
    group.add(runeA, runeB)

    const column = new THREE.Mesh(
      this.own(new THREE.CylinderGeometry(3.1, 4.9, 21, 26, 1, true)),
      this.columnMaterial,
    )
    column.position.y = 11
    column.renderOrder = 4
    group.add(column)

    const glow = this.makeGlow(25, '#ffd9a0', 0.55, 0.13, 0.9)
    glow.position.y = 5.1
    group.add(glow)

    const shardGeo = this.own(new THREE.OctahedronGeometry(1, 0))
    for (let i = 0; i < 5; i++) {
      const shard = new THREE.Mesh(shardGeo, this.crystalMat)
      shard.scale.set(0.34, 0.74, 0.34)
      shard.userData.orbit = (i / 5) * TAU
      shard.userData.radius = 5.6 + (i % 2) * 0.9
      shard.userData.lift = 0.6 + (i % 3) * 0.5
      group.add(shard)
      this.gateShards.push(shard)
    }

    const sparks = new ParticleLayer(44, this.spriteTex)
    group.add(sparks.points)
    const sparkAngle = new Float32Array(sparks.count)
    const sparkLift = new Float32Array(sparks.count)
    for (let i = 0; i < sparks.count; i++) {
      sparkAngle[i] = this.rand() * TAU
      sparkLift[i] = this.rand()
    }

    const light = new THREE.PointLight('#ffdca6', 26, 78, 2)
    light.castShadow = false
    light.position.set(0, 5.4, 1.3)
    group.add(light)

    this.statics.add(group)
    return { group, runeA, runeB, sparks, sparkAngle, sparkLift, light }
  }

  private buildMerchant() {
    const group = new THREE.Group()
    group.position.copy(this.merchantPosition)

    const lacquer = this.own(
      new THREE.MeshStandardMaterial({
        color: '#a8452f',
        roughness: 0.72,
        flatShading: true,
        fog: false,
      }),
    )
    const wood = this.own(
      new THREE.MeshStandardMaterial({
        color: '#c9a06a',
        roughness: 0.9,
        flatShading: true,
        fog: false,
      }),
    )
    const goldMat = this.own(
      new THREE.MeshStandardMaterial({
        color: '#ffe9bd',
        emissive: '#ffb347',
        emissiveIntensity: 1.1,
        metalness: 0.4,
        roughness: 0.35,
        flatShading: true,
        fog: false,
      }),
    )

    const deck = new THREE.Mesh(this.own(new THREE.CylinderGeometry(3.1, 2.6, 0.42, 8)), wood)
    const hull = new THREE.Mesh(this.own(new THREE.ConeGeometry(2.7, 2.1, 8)), lacquer)
    hull.rotation.x = Math.PI
    hull.position.y = -1.25
    const rail = new THREE.Mesh(this.own(new THREE.TorusGeometry(3.05, 0.09, 6, 24)), goldMat)
    rail.rotation.x = Math.PI / 2
    rail.position.y = 0.42
    group.add(deck, hull, rail)

    const postGeo = this.own(new THREE.CylinderGeometry(0.11, 0.11, 2.5, 6))
    for (let i = 0; i < 4; i++) {
      const angle = Math.PI / 4 + (i / 4) * TAU
      const post = new THREE.Mesh(postGeo, lacquer)
      post.position.set(Math.cos(angle) * 2.35, 1.45, Math.sin(angle) * 2.35)
      group.add(post)
    }

    const roof = new THREE.Mesh(this.own(new THREE.ConeGeometry(3.7, 1.35, 8)), lacquer)
    roof.position.y = 3.1
    const roofTop = new THREE.Mesh(this.own(new THREE.ConeGeometry(1.9, 1.05, 8)), lacquer)
    roofTop.position.y = 4.05
    const finial = new THREE.Mesh(this.own(new THREE.OctahedronGeometry(0.32, 0)), goldMat)
    finial.position.y = 4.85
    group.add(roof, roofTop, finial)

    const lantern = new THREE.Mesh(
      this.own(new THREE.SphereGeometry(0.44, 14, 10)),
      this.own(
        new THREE.MeshStandardMaterial({
          color: '#fff0c4',
          emissive: '#ffab4d',
          emissiveIntensity: 2.4,
          roughness: 0.5,
          fog: false,
        }),
      ),
    )
    lantern.scale.y = 1.2
    lantern.position.set(0, 2.2, 2.35)
    group.add(lantern)

    const lanternGlow = this.makeGlow(6.4, '#ffc275', 0.6, 0.22, 1.7)
    lanternGlow.position.copy(lantern.position)
    group.add(lanternGlow)

    const banner = new THREE.Mesh(
      this.own(new THREE.PlaneGeometry(0.78, 2.5)),
      this.own(
        new THREE.MeshBasicMaterial({
          map: this.own(bannerTexture()),
          transparent: true,
          side: THREE.DoubleSide,
          fog: false,
        }),
      ),
    )
    banner.position.set(-2.95, 0.55, 1.15)
    banner.rotation.y = -0.55
    group.add(banner)

    const crateGeo = this.own(new THREE.BoxGeometry(0.8, 0.7, 0.8))
    const crateA = new THREE.Mesh(crateGeo, wood)
    crateA.position.set(1.5, 0.56, -1.1)
    const crateB = new THREE.Mesh(crateGeo, wood)
    crateB.position.set(-1.3, 0.56, -1.5)
    crateB.rotation.y = 0.4
    group.add(crateA, crateB)

    const wares = new THREE.Mesh(this.own(new THREE.OctahedronGeometry(0.5, 0)), this.crystalMat)
    wares.position.set(1.4, 1.05, -1.1)
    group.add(wares)
    this.registerPulse(wares, 0.12, 0.8, 0.5)

    const halo = this.makeHalo(14, 0.42, '#ffe0ae')
    halo.position.y = -2.7
    group.add(halo)
    this.registerPulse(halo, 0.06, 0.36, 0)

    const light = new THREE.PointLight('#ffbf6e', 14, 30, 2)
    light.castShadow = false
    light.position.copy(lantern.position)
    group.add(light)

    this.statics.add(group)
    return { group, light }
  }

  private buildMeteors() {
    const layer = new ParticleLayer(METEOR_TAIL * METEOR_COUNT, this.spriteTex)
    this.follow.add(layer.points)

    const base = new Float32Array(METEOR_COUNT * 3)
    const vel = new Float32Array(METEOR_COUNT * 3)
    const time = new Float32Array(METEOR_COUNT)
    const dur = new Float32Array(METEOR_COUNT)
    const wait = new Float32Array(METEOR_COUNT)
    for (let m = 0; m < METEOR_COUNT; m++) {
      time[m] = m / METEOR_COUNT
      dur[m] = 2.2 + this.rand() * 1.4
      wait[m] = m * 3.4
      this.launchMeteor(m, base, vel)
    }
    return { layer, base, vel, time, dur, wait }
  }

  private buildCranes() {
    const bodyGeo = this.own(new THREE.SphereGeometry(0.32, 10, 8))
    const neckGeo = this.own(new THREE.CylinderGeometry(0.06, 0.08, 1.0, 6))
    const headGeo = this.own(new THREE.SphereGeometry(0.16, 8, 6))
    const beakGeo = this.own(new THREE.ConeGeometry(0.07, 0.5, 5))
    const tailGeo = this.own(new THREE.ConeGeometry(0.2, 0.75, 6))
    const wingGeo = this.own(makeWingGeometry())
    const featherMat = this.own(
      new THREE.MeshStandardMaterial({
        color: '#fdf7ea',
        roughness: 0.85,
        flatShading: true,
        side: THREE.DoubleSide,
        fog: false,
      }),
    )
    const darkMat = this.own(
      new THREE.MeshStandardMaterial({
        color: '#2c3440',
        roughness: 0.9,
        flatShading: true,
        fog: false,
      }),
    )

    const cranes: Crane[] = []
    for (const slot of CRANE_SLOTS) {
      const node = new THREE.Group()

      const body = new THREE.Mesh(bodyGeo, featherMat)
      body.scale.set(0.85, 0.8, 2.5)

      const neck = new THREE.Mesh(neckGeo, featherMat)
      neck.position.set(0, 0.28, 0.85)
      neck.rotation.x = 0.95

      const head = new THREE.Mesh(headGeo, featherMat)
      head.position.set(0, 0.6, 1.26)

      const beak = new THREE.Mesh(beakGeo, darkMat)
      beak.position.set(0, 0.58, 1.6)
      beak.rotation.x = Math.PI / 2

      const tail = new THREE.Mesh(tailGeo, featherMat)
      tail.position.set(0, 0.05, -1.05)
      tail.rotation.x = -Math.PI / 2 - 0.2

      const right = new THREE.Mesh(wingGeo, featherMat)
      right.position.set(0.12, 0.16, 0)
      const left = new THREE.Mesh(wingGeo, featherMat)
      left.position.set(-0.12, 0.16, 0)
      left.scale.x = -1

      node.add(body, neck, head, beak, tail, right, left)
      node.scale.setScalar(1.7)
      this.statics.add(node)

      cranes.push({
        node,
        right,
        left,
        cx: slot.cx,
        cz: slot.cz,
        rx: slot.rx,
        rz: slot.rz,
        height: slot.height,
        speed: slot.speed,
        phase: this.rand() * TAU,
        flapSpeed: 1.5 + this.rand() * 0.5,
        wobble: this.rand() * TAU,
      })
    }

    const trail = new ParticleLayer(TRAIL_PER_CRANE * CRANE_SLOTS.length, this.spriteTex)
    this.statics.add(trail.points)
    return { cranes, trail }
  }

  private buildMotes() {
    const layer = new ParticleLayer(MOTE_COUNT, this.spriteTex)
    this.follow.add(layer.points)
    return layer
  }

  private seedMotes() {
    for (let i = 0; i < this.motes.count; i++) {
      const x = i * 3
      const c = i * 4
      this.motes.pos[x] = (this.rand() * 2 - 1) * MOTE_REACH
      this.motes.pos[x + 1] = 0.5 + this.rand() * MOTE_TOP
      this.motes.pos[x + 2] = (this.rand() * 2 - 1) * MOTE_REACH
      this.moteVel[x] = (this.rand() - 0.5) * 0.6
      this.moteVel[x + 1] = 0.18 + this.rand() * 0.4
      this.moteVel[x + 2] = (this.rand() - 0.5) * 0.6
      this.motes.col[c] = 1
      this.motes.col[c + 1] = 0.92
      this.motes.col[c + 2] = 0.7
      this.motes.siz[i] = 0.3
    }
    this.motes.flush()
  }

  private launchMeteor(index: number, base: Float32Array, vel: Float32Array) {
    const theta = this.rand() * TAU
    const shell = 168 + this.rand() * 74
    base[index * 3] = Math.cos(theta) * shell
    base[index * 3 + 1] = shell * (0.26 + this.rand() * 0.26)
    base[index * 3 + 2] = Math.sin(theta) * shell

    const along = theta + Math.PI * (0.28 + this.rand() * 0.44)
    const speed = 92 + this.rand() * 68
    vel[index * 3] = Math.cos(along) * speed
    vel[index * 3 + 1] = -speed * (0.14 + this.rand() * 0.2)
    vel[index * 3 + 2] = Math.sin(along) * speed
  }

  // ----------------------------------------------------------------- updates

  private updateClouds(time: number) {
    const state = this.clusterState
    for (let c = 0; c < this.clusters.length; c++) {
      const cluster = this.clusters[c]
      const angle = cluster.phase + time * cluster.spin
      const bob = Math.sin(time * cluster.bobSpeed + cluster.phase) * cluster.bobAmp
      const drift = Math.sin(time * 0.02 + cluster.phase * 1.7) * cluster.drift
      const at = c * 5
      state[at] = Math.cos(angle)
      state[at + 1] = Math.sin(angle)
      state[at + 2] = cluster.x + drift
      state[at + 3] = cluster.y + bob
      state[at + 4] = cluster.z + Math.cos(time * 0.017 + cluster.phase) * cluster.drift * 0.6
    }

    const dummy = this.dummy
    for (let i = 0; i < this.puffs.length; i++) {
      const puff = this.puffs[i]
      const at = puff.cluster * 5
      const cos = state[at]
      const sin = state[at + 1]
      dummy.position.set(
        state[at + 2] + puff.ox * cos - puff.oz * sin,
        state[at + 3] + puff.oy,
        state[at + 4] + puff.ox * sin + puff.oz * cos,
      )
      dummy.rotation.set(puff.rx, Math.atan2(sin, cos), puff.rz)
      dummy.scale.set(puff.sx, puff.sy, puff.sz)
      dummy.updateMatrix()
      this.cloudMesh.setMatrixAt(i, dummy.matrix)
    }
    this.cloudMesh.instanceMatrix.needsUpdate = true
  }

  private updateIslands(time: number, dt: number) {
    for (const island of this.islands) {
      island.group.position.y =
        island.baseY + Math.sin(time * island.bobSpeed + island.phase) * island.bobAmp
      island.group.rotation.y += island.spin * dt
    }
  }

  private updateGate(time: number, dt: number) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.9)
    this.columnMaterial.uniforms.uPulse.value = pulse
    this.runeA.rotation.z += dt * 0.14
    this.runeB.rotation.z -= dt * 0.24
    this.gateLight.intensity = 20 + pulse * 14

    for (let i = 0; i < this.gateShards.length; i++) {
      const shard = this.gateShards[i]
      const angle = (shard.userData.orbit as number) + time * 0.32
      const radius = shard.userData.radius as number
      const lift = shard.userData.lift as number
      shard.position.set(
        Math.cos(angle) * radius,
        5.1 + Math.sin(time * 0.7 + i) * lift,
        Math.sin(angle) * radius,
      )
      shard.rotation.y += dt * 0.9
    }

    const sparks = this.gateSparks
    for (let i = 0; i < sparks.count; i++) {
      let lift = this.gateSparkLift[i] + dt * (0.14 + (i % 5) * 0.02)
      if (lift > 1) lift -= 1
      this.gateSparkLift[i] = lift
      const angle = this.gateSparkAngle[i] + lift * 1.4
      const radius = 3.6 * (1 - lift * 0.55)
      const fade = Math.sin(lift * Math.PI)
      sparks.write(
        i,
        Math.cos(angle) * radius,
        0.9 + lift * 15,
        Math.sin(angle) * radius,
        0.32 + fade * 0.5,
        1,
        0.9,
        0.62,
        fade * 0.72,
      )
    }
    sparks.flush()
  }

  private updateMerchant(time: number) {
    const surface = this.surfaceAt(this.merchantPosition.x, this.merchantPosition.z, time)
    this.merchantGroup.position.y = this.merchantPosition.y + surface + Math.sin(time * 0.42) * 0.32
    this.merchantGroup.rotation.y = Math.sin(time * 0.11) * 0.16
    this.merchantLight.intensity = 12 + Math.sin(time * 3.1) * 1.6 + Math.sin(time * 7.3) * 0.7
  }

  private updateCranes(time: number) {
    const layer = this.craneTrail
    for (let i = 0; i < this.cranes.length; i++) {
      const crane = this.cranes[i]
      const angle = crane.phase + time * crane.speed
      const next = angle + crane.speed * 0.12
      const y = crane.height + Math.sin(time * 0.42 + crane.wobble) * 1.7

      crane.node.position.set(
        crane.cx + Math.cos(angle) * crane.rx,
        y,
        crane.cz + Math.sin(angle) * crane.rz,
      )
      crane.node.rotation.y = Math.atan2(
        Math.cos(next) * crane.rx - Math.cos(angle) * crane.rx,
        Math.sin(next) * crane.rz - Math.sin(angle) * crane.rz,
      )
      crane.node.rotation.z = Math.cos(time * 0.5 + crane.wobble) * 0.12

      const flap = Math.sin(time * crane.flapSpeed + crane.wobble) * 0.72 - 0.1
      crane.right.rotation.z = flap
      crane.left.rotation.z = -flap

      const step = crane.speed < 0 ? -0.05 : 0.05
      for (let t = 0; t < TRAIL_PER_CRANE; t++) {
        const trailAngle = angle - (t + 1) * step
        const fade = (1 - t / TRAIL_PER_CRANE) * 0.4
        layer.write(
          i * TRAIL_PER_CRANE + t,
          crane.cx + Math.cos(trailAngle) * crane.rx,
          y + Math.sin(time * 0.42 + crane.wobble - t * 0.12) * 0.4 - t * 0.07,
          crane.cz + Math.sin(trailAngle) * crane.rz,
          0.24 + fade * 0.5,
          1,
          0.96,
          0.86,
          fade,
        )
      }
    }
    layer.flush()
  }

  private updateMeteors(dt: number) {
    const layer = this.meteors
    for (let m = 0; m < METEOR_COUNT; m++) {
      if (this.meteorWait[m] > 0) {
        this.meteorWait[m] -= dt
        for (let t = 0; t < METEOR_TAIL; t++) layer.hide(m * METEOR_TAIL + t)
        continue
      }

      this.meteorTime[m] += dt / this.meteorDur[m]
      if (this.meteorTime[m] >= 1) {
        this.meteorTime[m] = 0
        this.meteorWait[m] = 3 + this.rand() * 9
        this.launchMeteor(m, this.meteorBase, this.meteorVel)
        continue
      }

      const elapsed = this.meteorTime[m] * this.meteorDur[m]
      const life = Math.sin(this.meteorTime[m] * Math.PI)
      for (let t = 0; t < METEOR_TAIL; t++) {
        const index = m * METEOR_TAIL + t
        const age = elapsed - t * 0.032
        if (age < 0) {
          layer.hide(index)
          continue
        }
        const fade = (1 - t / METEOR_TAIL) * life
        layer.write(
          index,
          this.meteorBase[m * 3] + this.meteorVel[m * 3] * age,
          this.meteorBase[m * 3 + 1] + this.meteorVel[m * 3 + 1] * age,
          this.meteorBase[m * 3 + 2] + this.meteorVel[m * 3 + 2] * age,
          Math.max(0.2, (t === 0 ? 2.4 : 1.9) * (1 - t / (METEOR_TAIL * 1.4))),
          1,
          0.94 - t * 0.012,
          0.78 - t * 0.03,
          fade,
        )
      }
    }
    layer.flush()
  }

  private updateMotes(time: number, dt: number) {
    const layer = this.motes
    for (let i = 0; i < layer.count; i++) {
      const x = i * 3
      layer.pos[x] += (this.moteVel[x] + Math.sin(time * 0.4 + i) * 0.14) * dt
      layer.pos[x + 1] += this.moteVel[x + 1] * dt
      layer.pos[x + 2] += (this.moteVel[x + 2] + Math.cos(time * 0.36 + i * 1.7) * 0.14) * dt

      if (layer.pos[x + 1] > MOTE_TOP) {
        layer.pos[x + 1] = 0.3
        layer.pos[x] = (this.rand() * 2 - 1) * MOTE_REACH
        layer.pos[x + 2] = (this.rand() * 2 - 1) * MOTE_REACH
      }
      if (layer.pos[x] > MOTE_REACH || layer.pos[x] < -MOTE_REACH) layer.pos[x] *= -1
      if (layer.pos[x + 2] > MOTE_REACH || layer.pos[x + 2] < -MOTE_REACH) layer.pos[x + 2] *= -1

      const twinkle = 0.42 + 0.58 * Math.sin(time * 1.7 + i * 2.39)
      layer.col[i * 4 + 3] = 0.14 + twinkle * 0.46
      layer.siz[i] = 0.16 + twinkle * 0.36
    }
    layer.flush()
  }

  private updateArenaStorm(time: number) {
    const layer = this.arenaStorm
    for (let i = 0; i < layer.count; i++) {
      const angle = this.arenaStormAngle[i] + time * (0.2 + (i % 7) * 0.03)
      const radius = ARENA.radius * (0.34 + ((i % 11) / 11) * 0.62)
      const flicker = Math.pow(Math.abs(Math.sin(time * 1.6 + i * 1.31)), 3)
      layer.write(
        i,
        Math.cos(angle) * radius,
        3.2 + Math.sin(time * 0.6 + i) * 3.4 + (i % 5) * 1.1,
        Math.sin(angle) * radius,
        0.35 + flicker * 0.75,
        0.72,
        0.9,
        1,
        0.1 + flicker * 0.55,
      )
    }
    layer.flush()
  }

  private updateBurst(dt: number) {
    const layer = this.burstLayer
    for (let i = 0; i < layer.count; i++) {
      if (this.burstLife[i] <= 0) continue
      this.burstLife[i] -= dt
      if (this.burstLife[i] <= 0) {
        layer.hide(i)
        continue
      }
      const x = i * 3
      layer.pos[x] += this.burstVel[x] * dt
      layer.pos[x + 1] += this.burstVel[x + 1] * dt
      layer.pos[x + 2] += this.burstVel[x + 2] * dt
      this.burstVel[x + 1] -= 2.6 * dt
      this.burstVel[x] *= Math.exp(-1.6 * dt)
      this.burstVel[x + 2] *= Math.exp(-1.6 * dt)
      const k = this.burstLife[i] / this.burstMax[i]
      layer.col[i * 4 + 3] = k * k
      layer.siz[i] = 0.35 + k * 0.85
    }
    layer.flush()
  }

  private updatePulses(time: number, dt: number) {
    for (const pulse of this.pulses) {
      const scale =
        pulse.base * (1 + pulse.amp * Math.sin(time * pulse.speed + pulse.phase))
      pulse.node.scale.setScalar(scale)
      if (pulse.spin !== 0) pulse.node.rotation.z += pulse.spin * dt
    }
  }

  /** 先摆好实例矩阵与粒子，避免 enter() 当帧出现单位矩阵的瞬时错位 */
  private prime() {
    this.updateClouds(0)
    this.updateIslands(0, 0)
    this.updateGate(0, 0)
    this.updateMerchant(0)
    this.updateCranes(0)
    this.updateArenaStorm(0)
  }
}

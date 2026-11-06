import * as THREE from 'three'
import { clamp, mulberry32 } from '@/game/utils/math'
import { celestialSurfaceHeight, celestialWaveGLSL } from './celestialWaves'
import { glowSprite, haloRing, softSprite } from './celestialTextures'

const TAU = Math.PI * 2

/** 叶海在世界里的位置：天门以北，正对出生时的船头 */
export const LEAF_SEA = { x: 0, z: 152, radius: 62 }

const SURFACE_LIFT = 0.34
const LEAF_COUNT = 560
const FIREFLY_COUNT = 240
const FALL_COUNT = 96
const RISE_COUNT = 110
const TREE_HEIGHT = 48

const leafWaveGLSL = celestialWaveGLSL()

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
      p *= 2.03;
      amp *= 0.5;
    }
    return v;
  }
`

const surfaceVertex = /* glsl */ `
  uniform float uTime;

  varying vec3 vWorld;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 base = modelMatrix * vec4(position, 1.0);
    vec2 p = base.xz;
    float disp = 0.0;
    vec2 slope = vec2(0.0);
    ${leafWaveGLSL}

    vec3 world = base.xyz + vec3(0.0, disp, 0.0);
    vWorld = world;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`

const surfaceFragment = /* glsl */ `
  #include <common>

  uniform float uTime;

  varying vec3 vWorld;
  varying vec2 vUv;

  ${noiseGLSL}

  void main() {
    vec2 q = vWorld.xz;
    vec2 flow = vec2(uTime * 0.028, uTime * 0.019);
    float f = fbm(q * 0.14 + flow);
    float g = fbm(q * 0.37 - flow * 1.6 + vec2(f * 1.5, f * 0.8));
    float fine = fbm(q * 1.15 + flow * 2.4);

    float radial = length(vUv - 0.5) * 2.0;

    // 一层压一层的叶盘：每格一片斜躺的叶子，慢慢转动
    vec2 cell = q * 0.46 + vec2(f * 1.1, g * 0.9);
    vec2 id = floor(cell);
    vec2 fr = fract(cell) - 0.5;
    float rnd = hash21(id);
    float ang = rnd * 6.2831 + uTime * (0.04 + rnd * 0.05) * (rnd > 0.5 ? 1.0 : -1.0);
    float cs = cos(ang);
    float sn = sin(ang);
    vec2 rot = vec2(fr.x * cs - fr.y * sn, fr.x * sn + fr.y * cs);
    float sdf = length(vec2(rot.x * 0.7, rot.y * 1.5)) - (0.3 + rnd * 0.18);
    float mask = 1.0 - smoothstep(-0.06, 0.06, sdf);
    float vein = pow(abs(sin(rot.y * 16.0 + uTime * 0.4)), 18.0) * mask;

    vec3 deep = vec3(0.016, 0.13, 0.095);
    vec3 mid = vec3(0.055, 0.42, 0.26);
    vec3 bright = vec3(0.26, 0.85, 0.52);
    vec3 tinge = vec3(0.82, 1.0, 0.9);

    vec3 col = mix(deep, mid, smoothstep(0.18, 0.82, f * 0.7 + g * 0.5));
    col = mix(col, bright, mask * (0.26 + rnd * 0.3));
    col = mix(col, mix(bright, tinge, 0.5), smoothstep(0.5, 0.95, g) * 0.24);
    col += tinge * vein * 0.5;
    col += tinge * pow(max(fine - 0.58, 0.0), 1.7) * 2.3;

    // 神树脚下的一圈生机
    float heart = exp(-radial * radial * 9.0);
    col += vec3(0.34, 0.95, 0.58) * heart * 0.9;
    col += vec3(0.24, 0.7, 0.44) * pow(max(1.0 - radial, 0.0), 3.0) * 0.24;

    float alpha = 1.0 - smoothstep(0.8, 0.99, radial);
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const curtainVertex = /* glsl */ `
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

const curtainFragment = /* glsl */ `
  #include <common>

  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColor;
  uniform vec3 uAccent;

  varying vec2 vUv;
  varying vec3 vWorld;
  varying vec3 vNormal;

  void main() {
    float h = 1.0 - vUv.y;
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float shell = pow(1.0 - clamp(abs(dot(normalize(vNormal), viewDir)), 0.0, 1.0), 1.5);
    float shimmer = 0.6 + 0.4 * sin(vUv.y * 22.0 - uTime * 1.1 + vUv.x * 15.0);
    float band = 0.7 + 0.3 * sin(vUv.x * 40.0 + uTime * 0.7);
    float alpha = pow(h, 1.6) * shell * shimmer * band * 0.3 * uIntensity;
    vec3 col = mix(uColor, uAccent, pow(h, 2.4));
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/** 一片叶子的贴图：叶尖朝上，边缘带柔光 */
function leafTexture(size = 128) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const c = size / 2

  ctx.save()
  ctx.translate(c, c)
  ctx.beginPath()
  ctx.moveTo(0, size * 0.42)
  ctx.bezierCurveTo(-size * 0.36, size * 0.16, -size * 0.32, -size * 0.2, 0, -size * 0.44)
  ctx.bezierCurveTo(size * 0.32, -size * 0.2, size * 0.36, size * 0.16, 0, size * 0.42)
  ctx.closePath()

  const paint = ctx.createLinearGradient(0, size * 0.42, 0, -size * 0.44)
  paint.addColorStop(0, 'rgba(150,255,196,0.96)')
  paint.addColorStop(0.45, 'rgba(92,236,150,0.98)')
  paint.addColorStop(1, 'rgba(226,255,234,0.99)')
  ctx.shadowColor = 'rgba(96,255,168,0.9)'
  ctx.shadowBlur = size * 0.16
  ctx.fillStyle = paint
  ctx.fill()

  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(238,255,244,0.72)'
  ctx.lineWidth = size * 0.014
  ctx.beginPath()
  ctx.moveTo(0, size * 0.36)
  ctx.lineTo(0, -size * 0.36)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(232,255,242,0.4)'
  ctx.lineWidth = size * 0.008
  for (let i = 0; i < 4; i++) {
    const y = size * (0.24 - i * 0.15)
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.quadraticCurveTo(size * 0.12, y - size * 0.05, size * 0.2, y - size * 0.13)
    ctx.moveTo(0, y)
    ctx.quadraticCurveTo(-size * 0.12, y - size * 0.05, -size * 0.2, y - size * 0.13)
    ctx.stroke()
  }
  ctx.restore()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

interface FloatLeaf {
  angle: number
  radius: number
  orbit: number
  size: number
  spin: number
  tilt: number
  phase: number
  bob: number
}

interface Firefly {
  angle: number
  radius: number
  y: number
  lift: number
  drift: number
  phase: number
}

interface FallingLeaf {
  angle: number
  radius: number
  y: number
  fall: number
  sway: number
  phase: number
  size: number
}

interface RisingLeaf {
  angle: number
  radius: number
  y: number
  lift: number
  swirl: number
  life: number
  maxLife: number
  size: number
}

interface CrownBlob {
  mesh: THREE.Mesh
  base: number
  phase: number
  speed: number
}

export class LeafSea {
  readonly group = new THREE.Group()
  readonly center = { x: LEAF_SEA.x, z: LEAF_SEA.z }
  readonly radius = LEAF_SEA.radius

  private surface: THREE.Mesh<THREE.CircleGeometry, THREE.ShaderMaterial>
  private leaves: THREE.InstancedMesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  private floatLeaves: FloatLeaf[] = []
  private leafColor = new THREE.Color()

  private leafTex: THREE.CanvasTexture
  private moteTex: THREE.CanvasTexture
  private haloGeo: THREE.PlaneGeometry

  private fireflies: Firefly[] = []
  private fireflyPoints!: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  private fireflyPos!: Float32Array
  private fireflyCol!: Float32Array

  private falling: FallingLeaf[] = []
  private fallPoints!: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  private fallPos!: Float32Array
  private fallCol!: Float32Array

  private rising: RisingLeaf[] = []
  private risePoints!: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  private risePos!: Float32Array
  private riseCol!: Float32Array
  private riseCursor = 0
  private riseTimer = 0

  private tree = new THREE.Group()
  private crown: CrownBlob[] = []
  private halos: { mesh: THREE.Mesh; speed: number; base: number }[] = []
  private curtainMaterial!: THREE.ShaderMaterial
  private trunkLight: THREE.PointLight
  private crownLight: THREE.PointLight

  private beam = new THREE.Group()
  private beamMaterial!: THREE.ShaderMaterial
  private beamCore!: THREE.MeshBasicMaterial
  private beamHalo!: THREE.MeshBasicMaterial
  private beamT = 0
  private beamMax = 4.4

  private disposables: { dispose: () => void }[] = []
  private dummy = new THREE.Object3D()
  private rand = mulberry32(20261107)
  private time = 0

  constructor() {
    this.group.position.set(this.center.x, 0, this.center.z)

    this.leafTex = this.own(leafTexture(128))
    this.moteTex = this.own(softSprite(64))
    this.haloGeo = this.own(new THREE.PlaneGeometry(1, 1))
    this.haloGeo.rotateX(-Math.PI / 2)

    this.surface = this.buildSurface()
    this.leaves = this.buildFloatLeaves()
    this.floatingPoints = this.buildFireflies()
    this.fallPoints = this.buildFalling()
    this.risePoints = this.buildRising()

    this.curtainMaterial = this.own(
      new THREE.ShaderMaterial({
        vertexShader: curtainVertex,
        fragmentShader: curtainFragment,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 1 },
          uColor: { value: new THREE.Color('#b6ffd2') },
          uAccent: { value: new THREE.Color('#33e08c') },
        },
      }),
    )

    this.trunkLight = new THREE.PointLight('#7dffbe', 240, 210, 2)
    this.trunkLight.position.set(0, 16, 0)
    this.crownLight = new THREE.PointLight('#c2ffd9', 190, 220, 2)
    this.crownLight.position.set(0, TREE_HEIGHT * 0.82, 0)
    this.group.add(this.trunkLight, this.crownLight)

    this.buildTree()
    this.buildBeam()
    this.prime()
  }

  private floatingPoints!: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>

  private own<T extends { dispose: () => void }>(item: T): T {
    this.disposables.push(item)
    return item
  }

  /** 世界坐标是否落在叶海里 */
  contains(x: number, z: number) {
    return Math.hypot(x - this.center.x, z - this.center.z) <= this.radius
  }

  /** 叶海中央到某点的距离，用来把船轻轻挡在神树外圈 */
  distanceToHeart(x: number, z: number) {
    return Math.hypot(x - this.center.x, z - this.center.z)
  }

  /** 神树降灵：一道绿光落在船上 */
  bless(x: number, z: number) {
    this.beam.position.set(x - this.center.x, 0, z - this.center.z)
    this.beamT = this.beamMax
    this.beam.visible = true
    this.beamCore.opacity = 0
    this.beamHalo.opacity = 0
  }

  private surfaceHeight(x: number, z: number, time: number) {
    return celestialSurfaceHeight(x, z, time)
  }

  update(dt: number, time: number, boat: THREE.Vector3) {
    this.time = time
    this.surface.material.uniforms.uTime.value = time
    this.curtainMaterial.uniforms.uTime.value = time

    this.updateFloatLeaves(time)
    this.updateFireflies(dt, time)
    this.updateFalling(dt, time)
    this.updateRising(dt, time, boat)
    this.updateTree(time, dt)
    this.updateBeam(dt)
  }

  // ---------------------------------------------------------------- builders

  private buildSurface() {
    const geometry = this.own(new THREE.CircleGeometry(this.radius + 2, 144))
    geometry.rotateX(-Math.PI / 2)
    geometry.translate(0, SURFACE_LIFT, 0)
    const material = this.own(
      new THREE.ShaderMaterial({
        vertexShader: surfaceVertex,
        fragmentShader: surfaceFragment,
        transparent: true,
        uniforms: { uTime: { value: 0 } },
      }),
    )
    const mesh = new THREE.Mesh(geometry, material)
    mesh.frustumCulled = false
    mesh.renderOrder = 1
    this.group.add(mesh)
    return mesh
  }

  private buildFloatLeaves() {
    const geometry = this.own(new THREE.PlaneGeometry(1, 1))
    const material = this.own(
      new THREE.MeshBasicMaterial({
        map: this.leafTex,
        transparent: true,
        opacity: 0.94,
        depthWrite: false,
        side: THREE.DoubleSide,
        alphaTest: 0.02,
        fog: false,
      }),
    )
    const mesh = new THREE.InstancedMesh(geometry, material, LEAF_COUNT)
    mesh.frustumCulled = false
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.renderOrder = 3

    const palette = ['#8dffb8', '#5aec96', '#bdffd4', '#e0ffe9', '#3fdc86']
    for (let i = 0; i < LEAF_COUNT; i++) {
      const r = Math.sqrt(this.rand()) * (this.radius - 1.5)
      this.floatLeaves.push({
        angle: this.rand() * TAU,
        radius: r,
        orbit: (this.rand() - 0.5) * 0.05,
        size: 1.5 + this.rand() * 2.6,
        spin: (this.rand() - 0.5) * 0.7,
        tilt: (this.rand() - 0.5) * 0.4,
        phase: this.rand() * TAU,
        bob: 0.16 + this.rand() * 0.42,
      })
      this.leafColor.set(palette[Math.floor(this.rand() * palette.length)])
      mesh.setColorAt(i, this.leafColor)
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    this.group.add(mesh)
    return mesh
  }

  private buildFireflies() {
    this.fireflyPos = new Float32Array(FIREFLY_COUNT * 3)
    this.fireflyCol = new Float32Array(FIREFLY_COUNT * 3)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(this.fireflyPos, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(this.fireflyCol, 3))
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      this.fireflies.push({
        angle: this.rand() * TAU,
        radius: Math.sqrt(this.rand()) * (this.radius - 4),
        y: 0.8 + this.rand() * 15,
        lift: 0.28 + this.rand() * 0.75,
        drift: (this.rand() - 0.5) * 0.24,
        phase: this.rand() * TAU,
      })
    }
    const material = new THREE.PointsMaterial({
      map: this.moteTex,
      size: 1.1,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      sizeAttenuation: true,
      fog: false,
    })
    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false
    points.renderOrder = 4
    this.group.add(points)
    return points
  }

  private buildFalling() {
    this.fallPos = new Float32Array(FALL_COUNT * 3)
    this.fallCol = new Float32Array(FALL_COUNT * 3)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(this.fallPos, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(this.fallCol, 3))
    for (let i = 0; i < FALL_COUNT; i++) {
      this.falling.push({
        angle: this.rand() * TAU,
        radius: 6 + this.rand() * 30,
        y: 10 + this.rand() * 34,
        fall: 1.4 + this.rand() * 2.4,
        sway: 0.5 + this.rand() * 1.4,
        phase: this.rand() * TAU,
        size: 1.3 + this.rand() * 1.6,
      })
    }
    const material = new THREE.PointsMaterial({
      map: this.leafTex,
      size: 2.0,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      sizeAttenuation: true,
      fog: false,
    })
    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false
    points.renderOrder = 4
    this.group.add(points)
    return points
  }

  private buildRising() {
    this.risePos = new Float32Array(RISE_COUNT * 3)
    this.riseCol = new Float32Array(RISE_COUNT * 3)
    for (let i = 0; i < RISE_COUNT; i++) {
      this.risePos[i * 3 + 1] = -9999
      this.rising.push({
        angle: 0,
        radius: 0,
        y: -9999,
        lift: 0,
        swirl: 0,
        life: 0,
        maxLife: 1,
        size: 1,
      })
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(this.risePos, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(this.riseCol, 3))
    const material = new THREE.PointsMaterial({
      map: this.leafTex,
      size: 1.5,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      sizeAttenuation: true,
      fog: false,
    })
    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false
    points.renderOrder = 6
    this.group.add(points)
    return points
  }

  private buildTree() {
    const jade = this.own(
      new THREE.MeshStandardMaterial({
        color: '#3fd0aa',
        emissive: '#12684f',
        emissiveIntensity: 0.6,
        roughness: 0.32,
        metalness: 0.14,
        flatShading: true,
        fog: false,
      }),
    )
    const jadeDark = this.own(
      new THREE.MeshStandardMaterial({
        color: '#2aa687',
        emissive: '#0c4e3d',
        emissiveIntensity: 0.45,
        roughness: 0.4,
        metalness: 0.12,
        flatShading: true,
        fog: false,
      }),
    )

    // 树干：四段微微弯折的青玉，矮而粗，撑起一整片垂天之冠
    const segments = [
      { h: 10, top: 6.6, bottom: 9.6, x: 0, z: 0, tilt: 0.02 },
      { h: 10, top: 5, bottom: 6.6, x: 0.9, z: -0.4, tilt: -0.03 },
      { h: 8, top: 3.6, bottom: 5, x: 0.4, z: 0.9, tilt: 0.04 },
      { h: 6, top: 2.4, bottom: 3.6, x: -0.5, z: 0.4, tilt: -0.02 },
    ]
    let baseY = 0
    for (const seg of segments) {
      const mesh = new THREE.Mesh(
        this.own(new THREE.CylinderGeometry(seg.top, seg.bottom, seg.h, 10, 1)),
        jade,
      )
      mesh.position.set(seg.x, baseY + seg.h / 2, seg.z)
      mesh.rotation.set(seg.tilt, this.rand() * TAU, -seg.tilt * 0.7)
      this.tree.add(mesh)
      baseY += seg.h
    }

    // 盘根
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * TAU + this.rand() * 0.25
      const root = new THREE.Mesh(
        this.own(new THREE.CylinderGeometry(0.9 + this.rand() * 0.5, 3.1, 15, 7)),
        jadeDark,
      )
      root.position.set(Math.cos(angle) * 7.2, 2.4, Math.sin(angle) * 7.2)
      root.rotation.set(Math.PI / 2 - 0.32, 0, angle + Math.PI / 2)
      this.tree.add(root)
    }

    // 枝干：从树腰斜斜探向树冠，藏进叶团里
    const up = new THREE.Vector3(0, 1, 0)
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * TAU + 0.4
      const dir = new THREE.Vector3(
        Math.cos(angle) * 0.9,
        0.5,
        Math.sin(angle) * 0.9,
      ).normalize()
      const branch = new THREE.Mesh(
        this.own(new THREE.CylinderGeometry(0.55, 1.7, 18, 7)),
        jade,
      )
      const base = new THREE.Vector3(
        Math.cos(angle) * 5.5,
        26 + (i % 3) * 2,
        Math.sin(angle) * 5.5,
      )
      branch.quaternion.setFromUnitVectors(up, dir)
      branch.position.copy(base).addScaledVector(dir, 9)
      this.tree.add(branch)
    }

    const crownMat = this.own(
      new THREE.MeshStandardMaterial({
        color: '#52f59b',
        emissive: '#0fbf68',
        emissiveIntensity: 0.85,
        roughness: 0.25,
        flatShading: true,
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
        fog: false,
      }),
    )
    const sphereGeo = this.own(new THREE.SphereGeometry(1, 20, 14))

    const blobs = [
      { x: 0, y: 36, z: 0, s: 14.5 },
      { x: 19, y: 39, z: 7, s: 11.5 },
      { x: -18, y: 40, z: -5, s: 11 },
      { x: 8, y: 42, z: -14, s: 10 },
      { x: -8, y: 42, z: 13, s: 9.5 },
      { x: 26, y: 34, z: -12, s: 9 },
      { x: -25, y: 35, z: 12, s: 9.5 },
      { x: 12, y: 44, z: 4, s: 8 },
      { x: -6, y: 36, z: 22, s: 8.6 },
      { x: 22, y: 37, z: 20, s: 7.5 },
      { x: -2, y: 32, z: -22, s: 8 },
    ]
    for (const blob of blobs) {
      const mesh = new THREE.Mesh(sphereGeo, crownMat)
      mesh.position.set(blob.x, blob.y, blob.z)
      mesh.scale.setScalar(blob.s)
      mesh.renderOrder = 2
      this.tree.add(mesh)
      this.crown.push({
        mesh,
        base: blob.s,
        phase: this.rand() * TAU,
        speed: 0.35 + this.rand() * 0.4,
      })
    }

    // 树冠里透出的内光
    const glowTex = this.own(glowSprite(192))
    for (let i = 0; i < 3; i++) {
      const sprite = new THREE.Sprite(
        this.own(
          new THREE.SpriteMaterial({
            map: glowTex,
            color: i === 0 ? '#c9ffe0' : '#5bffa6',
            transparent: true,
            opacity: i === 0 ? 0.45 : 0.3,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            fog: false,
          }),
        ),
      )
      sprite.position.set((i - 1) * 7, 34 + i * 4, (i % 2) * 5 - 2.5)
      sprite.scale.setScalar(i === 0 ? 44 : 28)
      sprite.renderOrder = 3
      this.tree.add(sprite)
    }

    // 垂下的光幕
    const curtainOuter = new THREE.Mesh(
      this.own(new THREE.CylinderGeometry(24, 34, 26, 56, 1, true)),
      this.curtainMaterial,
    )
    curtainOuter.position.y = 14
    curtainOuter.renderOrder = 3
    const curtainInner = new THREE.Mesh(
      this.own(new THREE.CylinderGeometry(15, 26, 24, 40, 1, true)),
      this.curtainMaterial,
    )
    curtainInner.position.y = 16
    curtainInner.renderOrder = 3
    this.tree.add(curtainOuter, curtainInner)

    const ribbonGeo = this.own(new THREE.PlaneGeometry(3.4, 26))
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * TAU
      const ribbon = new THREE.Mesh(ribbonGeo, this.curtainMaterial)
      ribbon.position.set(Math.cos(angle) * 30, 14, Math.sin(angle) * 30)
      ribbon.rotation.y = angle + Math.PI / 2
      ribbon.renderOrder = 3
      this.tree.add(ribbon)
    }

    // 水面上的光轮
    const haloTex = this.own(haloRing(256))
    for (const spec of [
      { scale: 58, opacity: 0.6, speed: 0.06 },
      { scale: 34, opacity: 0.55, speed: -0.11 },
    ]) {
      const material = this.own(
        new THREE.MeshBasicMaterial({
          map: haloTex,
          color: '#8dffc0',
          transparent: true,
          opacity: spec.opacity,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          fog: false,
        }),
      )
      const halo = new THREE.Mesh(this.haloGeo, material)
      halo.position.y = SURFACE_LIFT + 0.55
      halo.scale.setScalar(spec.scale)
      halo.rotation.y = this.rand() * TAU
      halo.renderOrder = 3
      this.tree.add(halo)
      this.halos.push({ mesh: halo, speed: spec.speed, base: spec.opacity })
    }

    this.group.add(this.tree)
  }

  private buildBeam() {
    this.beamMaterial = this.own(
      new THREE.ShaderMaterial({
        vertexShader: curtainVertex,
        fragmentShader: curtainFragment,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0 },
          uColor: { value: '#ecfff2' },
          uAccent: { value: '#4bff9c' },
        },
      }),
    )
    this.beamCore = this.own(
      new THREE.MeshBasicMaterial({
        color: '#d6ffe4',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
      }),
    )
    this.beamHalo = this.own(
      new THREE.MeshBasicMaterial({
        map: this.own(haloRing(256)),
        color: '#8dffc0',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
      }),
    )

    const outer = new THREE.Mesh(
      this.own(new THREE.CylinderGeometry(4.6, 7, 52, 40, 1, true)),
      this.beamMaterial,
    )
    outer.position.y = 26
    const inner = new THREE.Mesh(
      this.own(new THREE.CylinderGeometry(1.5, 2.1, 50, 24, 1, true)),
      this.beamCore,
    )
    inner.position.y = 25
    const halo = new THREE.Mesh(this.haloGeo, this.beamHalo)
    halo.scale.setScalar(18)
    halo.position.y = SURFACE_LIFT + 0.75
    this.beam.add(outer, inner, halo)
    this.beam.visible = false
    this.group.add(this.beam)
  }

  // ----------------------------------------------------------------- updates

  private updateFloatLeaves(time: number) {
    const surface = this.surfaceHeight
    for (let i = 0; i < LEAF_COUNT; i++) {
      const leaf = this.floatLeaves[i]
      const angle = leaf.angle + time * leaf.orbit
      const x = Math.cos(angle) * leaf.radius
      const z = Math.sin(angle) * leaf.radius
      const y =
        surface(this.center.x + x, this.center.z + z, time) +
        SURFACE_LIFT +
        0.42 +
        Math.sin(time * 0.55 + leaf.phase) * leaf.bob
      this.dummy.position.set(x, y, z)
      this.dummy.rotation.set(
        -Math.PI / 2 + leaf.tilt + Math.sin(time * 0.7 + leaf.phase) * 0.12,
        leaf.phase + time * leaf.spin,
        Math.cos(time * 0.5 + leaf.phase) * 0.2,
      )
      this.dummy.scale.setScalar(leaf.size)
      this.dummy.updateMatrix()
      this.leaves.setMatrixAt(i, this.dummy.matrix)
    }
    this.leaves.instanceMatrix.needsUpdate = true
  }

  private updateFireflies(dt: number, time: number) {
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      const fly = this.fireflies[i]
      fly.y += fly.lift * dt
      fly.angle += fly.drift * dt
      if (fly.y > 19) fly.y = 0.9
      const x = Math.cos(fly.angle + Math.sin(time * 0.3 + fly.phase) * 0.2) * fly.radius
      const z = Math.sin(fly.angle + Math.sin(time * 0.3 + fly.phase) * 0.2) * fly.radius
      this.fireflyPos[i * 3] = x
      this.fireflyPos[i * 3 + 1] = fly.y
      this.fireflyPos[i * 3 + 2] = z
      const twinkle = 0.4 + 0.6 * Math.max(0, Math.sin(time * 1.35 + fly.phase * 3.1))
      this.fireflyCol[i * 3] = 0.46 * twinkle
      this.fireflyCol[i * 3 + 1] = 1 * twinkle
      this.fireflyCol[i * 3 + 2] = 0.66 * twinkle
    }
    this.floatingPoints.geometry.getAttribute('position').needsUpdate = true
    this.floatingPoints.geometry.getAttribute('color').needsUpdate = true
  }

  private updateFalling(dt: number, time: number) {
    for (let i = 0; i < FALL_COUNT; i++) {
      const leaf = this.falling[i]
      leaf.y -= leaf.fall * dt
      leaf.angle += leaf.sway * 0.08 * dt
      const sway = Math.sin(time * 0.8 + leaf.phase) * 1.4
      const x = Math.cos(leaf.angle) * leaf.radius + sway
      const z = Math.sin(leaf.angle) * leaf.radius
      const ground = this.surfaceHeight(this.center.x + x, this.center.z + z, time) + SURFACE_LIFT + 0.3
      if (leaf.y < ground - 0.4) {
        leaf.y = 34 + this.rand() * 12
        leaf.radius = 6 + this.rand() * 30
        leaf.angle = this.rand() * TAU
      }
      this.fallPos[i * 3] = x
      this.fallPos[i * 3 + 1] = leaf.y
      this.fallPos[i * 3 + 2] = z
      const fade = clamp(leaf.y / 24, 0.15, 1)
      this.fallCol[i * 3] = 0.5 * fade
      this.fallCol[i * 3 + 1] = 1 * fade
      this.fallCol[i * 3 + 2] = 0.68 * fade
    }
    this.fallPoints.geometry.getAttribute('position').needsUpdate = true
    this.fallPoints.geometry.getAttribute('color').needsUpdate = true
  }

  private updateRising(dt: number, time: number, boat: THREE.Vector3) {
    const inside = this.contains(boat.x, boat.z)
    if (inside) {
      this.riseTimer -= dt
      if (this.riseTimer <= 0) {
        this.riseTimer = 0.055
        const slot = this.rising[this.riseCursor]
        this.riseCursor = (this.riseCursor + 1) % RISE_COUNT
        const angle = this.rand() * TAU
        slot.angle = angle
        slot.radius = 1.6 + this.rand() * 2.8
        slot.y = this.surfaceHeight(boat.x, boat.z, time) + 0.25 + this.rand() * 0.5
        slot.lift = 1.3 + this.rand() * 2.2
        slot.swirl = 0.7 + this.rand() * 1.2
        slot.maxLife = 1.5 + this.rand() * 1.4
        slot.life = slot.maxLife
        slot.size = 0.8 + this.rand() * 0.8
      }
    }

    const bx = boat.x - this.center.x
    const bz = boat.z - this.center.z
    for (let i = 0; i < RISE_COUNT; i++) {
      const leaf = this.rising[i]
      if (leaf.life <= 0) {
        this.risePos[i * 3 + 1] = -9999
        this.riseCol[i * 3] = 0
        this.riseCol[i * 3 + 1] = 0
        this.riseCol[i * 3 + 2] = 0
        continue
      }
      leaf.life -= dt
      leaf.y += leaf.lift * dt
      leaf.angle += leaf.swirl * dt
      const wobble = Math.sin(time * 2 + i) * 0.24
      const radius = leaf.radius + Math.sin(time * 1.4 + i * 0.7) * 0.3
      this.risePos[i * 3] = bx + Math.cos(leaf.angle) * radius + wobble
      this.risePos[i * 3 + 1] = leaf.y
      this.risePos[i * 3 + 2] = bz + Math.sin(leaf.angle) * radius + wobble
      const k = clamp(leaf.life / leaf.maxLife, 0, 1)
      const glow = Math.sin(Math.min(1, (1 - k) * 2.2) * Math.PI * 0.5) * k
      this.riseCol[i * 3] = 0.55 * glow
      this.riseCol[i * 3 + 1] = 1 * glow
      this.riseCol[i * 3 + 2] = 0.72 * glow
      if (leaf.life <= 0) this.risePos[i * 3 + 1] = -9999
    }
    this.risePoints.geometry.getAttribute('position').needsUpdate = true
    this.risePoints.geometry.getAttribute('color').needsUpdate = true
  }

  private updateTree(time: number, dt: number) {
    for (let i = 0; i < this.crown.length; i++) {
      const blob = this.crown[i]
      blob.mesh.scale.setScalar(
        blob.base * (1 + Math.sin(time * blob.speed + blob.phase) * 0.045),
      )
      blob.mesh.rotation.y += dt * 0.05
    }
    for (const halo of this.halos) {
      halo.mesh.rotation.y += dt * halo.speed
      const material = halo.mesh.material as THREE.MeshBasicMaterial
      material.opacity = halo.base * (0.82 + 0.18 * Math.sin(time * 0.5 + halo.mesh.id))
    }
    this.curtainMaterial.uniforms.uTime.value = time
    this.trunkLight.intensity = 180 + Math.sin(time * 0.6) * 28
    this.crownLight.intensity = 130 + Math.sin(time * 0.9 + 1.4) * 24
  }

  private updateBeam(dt: number) {
    if (!this.beam.visible) return
    this.beamT = Math.max(0, this.beamT - dt)
    const k = this.beamT / this.beamMax
    // 起手 0.45 秒涨满，尾巴 1.2 秒慢慢化开
    const rise = Math.min(1, (1 - k) * 4.5)
    const fade = Math.min(1, k * 3.2)
    const power = rise * fade
    const pulse = 0.82 + 0.18 * Math.sin(this.time * 6.2)
    this.beamMaterial.uniforms.uIntensity.value = power * pulse * 2.2
    this.beamMaterial.uniforms.uTime.value = this.time
    this.beamCore.opacity = power * 0.72
    this.beamHalo.opacity = power * 0.9
    const halo = this.beam.children[2] as THREE.Mesh
    halo.scale.setScalar(18 + (1 - k) * 16)
    if (this.beamT <= 0) this.beam.visible = false
  }

  private prime() {
    this.updateFloatLeaves(0)
    this.updateFireflies(0, 0)
    this.updateFalling(0, 0)
    for (let i = 0; i < RISE_COUNT; i++) {
      this.risePos[i * 3 + 1] = -9999
    }
    this.risePoints.geometry.getAttribute('position').needsUpdate = true
  }

  dispose() {
    for (const item of this.disposables) item.dispose()
    this.disposables.length = 0
    this.group.removeFromParent()
  }
}

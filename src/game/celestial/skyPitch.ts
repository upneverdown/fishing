import * as THREE from 'three'
import { clamp, mulberry32 } from '@/game/utils/math'
import { glowSprite, haloRing, softSprite } from './celestialTextures'

const TAU = Math.PI * 2

/** 悬浮在叶海上的天界球场：白球场心在神树以南 */
export const SKY_PITCH = {
  x: 0,
  z: 84,
  halfW: 26,
  halfL: 38,
  deckY: 2.4,
  goalHalfWidth: 4.8,
  goalHeight: 4.9,
}

const BALL_RADIUS = 1
const GRAVITY = 26
const BOUNCE = 0.62
const WALL_BOUNCE = 0.58
const KICK_RANGE = 3.1
const KICK_COOLDOWN = 0.42
const PLAYER_RADIUS = 0.55
const GOAL_HOLD = 2.4
const CAMEO_CHANCE = 0.18
const CAMEO_COOLDOWN = 26
const FIREWORK_COUNT = 420

interface Burst {
  at: number
  x: number
  y: number
  z: number
  warm: boolean
}

function pitchTexture() {
  const w = 1024
  const h = 1504
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const rand = mulberry32(20261106)

  // 浅色仙木底色：一条条淡纹
  const base = ctx.createLinearGradient(0, 0, w, h)
  base.addColorStop(0, '#d3ebdb')
  base.addColorStop(0.5, '#e4f6ea')
  base.addColorStop(1, '#cbe6d6')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)
  const plank = h / 26
  for (let i = 0; i < 26; i++) {
    const y = i * plank
    ctx.fillStyle = i % 2 === 0 ? 'rgba(150,206,172,0.3)' : 'rgba(255,255,255,0.2)'
    ctx.fillRect(0, y, w, plank)
    ctx.strokeStyle = 'rgba(132,190,156,0.24)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
  for (let i = 0; i < 70; i++) {
    ctx.strokeStyle = `rgba(120,190,150,${0.04 + rand() * 0.05})`
    ctx.lineWidth = 1 + rand() * 1.6
    const x = rand() * w
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.bezierCurveTo(x + (rand() - 0.5) * 16, h * 0.33, x + (rand() - 0.5) * 16, h * 0.66, x, h)
    ctx.stroke()
  }

  // 白色边线与球场几何
  const line = 'rgba(255,255,255,0.94)'
  ctx.strokeStyle = line
  ctx.shadowColor = 'rgba(190,255,222,0.85)'
  ctx.shadowBlur = 14
  ctx.lineWidth = 9
  const pad = 54
  ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2)
  ctx.beginPath()
  ctx.moveTo(pad, h / 2)
  ctx.lineTo(w - pad, h / 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(w / 2, h / 2, 132, 0, TAU)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(w / 2, h / 2, 9, 0, TAU)
  ctx.fillStyle = line
  ctx.fill()

  // 两端禁区与小禁区
  const boxW = w * 0.62
  const boxD = h * 0.13
  const smallW = w * 0.34
  const smallD = h * 0.055
  ctx.strokeRect((w - boxW) / 2, pad, boxW, boxD)
  ctx.strokeRect((w - boxW) / 2, h - pad - boxD, boxW, boxD)
  ctx.strokeRect((w - smallW) / 2, pad, smallW, smallD)
  ctx.strokeRect((w - smallW) / 2, h - pad - smallD, smallW, smallD)

  // 角球弧
  ctx.beginPath()
  ctx.arc(pad, pad, 30, 0, Math.PI / 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(w - pad, pad, 30, Math.PI / 2, Math.PI)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(pad, h - pad, 30, -Math.PI / 2, 0)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(w - pad, h - pad, 30, Math.PI, Math.PI * 1.5)
  ctx.stroke()

  ctx.shadowBlur = 0
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function ballTexture() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const rand = mulberry32(8848)

  const base = ctx.createRadialGradient(size * 0.42, size * 0.34, size * 0.05, size * 0.5, size * 0.5, size * 0.62)
  base.addColorStop(0, '#ffffff')
  base.addColorStop(0.7, '#f2fff6')
  base.addColorStop(1, '#cdebd9')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)

  const patch = (cx: number, cy: number, r: number, rot: number) => {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rot)
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI / 2 + (i / 5) * TAU
      const x = Math.cos(angle) * r
      const y = Math.sin(angle) * r
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fillStyle = '#1a2b27'
    ctx.fill()
    ctx.restore()
  }

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const cx = (col + 0.5) * (size / 4) + (rand() - 0.5) * 26
      const cy = (row + 0.5) * (size / 4) + (rand() - 0.5) * 26
      patch(cx, cy, 34 + rand() * 10, rand() * TAU)
    }
  }
  patch(size * 0.08, size * 0.12, 44, 0.4)
  patch(size * 0.92, size * 0.8, 46, 1.2)

  ctx.globalCompositeOperation = 'screen'
  const glow = ctx.createRadialGradient(size * 0.5, size * 0.5, 0, size * 0.5, size * 0.5, size * 0.5)
  glow.addColorStop(0, 'rgba(120,255,190,0.18)')
  glow.addColorStop(1, 'rgba(120,255,190,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

export class SkyPitch {
  readonly group = new THREE.Group()
  readonly center = { x: SKY_PITCH.x, z: SKY_PITCH.z }
  readonly halfW = SKY_PITCH.halfW
  readonly halfL = SKY_PITCH.halfL
  readonly deckY = SKY_PITCH.deckY
  readonly ballRadius = BALL_RADIUS

  onFoot = false
  score = 0
  onGoal: ((score: number) => void) | null = null
  onCameo: (() => void) | null = null
  onPigKnock: (() => void) | null = null

  private rand = mulberry32(20261106)
  private time = 0

  private ball = new THREE.Group()
  private ballMesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>
  private ballAura = new THREE.Group()
  private ballRings: THREE.Mesh[] = []
  private ballShadow!: THREE.Mesh
  private ballGlow!: THREE.Sprite
  private ballLight!: THREE.PointLight

  private ballPos = new THREE.Vector3(0, SKY_PITCH.deckY + BALL_RADIUS, 0)
  private ballVel = new THREE.Vector3()
  private ballHold = 0
  private kickCd = 0

  private playerLocal = new THREE.Vector3(0, SKY_PITCH.deckY, SKY_PITCH.halfL - 6)
  private playerPush = new THREE.Vector2()
  private playerVel = new THREE.Vector2()

  private pig = new THREE.Group()
  private pigActive = false
  private pigDir = 1
  private pigX = 0
  private pigZ = 0
  private pigCooldown = 8
  private pigSpeed = 21

  private fireworks!: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  private fwPos!: Float32Array
  private fwCol!: Float32Array
  private fwVel!: Float32Array
  private fwLife!: Float32Array
  private fwMax!: Float32Array
  private fwCursor = 0
  private bursts: Burst[] = []

  private goalLights: THREE.PointLight[] = []
  private halo!: THREE.Mesh
  private auraSprites: THREE.Sprite[] = []
  private glowTex: THREE.CanvasTexture
  private moteTex: THREE.CanvasTexture
  private disposables: { dispose: () => void }[] = []

  constructor() {
    this.group.position.set(this.center.x, 0, this.center.z)

    this.glowTex = this.own(glowSprite(192))
    this.moteTex = this.own(softSprite(64))
    this.buildPlatform()
    this.buildFences()
    this.buildGoals()
    this.ballMesh = this.buildBall()
    this.fireworks = this.buildFireworks()
    this.buildPig()
    this.resetBall(0)
    this.update(0, 0)
  }

  private own<T extends { dispose: () => void }>(item: T): T {
    this.disposables.push(item)
    return item
  }

  // ------------------------------------------------------------------ 建造

  private buildPlatform() {
    const frameMat = this.own(
      new THREE.MeshStandardMaterial({
        color: '#d8f3e3',
        emissive: '#4fd79b',
        emissiveIntensity: 0.24,
        roughness: 0.42,
        metalness: 0.08,
        flatShading: true,
        fog: false,
      }),
    )
    const slab = new THREE.Mesh(
      this.own(new THREE.BoxGeometry(this.halfW * 2, 1.6, this.halfL * 2)),
      frameMat,
    )
    slab.position.y = this.deckY - 0.8
    slab.receiveShadow = true
    this.group.add(slab)

    // 侧沿的玉色包边
    const rimMat = this.own(
      new THREE.MeshStandardMaterial({
        color: '#9df3c6',
        emissive: '#2fbf7f',
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.16,
        flatShading: true,
        fog: false,
      }),
    )
    const rimGeoX = this.own(new THREE.BoxGeometry(this.halfW * 2 + 1.6, 0.5, 1.1))
    const rimGeoZ = this.own(new THREE.BoxGeometry(1.1, 0.5, this.halfL * 2 + 1.6))
    for (const z of [-this.halfL, this.halfL]) {
      const rim = new THREE.Mesh(rimGeoX, rimMat)
      rim.position.set(0, this.deckY - 0.32, z)
      this.group.add(rim)
    }
    for (const x of [-this.halfW, this.halfW]) {
      const rim = new THREE.Mesh(rimGeoZ, rimMat)
      rim.position.set(x, this.deckY - 0.32, 0)
      this.group.add(rim)
    }

    const texture = this.own(pitchTexture())
    const fieldMat = this.own(
      new THREE.MeshStandardMaterial({
        map: texture,
        color: '#bcd9c7',
        emissive: '#8ff0c4',
        emissiveMap: texture,
        emissiveIntensity: 0.16,
        roughness: 0.56,
        metalness: 0.04,
        fog: false,
      }),
    )
    const fieldGeo = this.own(new THREE.PlaneGeometry(this.halfW * 2, this.halfL * 2))
    fieldGeo.rotateX(-Math.PI / 2)
    const field = new THREE.Mesh(fieldGeo, fieldMat)
    field.position.y = this.deckY + 0.015
    field.receiveShadow = true
    this.group.add(field)

    // 悬空根须与托底光晕
    const rootMat = this.own(
      new THREE.MeshStandardMaterial({
        color: '#4fd9a4',
        emissive: '#167a56',
        emissiveIntensity: 0.5,
        roughness: 0.36,
        flatShading: true,
        fog: false,
      }),
    )
    const rootGeo = this.own(new THREE.CylinderGeometry(0.32, 1.9, 16, 6))
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * TAU
      const radius = 8 + this.rand() * 16
      const root = new THREE.Mesh(rootGeo, rootMat)
      root.position.set(
        Math.cos(angle) * radius,
        this.deckY - 7.6 - this.rand() * 1.4,
        Math.sin(angle) * radius * 1.25,
      )
      root.rotation.set(
        Math.cos(angle) * 0.28 + (this.rand() - 0.5) * 0.2,
        this.rand() * TAU,
        Math.sin(angle) * 0.28 + (this.rand() - 0.5) * 0.2,
      )
      this.group.add(root)
    }

    const ringTex = this.own(haloRing(256))
    const ringMat = this.own(
      new THREE.MeshBasicMaterial({
        map: ringTex,
        color: '#8dffc0',
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
      }),
    )
    const ringGeo = this.own(new THREE.PlaneGeometry(1, 1))
    ringGeo.rotateX(-Math.PI / 2)
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.scale.set(this.halfW * 3.4, this.halfL * 2.6, 1)
    ring.position.y = 0.9
    ring.renderOrder = 2
    this.group.add(ring)
    this.halo = ring
  }

  private vineBeam(ax: number, ay: number, az: number, bx: number, by: number, bz: number, radius: number, mat: THREE.Material) {
    const from = new THREE.Vector3(ax, ay, az)
    const to = new THREE.Vector3(bx, by, bz)
    const dir = to.clone().sub(from)
    const length = dir.length()
    const mesh = new THREE.Mesh(this.own(new THREE.CylinderGeometry(radius, radius, length, 6)), mat)
    mesh.position.copy(from).addScaledVector(dir, 0.5)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    return mesh
  }

  private buildFences() {
    const vineMat = this.own(
      new THREE.MeshStandardMaterial({
        color: '#3bdd8a',
        emissive: '#149a58',
        emissiveIntensity: 0.72,
        roughness: 0.4,
        flatShading: true,
        fog: false,
      }),
    )
    const leafMat = this.own(
      new THREE.MeshStandardMaterial({
        color: '#7dffb2',
        emissive: '#2bd47c',
        emissiveIntensity: 0.66,
        roughness: 0.5,
        flatShading: true,
        fog: false,
      }),
    )
    const postGeo = this.own(new THREE.CylinderGeometry(0.11, 0.16, 2.1, 6))
    const leafGeo = this.own(new THREE.SphereGeometry(0.34, 7, 5))
    const pad = 0.55
    const gapHalf = SKY_PITCH.goalHalfWidth + 1.4

    const addPost = (x: number, z: number) => {
      const post = new THREE.Mesh(postGeo, vineMat)
      post.position.set(x, this.deckY + 1.05, z)
      post.rotation.z = (this.rand() - 0.5) * 0.08
      this.group.add(post)
      const leaves = 2 + Math.floor(this.rand() * 2)
      for (let i = 0; i < leaves; i++) {
        const leaf = new THREE.Mesh(leafGeo, leafMat)
        leaf.position.set(
          x + (this.rand() - 0.5) * 0.5,
          this.deckY + 1.5 + this.rand() * 0.55,
          z + (this.rand() - 0.5) * 0.5,
        )
        leaf.scale.set(1 + this.rand() * 0.5, 0.7 + this.rand() * 0.4, 1 + this.rand() * 0.5)
        this.group.add(leaf)
      }
    }

    const runRail = (ax: number, az: number, bx: number, bz: number) => {
      this.group.add(this.vineBeam(ax, this.deckY + 1.95, az, bx, this.deckY + 1.95, bz, 0.055, vineMat))
      this.group.add(this.vineBeam(ax, this.deckY + 0.85, az, bx, this.deckY + 0.85, bz, 0.045, vineMat))
    }

    const steps = 10
    for (let side = -1; side <= 1; side += 2) {
      const x = side * (this.halfW - pad)
      let prevZ: number | null = null
      for (let i = 0; i <= steps; i++) {
        const z = -this.halfL + pad + (i / steps) * (this.halfL * 2 - pad * 2)
        addPost(x, z)
        if (prevZ !== null) runRail(x, prevZ, x, z)
        prevZ = z
      }
    }

    for (let side = -1; side <= 1; side += 2) {
      const z = side * (this.halfL - pad)
      const segments: [number, number][] = [
        [-this.halfW + pad, -gapHalf],
        [gapHalf, this.halfW - pad],
      ]
      for (const [from, to] of segments) {
        const count = Math.max(2, Math.round((to - from) / 5))
        let prevX: number | null = null
        for (let i = 0; i <= count; i++) {
          const x = from + (i / count) * (to - from)
          addPost(x, z)
          if (prevX !== null) runRail(prevX, z, x, z)
          prevX = x
        }
      }
    }
  }

  private buildGoals() {
    const branchMat = this.own(
      new THREE.MeshStandardMaterial({
        color: '#7ef2b4',
        emissive: '#28d183',
        emissiveIntensity: 1.05,
        roughness: 0.3,
        metalness: 0.08,
        flatShading: true,
        fog: false,
      }),
    )
    const netMat = this.own(
      new THREE.LineBasicMaterial({
        color: '#9dffc8',
        transparent: true,
        opacity: 0.46,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    )
    const half = SKY_PITCH.goalHalfWidth
    const height = SKY_PITCH.goalHeight

    for (const dir of [-1, 1]) {
      const goal = new THREE.Group()
      goal.position.set(0, 0, dir * this.halfL)
      this.group.add(goal)

      const postGeo = this.own(new THREE.CylinderGeometry(0.2, 0.3, height, 7))
      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(postGeo, branchMat)
        post.position.set(side * half, this.deckY + height / 2, 0)
        post.rotation.z = -side * 0.04
        goal.add(post)
        const back = this.vineBeam(
          side * half,
          this.deckY + height,
          0,
          side * (half + 1.4),
          this.deckY,
          dir * 3.4,
          0.16,
          branchMat,
        )
        goal.add(back)
        const strut = this.vineBeam(
          side * (half + 0.9),
          this.deckY,
          dir * 3.2,
          0,
          this.deckY + height * 0.96,
          0,
          0.14,
          branchMat,
        )
        goal.add(strut)
      }
      goal.add(
        this.vineBeam(-half, this.deckY + height, 0, half, this.deckY + height, 0, 0.2, branchMat),
      )
      // 横梁上再挑一根小枝，像仙树自己长出来的门
      goal.add(
        this.vineBeam(-half * 0.5, this.deckY + height + 0.1, 0, 0, this.deckY + height + 0.9, 0.3, 0.1, branchMat),
      )
      goal.add(
        this.vineBeam(half * 0.5, this.deckY + height + 0.1, 0, 0, this.deckY + height + 0.9, 0.3, 0.1, branchMat),
      )

      const points: number[] = []
      const depth = 3.4
      const cols = 10
      for (let i = 0; i <= cols; i++) {
        const x = -half + (i / cols) * half * 2
        points.push(x, this.deckY + height, 0, x, this.deckY, dir * depth)
      }
      for (let row = 0; row <= 4; row++) {
        const y = this.deckY + (row / 4) * height
        const z = dir * (row / 4) * depth
        points.push(-half, y, z, half, y, z)
      }
      for (const side of [-1, 1]) {
        for (let row = 0; row <= 3; row++) {
          const y = this.deckY + (row / 3) * height
          points.push(side * half, y, 0, side * half, y, dir * depth)
        }
      }
      const netGeo = this.own(new THREE.BufferGeometry())
      netGeo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
      const net = new THREE.LineSegments(netGeo, netMat)
      goal.add(net)

      const glow = new THREE.Sprite(
        this.own(
          new THREE.SpriteMaterial({
            map: this.glowTex,
            color: '#6dffb0',
            transparent: true,
            opacity: 0.42,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            fog: false,
          }),
        ),
      )
      glow.position.set(0, this.deckY + height * 0.55, 0)
      glow.scale.set(12, 8, 1)
      goal.add(glow)
      this.auraSprites.push(glow)

      const light = new THREE.PointLight('#6dffb0', 18, 32, 2)
      light.position.set(0, this.deckY + height * 0.6, 0)
      goal.add(light)
      this.goalLights.push(light)
    }
  }

  private buildBall() {
    const texture = this.own(ballTexture())
    const mat = this.own(
      new THREE.MeshStandardMaterial({
        map: texture,
        emissive: '#d7ffe9',
        emissiveIntensity: 0.22,
        roughness: 0.42,
        metalness: 0.06,
        fog: false,
      }),
    )
    const mesh = new THREE.Mesh(this.own(new THREE.SphereGeometry(BALL_RADIUS, 26, 20)), mat)
    mesh.castShadow = true
    this.ball.add(mesh)

    this.ballGlow = new THREE.Sprite(
      this.own(
        new THREE.SpriteMaterial({
          map: this.glowTex,
          color: '#5dffa8',
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          fog: false,
        }),
      ),
    )
    this.ballGlow.scale.set(5.6, 5.6, 1)
    this.ballAura.add(this.ballGlow)

    const ringMat = this.own(
      new THREE.MeshBasicMaterial({
        color: '#8bffc2',
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    )
    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(this.own(new THREE.TorusGeometry(BALL_RADIUS * 1.55, 0.045, 6, 44)), ringMat)
      ring.rotation.x = Math.PI / 2 + (i === 0 ? 0 : 0.7)
      ring.rotation.y = i === 0 ? 0 : 1.1
      this.ballAura.add(ring)
      this.ballRings.push(ring)
    }
    this.ball.add(this.ballAura)

    this.ballShadow = new THREE.Mesh(
      this.own(new THREE.CircleGeometry(BALL_RADIUS * 1.1, 24)),
      this.own(
        new THREE.MeshBasicMaterial({
          color: '#0a2f1f',
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
          fog: false,
        }),
      ),
    )
    this.ballShadow.rotation.x = -Math.PI / 2
    this.group.add(this.ballShadow)

    this.ballLight = new THREE.PointLight('#66ffae', 9, 15, 2)
    this.ball.add(this.ballLight)

    this.group.add(this.ball)
    return mesh
  }

  private buildFireworks() {
    this.fwPos = new Float32Array(FIREWORK_COUNT * 3)
    this.fwCol = new Float32Array(FIREWORK_COUNT * 3)
    this.fwVel = new Float32Array(FIREWORK_COUNT * 3)
    this.fwLife = new Float32Array(FIREWORK_COUNT)
    this.fwMax = new Float32Array(FIREWORK_COUNT)
    for (let i = 0; i < FIREWORK_COUNT; i++) this.fwPos[i * 3 + 1] = -9999
    const geo = this.own(new THREE.BufferGeometry())
    geo.setAttribute('position', new THREE.BufferAttribute(this.fwPos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(this.fwCol, 3))
    const mat = this.own(
      new THREE.PointsMaterial({
        map: this.moteTex,
        size: 1.7,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        sizeAttenuation: true,
        fog: false,
      }),
    )
    const points = new THREE.Points(geo, mat)
    points.frustumCulled = false
    points.renderOrder = 8
    this.group.add(points)
    return points
  }

  private buildPig() {
    const hide = this.own(
      new THREE.MeshStandardMaterial({
        color: '#7447c8',
        emissive: '#3a167d',
        emissiveIntensity: 0.55,
        roughness: 0.55,
        flatShading: true,
        fog: false,
      }),
    )
    const dark = this.own(
      new THREE.MeshStandardMaterial({
        color: '#3d2369',
        emissive: '#22084f',
        emissiveIntensity: 0.4,
        roughness: 0.6,
        flatShading: true,
        fog: false,
      }),
    )
    const tusk = this.own(
      new THREE.MeshStandardMaterial({
        color: '#fff2c8',
        emissive: '#b98a3c',
        emissiveIntensity: 0.35,
        roughness: 0.4,
        flatShading: true,
        fog: false,
      }),
    )

    const body = new THREE.Mesh(this.own(new THREE.SphereGeometry(1, 14, 10)), hide)
    body.scale.set(2.2, 1.7, 3)
    body.position.y = 2.1
    const head = new THREE.Mesh(this.own(new THREE.SphereGeometry(1.15, 12, 9)), hide)
    head.position.set(0, 2.35, 2.55)
    head.scale.set(1.05, 0.95, 1)
    const snout = new THREE.Mesh(this.own(new THREE.CylinderGeometry(0.62, 0.72, 0.55, 8)), dark)
    snout.rotation.x = Math.PI / 2
    snout.position.set(0, 2.15, 3.35)
    const eyeGeo = this.own(new THREE.SphereGeometry(0.14, 7, 5))
    const eyeMat = this.own(new THREE.MeshBasicMaterial({ color: '#ffdf6e', fog: false }))
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat)
      eye.position.set(side * 0.48, 2.65, 3.1)
      this.pig.add(eye)
      const ear = new THREE.Mesh(this.own(new THREE.ConeGeometry(0.34, 0.8, 5)), hide)
      ear.position.set(side * 0.75, 3.3, 2.4)
      ear.rotation.z = side * 0.5
      this.pig.add(ear)
      const tooth = new THREE.Mesh(this.own(new THREE.ConeGeometry(0.11, 0.7, 5)), tusk)
      tooth.position.set(side * 0.48, 1.95, 3.45)
      tooth.rotation.x = -0.35
      this.pig.add(tooth)
    }
    const legGeo = this.own(new THREE.CylinderGeometry(0.32, 0.26, 1.4, 6))
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const leg = new THREE.Mesh(legGeo, dark)
        leg.position.set(sx * 1.15, 0.72, sz * 1.6)
        this.pig.add(leg)
      }
    }
    const mane = new THREE.Mesh(this.own(new THREE.ConeGeometry(0.5, 1.1, 5)), dark)
    mane.position.set(0, 3.45, 0.2)
    mane.rotation.x = -0.3
    this.pig.add(body, head, snout, mane)

    const aura = new THREE.Sprite(
      this.own(
        new THREE.SpriteMaterial({
          map: this.glowTex,
          color: '#a05dff',
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          fog: false,
        }),
      ),
    )
    aura.scale.setScalar(10)
    aura.position.y = 2.2
    this.pig.add(aura)

    this.pig.visible = false
    this.group.add(this.pig)
  }

  // ------------------------------------------------------------------ 查询

  contains(x: number, z: number, margin = 0) {
    return (
      Math.abs(x - this.center.x) <= this.halfW + margin &&
      Math.abs(z - this.center.z) <= this.halfL + margin
    )
  }

  nearDock(x: number, z: number) {
    return this.contains(x, z, 11)
  }

  /** 下船落点：南侧中线，正对神树 */
  boardSpot(out = new THREE.Vector3()) {
    return out.set(this.center.x, this.deckY, this.center.z + this.halfL - 6)
  }

  placePlayer(x: number, z: number) {
    this.playerLocal.set(
      clamp(x - this.center.x, -this.halfW + 1, this.halfW - 1),
      this.deckY,
      clamp(z - this.center.z, -this.halfL + 1, this.halfL - 1),
    )
    this.playerVel.set(0, 0)
    this.playerPush.set(0, 0)
    this.onFoot = true
  }

  clearPlayer() {
    this.onFoot = false
    this.playerPush.set(0, 0)
  }

  playerWorld(out = new THREE.Vector3()) {
    return out.set(
      this.center.x + this.playerLocal.x,
      this.playerLocal.y,
      this.center.z + this.playerLocal.z,
    )
  }

  playerDistanceToBall() {
    return Math.hypot(this.playerLocal.x - this.ballPos.x, this.playerLocal.z - this.ballPos.z)
  }

  /** 屏幕方向移动：dx 右、dz 前（画面上方为 -z），相机固定朝北不跟着转 */
  movePlayer(dt: number, dx: number, dz: number, sprint: boolean) {
    const len = Math.hypot(dx, dz)
    const hasInput = len > 0.001
    const topSpeed = sprint ? 12 : 7.6
    const targetX = hasInput ? (dx / len) * topSpeed : 0
    const targetZ = hasInput ? (dz / len) * topSpeed : 0
    // 起步和刹车都留一点缓冲，人物不会一格一格地跳
    const accel = (hasInput ? 48 : 64) * dt
    this.playerVel.x += clamp(targetX - this.playerVel.x, -accel, accel)
    this.playerVel.y += clamp(targetZ - this.playerVel.y, -accel, accel)

    this.playerLocal.x += this.playerVel.x * dt
    this.playerLocal.z += this.playerVel.y * dt

    let pushed = false
    if (this.playerPush.lengthSq() > 0.0001) {
      this.playerLocal.x += this.playerPush.x
      this.playerLocal.z += this.playerPush.y
      this.playerPush.set(0, 0)
      pushed = true
    }

    const minX = -this.halfW + 0.9
    const maxX = this.halfW - 0.9
    const minZ = -this.halfL + 0.9
    const maxZ = this.halfL - 0.9
    if (this.playerLocal.x < minX || this.playerLocal.x > maxX) this.playerVel.x = 0
    if (this.playerLocal.z < minZ || this.playerLocal.z > maxZ) this.playerVel.y = 0
    this.playerLocal.x = clamp(this.playerLocal.x, minX, maxX)
    this.playerLocal.z = clamp(this.playerLocal.z, minZ, maxZ)
    this.playerLocal.y = this.deckY

    const speed = this.playerVel.length()

    // 贴身带球：人碰到球会轻轻把球顶开
    const dxBall = this.ballPos.x - this.playerLocal.x
    const dzBall = this.ballPos.z - this.playerLocal.z
    const distance = Math.hypot(dxBall, dzBall)
    const touch = BALL_RADIUS + PLAYER_RADIUS
    const ballLow = this.ballPos.y < this.deckY + BALL_RADIUS + 1.4
    if (distance < touch && this.ballHold <= 0 && ballLow) {
      const nx = distance > 0.001 ? dxBall / distance : 0
      const nz = distance > 0.001 ? dzBall / distance : -1
      // 只把人挤出重叠部分：球滚走时不能一路把人拖在身后
      const overlap = touch - distance
      this.playerLocal.x -= nx * overlap
      this.playerLocal.z -= nz * overlap
      const shove = 3.4 + (speed > 0.8 ? 2.2 : 0)
      this.ballVel.x = nx * shove
      this.ballVel.z = nz * shove
      this.ballPos.y = Math.max(this.ballPos.y, this.deckY + BALL_RADIUS + 0.02)
    }

    return { moving: hasInput || speed > 0.4, speed, input: hasInput, pushed }
  }

  kick(facing: number) {
    if (this.ballHold > 0 || this.kickCd > 0) return { kicked: false, cameo: false }
    if (this.playerDistanceToBall() > KICK_RANGE) return { kicked: false, cameo: false }
    this.kickCd = KICK_COOLDOWN

    const dx = this.ballPos.x - this.playerLocal.x
    const dz = this.ballPos.z - this.playerLocal.z
    const len = Math.hypot(dx, dz)
    let nx = len > 0.35 ? dx / len : -Math.sin(facing)
    let nz = len > 0.35 ? dz / len : -Math.cos(facing)
    // 朝向略微参与，让正对球门时更容易踢直
    const fx = -Math.sin(facing)
    const fz = -Math.cos(facing)
    nx = nx * 0.62 + fx * 0.38
    nz = nz * 0.62 + fz * 0.38
    const norm = Math.hypot(nx, nz) || 1
    const power = 26 + this.rand() * 3
    this.ballVel.set((nx / norm) * power, 6.8 + this.rand() * 1.4, (nz / norm) * power)
    this.ballPos.y = Math.max(this.ballPos.y, this.deckY + BALL_RADIUS + 0.06)

    let cameo = false
    if (!this.pigActive && this.pigCooldown <= 0 && Math.random() < CAMEO_CHANCE) {
      this.startCameo()
      cameo = true
    }
    return { kicked: true, cameo }
  }

  // ------------------------------------------------------------------ 玩法

  private startCameo() {
    this.pigActive = true
    this.pigCooldown = CAMEO_COOLDOWN
    this.pigDir = Math.random() < 0.5 ? 1 : -1
    this.pigX = -this.pigDir * (this.halfW + 7)
    this.pigZ = clamp(this.ballPos.z, -this.halfL + 5, this.halfL - 5)
    this.pigSpeed = 20 + this.rand() * 4
    this.pig.visible = true
    this.pig.scale.setScalar(0.6)
    this.pig.rotation.y = this.pigDir > 0 ? Math.PI / 2 : -Math.PI / 2
    this.onCameo?.()
  }

  private resetBall(drop = 0) {
    this.ballPos.set(0, this.deckY + BALL_RADIUS + drop, 0)
    this.ballVel.set(0, 0, 0)
    this.ballHold = 0
    this.ball.visible = true
  }

  private scoreGoal(side: -1 | 1) {
    this.score += 1
    this.ballHold = GOAL_HOLD
    this.ballVel.set(0, 0, 0)
    const z = side * (this.halfL + 4.2)
    const y = this.deckY + SKY_PITCH.goalHeight + 6
    const now = this.time
    for (let i = 0; i < 3; i++) {
      this.bursts.push({
        at: now + i * 0.33,
        x: (i - 1) * 6.5,
        y: y + (i === 1 ? 5.5 : 0),
        z: z + (this.rand() - 0.5) * 3,
        warm: i === 1,
      })
    }
    this.onGoal?.(this.score)
  }

  private fireBurst(burst: Burst) {
    const colors = burst.warm
      ? [
          [1, 0.86, 0.42],
          [1, 0.72, 0.3],
          [1, 0.96, 0.76],
        ]
      : [
          [0.52, 1, 0.72],
          [0.76, 1, 0.88],
          [0.4, 0.92, 1],
        ]
    for (let n = 0; n < 70; n++) {
      const i = this.fwCursor
      this.fwCursor = (this.fwCursor + 1) % FIREWORK_COUNT
      const theta = this.rand() * TAU
      const phi = Math.acos(this.rand() * 2 - 1)
      const speed = 5 + this.rand() * 10
      const sx = Math.sin(phi) * Math.cos(theta)
      const sy = Math.cos(phi)
      const sz = Math.sin(phi) * Math.sin(theta)
      this.fwPos[i * 3] = burst.x
      this.fwPos[i * 3 + 1] = burst.y
      this.fwPos[i * 3 + 2] = burst.z
      this.fwVel[i * 3] = sx * speed
      this.fwVel[i * 3 + 1] = sy * speed + 3
      this.fwVel[i * 3 + 2] = sz * speed
      const color = colors[Math.floor(this.rand() * colors.length)]
      this.fwCol[i * 3] = color[0]
      this.fwCol[i * 3 + 1] = color[1]
      this.fwCol[i * 3 + 2] = color[2]
      const life = 0.9 + this.rand() * 1.1
      this.fwLife[i] = life
      this.fwMax[i] = life
    }
  }

  private updateBall(dt: number) {
    if (this.ballHold > 0) {
      this.ballHold -= dt
      this.ballMesh.rotation.y += dt * 0.8
      if (this.ballHold <= 0) this.resetBall(7)
      return
    }

    const steps = 3
    const h = dt / steps
    for (let step = 0; step < steps; step++) {
      this.ballVel.y -= GRAVITY * h
      this.ballPos.addScaledVector(this.ballVel, h)

      if (this.ballPos.y - BALL_RADIUS < this.deckY) {
        this.ballPos.y = this.deckY + BALL_RADIUS
        if (this.ballVel.y < 0) this.ballVel.y = -this.ballVel.y * BOUNCE
        if (Math.abs(this.ballVel.y) < 1.2) this.ballVel.y = 0
        const friction = Math.exp(-1.55 * h)
        this.ballVel.x *= friction
        this.ballVel.z *= friction
      } else {
        this.ballVel.x *= Math.exp(-0.1 * h)
        this.ballVel.z *= Math.exp(-0.1 * h)
      }

      const limitX = this.halfW - BALL_RADIUS
      if (Math.abs(this.ballPos.x) > limitX) {
        this.ballPos.x = Math.sign(this.ballPos.x) * limitX
        this.ballVel.x *= -WALL_BOUNCE
        this.ballVel.z *= 0.94
      }

      const end = this.halfL - BALL_RADIUS
      const inMouth =
        Math.abs(this.ballPos.x) < SKY_PITCH.goalHalfWidth - 0.35 &&
        this.ballPos.y < this.deckY + SKY_PITCH.goalHeight - 0.4
      if (this.ballPos.z < -end) {
        if (inMouth) {
          // 球心压过门线就算进，避免弱射停在门里却不判
          if (this.ballPos.z < -this.halfL) {
            this.scoreGoal(-1)
            break
          }
        } else {
          this.ballPos.z = -end
          this.ballVel.z = Math.abs(this.ballVel.z) * WALL_BOUNCE
        }
      } else if (this.ballPos.z > end) {
        if (inMouth) {
          if (this.ballPos.z > this.halfL) {
            this.scoreGoal(1)
            break
          }
        } else {
          this.ballPos.z = end
          this.ballVel.z = -Math.abs(this.ballVel.z) * WALL_BOUNCE
        }
      }
    }

    // 滚动的手感：用速度反推旋转
    const speed = Math.hypot(this.ballVel.x, this.ballVel.z)
    if (speed > 0.01) {
      this.ballMesh.rotation.x += (this.ballVel.z / BALL_RADIUS) * dt
      this.ballMesh.rotation.z -= (this.ballVel.x / BALL_RADIUS) * dt
    }
    if (speed < 0.05 && this.ballVel.y === 0) {
      this.ballVel.x = 0
      this.ballVel.z = 0
    }
    this.ballMesh.rotation.y += dt * 0.1
  }

  private updatePig(dt: number) {
    if (this.pigCooldown > 0) this.pigCooldown -= dt
    if (!this.pigActive) return

    this.pigX += this.pigDir * this.pigSpeed * dt
    const chaseZ = clamp(this.ballPos.z, -this.halfL + 4, this.halfL - 4)
    this.pigZ += (chaseZ - this.pigZ) * Math.min(1, dt * 1.6)
    const grow = Math.min(1, this.pig.scale.x + dt * 3)
    this.pig.scale.setScalar(grow)
    this.pig.position.set(this.pigX, this.deckY + Math.abs(Math.sin(this.time * 8)) * 0.5, this.pigZ)
    this.pig.rotation.y = (this.pigDir > 0 ? Math.PI / 2 : -Math.PI / 2) + Math.sin(this.time * 9) * 0.06

    const dxBall = this.ballPos.x - this.pigX
    const dzBall = this.ballPos.z - this.pigZ
    if (this.ballHold <= 0 && Math.hypot(dxBall, dzBall) < 3.8) {
      this.ballVel.set(this.pigDir * 30, 11.5, (this.rand() - 0.5) * 9)
      this.ballPos.y = Math.max(this.ballPos.y, this.deckY + BALL_RADIUS + 0.4)
      this.onPigKnock?.()
    }

    if (this.onFoot) {
      const dx = this.playerLocal.x - this.pigX
      const dz = this.playerLocal.z - this.pigZ
      if (Math.hypot(dx, dz) < 3.2) {
        this.playerPush.x += this.pigDir * 3.2
        this.playerPush.y += dz > 0 ? 1.6 : -1.6
      }
    }

    if (Math.abs(this.pigX) > this.halfW + 9) {
      this.pigActive = false
      this.pig.visible = false
    }
  }

  private updateFireworks(dt: number) {
    for (const burst of this.bursts) {
      if (!burst.at || this.time < burst.at) continue
      burst.at = 0
      this.fireBurst(burst)
    }
    this.bursts = this.bursts.filter((b) => b.at > 0)

    for (let i = 0; i < FIREWORK_COUNT; i++) {
      if (this.fwLife[i] <= 0) continue
      this.fwLife[i] -= dt
      if (this.fwLife[i] <= 0) {
        this.fwPos[i * 3 + 1] = -9999
        this.fwCol[i * 3] = 0
        this.fwCol[i * 3 + 1] = 0
        this.fwCol[i * 3 + 2] = 0
        continue
      }
      const x = i * 3
      this.fwPos[x] += this.fwVel[x] * dt
      this.fwPos[x + 1] += this.fwVel[x + 1] * dt
      this.fwPos[x + 2] += this.fwVel[x + 2] * dt
      this.fwVel[x + 1] -= 6.2 * dt
      this.fwVel[x] *= Math.exp(-0.9 * dt)
      this.fwVel[x + 2] *= Math.exp(-0.9 * dt)
      const fade = Math.min(1, this.fwLife[i] / 0.55)
      this.fwCol[x] *= 0.997 * (0.9 + fade * 0.1)
      this.fwCol[x + 1] *= 0.997 * (0.9 + fade * 0.1)
      this.fwCol[x + 2] *= 0.997 * (0.9 + fade * 0.1)
    }
    this.fireworks.geometry.getAttribute('position').needsUpdate = true
    this.fireworks.geometry.getAttribute('color').needsUpdate = true
  }

  update(dt: number, time: number) {
    this.time = time
    this.kickCd = Math.max(0, this.kickCd - dt)
    this.updateBall(dt)
    this.updatePig(dt)
    this.updateFireworks(dt)

    const bob = this.ballHold > 0 ? Math.sin(time * 4) * 0.16 : 0
    this.ball.position.set(this.ballPos.x, this.ballPos.y + bob, this.ballPos.z)
    this.ballAura.rotation.y += dt * 1.6
    this.ballAura.rotation.z += dt * 0.9
    for (let i = 0; i < this.ballRings.length; i++) {
      this.ballRings[i].rotation.z += dt * (i === 0 ? 1.1 : -1.4)
    }
    this.ballGlow.material.opacity = 0.46 + Math.sin(time * 3.4) * 0.12
    this.ballLight.intensity = 7 + Math.sin(time * 3.1) * 2

    const air = Math.max(0, this.ballPos.y - (this.deckY + BALL_RADIUS))
    this.ballShadow.position.set(this.ballPos.x, this.deckY + 0.03, this.ballPos.z)
    const shrink = 1 / (1 + air * 0.12)
    this.ballShadow.scale.setScalar(shrink)
    ;(this.ballShadow.material as THREE.MeshBasicMaterial).opacity = 0.3 * shrink

    this.halo.rotation.y += dt * 0.03
    for (let i = 0; i < this.goalLights.length; i++) {
      this.goalLights[i].intensity = 14 + Math.sin(time * 2.1 + i * 1.7) * 4
    }
    for (let i = 0; i < this.auraSprites.length; i++) {
      this.auraSprites[i].material.opacity = 0.34 + Math.sin(time * 2.4 + i) * 0.1
    }
  }

  dispose() {
    for (const item of this.disposables) item.dispose()
    this.disposables.length = 0
    this.group.removeFromParent()
  }
}

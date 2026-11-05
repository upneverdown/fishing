import * as THREE from 'three'
import { audio } from '@/game/audio/gameAudio'
import { clamp } from '@/game/utils/math'
import { useGameStore } from '@/store/useGameStore'
import type { World } from '@/game/world/world'

export const PIG_NAME = '胖猪大王'
export const PIG_ID = 'pig'
/** 魔气震荡的间隔，狂暴阶段缩到七成 */
export const PIG_STOMP_INTERVAL = 10
/** 野蛮冲撞的间隔 */
export const PIG_CHARGE_INTERVAL = 9

/** 与船保持的距离：山一样的身子，再近就把船压在肚子底下了 */
const STANDOFF = 34
/** 冲撞前的锁定时间 */
const AIM_TIME = 1.3
/** 冲撞的时速与最大行程 */
const DASH_SPEED = 46
const DASH_REACH = 66
/** 践踏的起手时间 */
const STOMP_WINDUP = 0.9
/** 冲击波扫过的最大半径与用时 */
const SHOCK_RADIUS = 62
const SHOCK_LIFE = 2.4
/** 冲撞的擦身判定宽度 */
const CHARGE_WIDTH = 15
const SLAIN_TIME = 3.8
const MAX_RINGS = 10
const MIST = 30

const TAU = Math.PI * 2

function ringTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.52, 'rgba(255,255,255,0.16)')
  g.addColorStop(0.78, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.95, 'rgba(255,255,255,1)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function glowTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.7)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.2)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** 冲撞预警用的车道：一路朝前的紫色箭影，压着水铺在他与目标之间 */
function laneTexture() {
  const w = 128
  const h = 512
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(206,150,255,0.9)'
  ctx.shadowColor = '#8b3dff'
  ctx.shadowBlur = 18
  ctx.lineWidth = 9
  ctx.lineCap = 'round'
  for (let y = 26; y < h; y += 62) {
    ctx.beginPath()
    ctx.moveTo(18, y)
    ctx.lineTo(w / 2, y - 26)
    ctx.lineTo(w - 18, y)
    ctx.stroke()
  }
  ctx.shadowBlur = 0
  const fade = ctx.createLinearGradient(0, h, 0, 0)
  fade.addColorStop(0, 'rgba(0,0,0,0.92)')
  fade.addColorStop(0.55, 'rgba(0,0,0,0.5)')
  fade.addColorStop(1, 'rgba(0,0,0,0.1)')
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = fade
  ctx.fillRect(0, 0, w, h)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export type PigPhase = 'rushing' | 'fight' | 'slain'

export interface PigHud {
  phase: PigPhase
  hp: number
  maxHp: number
  enraged: boolean
  /** 距离下一次野蛮冲撞的秒数，负数表示正在锁定 */
  chargeIn: number
  charging: boolean
  /** 距离下一次魔气震荡的秒数 */
  stompIn: number
  stomping: boolean
}

export interface PigHooks {
  /** 血条见底：嚎一声往海里栽 */
  onDefeated: () => void
  /** 玩家按 E 收走浮出水面的獠牙 */
  onLoot: () => void
  /** 玩家此刻在半空中（起跳躲冲击波） */
  isAirborne: () => boolean
}

interface Mist {
  sprite: THREE.Sprite
  angle: number
  height: number
  radius: number
  speed: number
  wobble: number
}

interface Shock {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  origin: THREE.Vector3
  age: number
  judged: boolean
}

interface Leg {
  pivot: THREE.Group
  phase: number
}

/**
 * 第二位终极大 Boss「胖猪大王」：一座会跑的小山。
 * 黑紫粗皮 + 两根弯獠牙 + 猩红眼 + 一脊背骨刺 + 缠身魔气，
 * 只会两招——锁定直线冲撞、踏水放冲击波，靠 hooks 把掉落结算交回 Game。
 */
export class PigBoss {
  readonly group = new THREE.Group()

  private world: World
  private hooks: PigHooks
  private body = new THREE.Group()
  private head = new THREE.Group()
  private legs: Leg[] = []
  private mist: Mist[] = []
  private shocks: Shock[] = []
  private lane: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null
  private ring: THREE.CanvasTexture
  private glow: THREE.CanvasTexture
  private sheet: THREE.CanvasTexture
  /** 全场只挂一盏灯：那双猩红的眼 */
  private eyeLight = new THREE.PointLight('#ff2a18', 0, 150, 2)
  private eyeMat: THREE.MeshStandardMaterial
  private mistMat: THREE.SpriteMaterial

  private phase: PigPhase = 'rushing'
  private active = false
  private hp = 1
  private maxHp = 1
  private enraged = false
  private clock = 0
  private slainT = 0
  private chargeTimer = 0
  private stompTimer = 0
  private aimT = 0
  private dashT = 0
  private recoverT = 0
  private stompT = 0
  private mode: 'stalk' | 'aim' | 'dash' | 'recover' | 'stomp' = 'stalk'
  private chargeLanded = false
  private hudTimer = 0
  private stepTimer = 0
  private yaw = 0
  private spot = new THREE.Vector3()
  private dashDir = new THREE.Vector3()
  private aimPoint = new THREE.Vector3()
  private headWorld = new THREE.Vector3()
  private loot: THREE.Group | null = null
  private stray: THREE.Group | null = null

  /** Game 每帧取走并清零的镜头抖动请求 */
  shakeRequest = 0

  constructor(scene: THREE.Scene, world: World, hooks: PigHooks) {
    this.world = world
    this.hooks = hooks
    this.ring = ringTexture()
    this.glow = glowTexture()
    this.sheet = laneTexture()
    this.eyeMat = new THREE.MeshStandardMaterial({
      color: '#ff3a22',
      emissive: '#ff1a06',
      emissiveIntensity: 3.1,
      roughness: 0.35,
    })
    this.mistMat = new THREE.SpriteMaterial({
      map: this.glow,
      color: '#9a4dff',
      transparent: true,
      opacity: 0.42,
      blending: THREE.NormalBlending,
      depthWrite: false,
      fog: false,
    })
    this.eyeLight.castShadow = false
    this.group.add(this.eyeLight)
    scene.add(this.group)
    this.body.visible = false
    scene.add(this.body)
    this.buildFigure()
  }

  get isActive() {
    return this.active
  }

  get headPosition() {
    return this.headWorld
  }

  get bodyPosition() {
    return this.spot
  }

  get isEnraged() {
    return this.enraged
  }

  get bossHp() {
    return this.hp
  }

  // -------------------------------------------------------------- 建模

  private buildFigure() {
    const hide = new THREE.MeshStandardMaterial({
      color: '#1a1024',
      roughness: 0.98,
      metalness: 0.06,
      flatShading: true,
    })
    const hideDeep = new THREE.MeshStandardMaterial({
      color: '#0c0714',
      roughness: 1,
      flatShading: true,
    })
    const bristle = new THREE.MeshStandardMaterial({
      color: '#2a1638',
      roughness: 0.72,
      metalness: 0.24,
      flatShading: true,
    })
    const bone = new THREE.MeshStandardMaterial({
      color: '#e4dcc6',
      roughness: 0.42,
      metalness: 0.12,
      flatShading: true,
    })
    const spike = new THREE.MeshStandardMaterial({
      color: '#0a0710',
      roughness: 0.5,
      metalness: 0.42,
      flatShading: true,
    })

    // 躯干：一座横过来的小山
    const torso = new THREE.Mesh(new THREE.SphereGeometry(12, 14, 10), hide)
    torso.scale.set(1.34, 0.96, 1.16)
    torso.position.y = 13
    torso.castShadow = true
    this.body.add(torso)

    const belly = new THREE.Mesh(new THREE.SphereGeometry(10.4, 12, 9), hideDeep)
    belly.scale.set(1.3, 0.82, 1.1)
    belly.position.set(0, 10.4, 0.6)
    this.body.add(belly)

    const rump = new THREE.Mesh(new THREE.SphereGeometry(8.4, 12, 9), hide)
    rump.scale.set(1.1, 1, 0.86)
    rump.position.set(0, 13.4, -13.4)
    rump.castShadow = true
    this.body.add(rump)

    // 颈与头
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 7.6, 8.4, 9), hide)
    neck.position.set(0, 14.4, 11.4)
    neck.rotation.x = -0.62
    neck.castShadow = true
    this.body.add(neck)

    this.head.position.set(0, 15.6, 17.4)
    this.body.add(this.head)
    const skull = new THREE.Mesh(new THREE.SphereGeometry(6.6, 13, 10), hide)
    skull.scale.set(1.06, 0.94, 1.02)
    skull.castShadow = true
    this.head.add(skull)

    // 猪鼻：一截方墩加两个鼻孔
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.1, 4.2, 9), bristle)
    snout.rotation.x = Math.PI / 2
    snout.position.set(0, -1.1, 5.9)
    this.head.add(snout)
    for (const side of [-1, 1]) {
      const nare = new THREE.Mesh(new THREE.SphereGeometry(0.86, 8, 6), hideDeep)
      nare.position.set(side * 1.5, -1.1, 7.9)
      this.head.add(nare)
    }

    // 猩红双眼
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(1.32, 10, 8), this.eyeMat)
      eye.position.set(side * 2.9, 2.1, 5.2)
      this.head.add(eye)
      const halo = new THREE.Sprite(this.mistMat.clone() as THREE.SpriteMaterial)
      halo.material.color.set('#ff4a2a')
      halo.material.blending = THREE.AdditiveBlending
      halo.material.opacity = 0.42
      halo.scale.set(4.6, 4.6, 1)
      halo.position.set(side * 2.9, 2.1, 5.9)
      this.head.add(halo)
    }

    // 獠牙：每侧一根，五节首尾相接沿弧线翻上去
    for (const side of [-1, 1]) {
      const tusk = this.curveTusk(side, bone)
      tusk.position.set(side * 2.6, -4.4, 4.4)
      this.head.add(tusk)
    }

    // 耳朵
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(2.3, 9, 7), bristle)
      ear.scale.set(1.1, 0.42, 0.86)
      ear.position.set(side * 4.4, 5.1, -0.6)
      ear.rotation.z = side * 0.55
      this.head.add(ear)
    }

    // 一脊背骨刺
    for (let i = 0; i < 11; i++) {
      const k = i / 10
      const height = 2.4 + Math.sin(k * Math.PI) * 4.6
      const spine = new THREE.Mesh(new THREE.ConeGeometry(1.05 - k * 0.3, height, 5), spike)
      spine.position.set(0, 22.4 - Math.abs(k - 0.42) * 4.6, 13.6 - k * 29)
      spine.rotation.x = -0.34 + k * 0.5
      spine.castShadow = true
      this.body.add(spine)
    }

    // 四条腿：跑起来要腾动
    const hips: [number, number][] = [
      [7.4, 9],
      [-7.4, 9],
      [6.6, -11],
      [-6.6, -11],
    ]
    for (const [x, z] of hips) {
      const pivot = new THREE.Group()
      pivot.position.set(x, 12, z)
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2, 8.4, 7), hide)
      thigh.position.y = -4.2
      thigh.castShadow = true
      pivot.add(thigh)
      const hoof = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.5, 3.4), hideDeep)
      hoof.position.set(0, -8.8, 0.4)
      hoof.castShadow = true
      pivot.add(hoof)
      this.body.add(pivot)
      this.legs.push({ pivot, phase: z > 0 ? (x > 0 ? 0 : Math.PI) : x > 0 ? Math.PI : 0 })
    }

    // 缠身魔气
    for (let i = 0; i < MIST; i++) {
      const sprite = new THREE.Sprite(this.mistMat)
      sprite.scale.setScalar(9 + Math.random() * 9)
      sprite.renderOrder = 6
      this.body.add(sprite)
      this.mist.push({
        sprite,
        angle: Math.random() * TAU,
        height: 3 + Math.random() * 22,
        radius: 13 + Math.random() * 7,
        speed: 0.34 + Math.random() * 0.6,
        wobble: Math.random() * TAU,
      })
    }
  }

  /** 沿一条弧线串五节圆柱：根部粗、尖端细，最后往外上方翻出去 */
  private curveTusk(side: number, material: THREE.Material) {
    const group = new THREE.Group()
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 5; i++) {
      const k = i / 5
      pts.push(
        new THREE.Vector3(
          side * (0.5 + k * k * 3.1),
          k * 9.2 + k * k * 2.6,
          1.1 + k * 3.6 - k * k * 5.2,
        ),
      )
    }
    const up = new THREE.Vector3(0, 1, 0)
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      const len = a.distanceTo(b)
      const root = 1.34 - i * 0.21
      const piece = new THREE.Mesh(
        new THREE.CylinderGeometry(Math.max(0.1, root - 0.19), Math.max(0.06, root), len, 7),
        material,
      )
      piece.position.copy(a).add(b).multiplyScalar(0.5)
      piece.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize())
      piece.castShadow = true
      group.add(piece)
    }
    return group
  }

  // -------------------------------------------------------------- 召唤与生命周期

  /** 从远处一路狂奔过来 */
  summon(player: THREE.Vector3, maxHp: number) {
    if (this.active) return
    this.active = true
    this.phase = 'rushing'
    this.mode = 'stalk'
    this.hp = maxHp
    this.maxHp = maxHp
    this.enraged = false
    this.clock = 0
    this.slainT = 0
    this.chargeTimer = 4.2
    this.stompTimer = PIG_STOMP_INTERVAL
    this.aimT = 0
    this.dashT = 0
    this.recoverT = 0
    this.stompT = 0
    this.chargeLanded = false
    this.stepTimer = 0
    this.hudTimer = 0
    this.clearShocks()
    this.clearLane()
    this.clearLoot()

    // 从玩家面前任意一个方向的海平线上出现
    const angle = Math.random() * TAU
    this.spot.set(player.x + Math.sin(angle) * 132, 0, player.z + Math.cos(angle) * 132)
    this.yaw = Math.atan2(player.x - this.spot.x, player.z - this.spot.z)
    this.body.position.set(this.spot.x, this.world.waveHeight(this.spot.x, this.spot.z, 0), this.spot.z)
    this.body.rotation.set(0, this.yaw, 0)
    this.body.scale.setScalar(1)
    this.group.visible = true
    this.body.visible = true

    const store = useGameStore.getState()
    store.setInputLocked(true)
    store.setBoss({
      id: PIG_ID,
      name: PIG_NAME,
      hp: this.hp,
      maxHp: this.maxHp,
      phase: 1,
      skill: '狂奔而来',
      ultimate: true,
      realm: 4,
    })
    this.pushHud()
  }

  /** 玩家攻击的命中体积：够得着的永远是那颗探过来的头 */
  hitRay(origin: THREE.Vector3, dir: THREE.Vector3, range: number, damage: number) {
    if (!this.active || this.phase !== 'fight') return false
    const flat = new THREE.Vector3(dir.x, 0, dir.z)
    if (flat.lengthSq() < 0.0001) return false
    flat.normalize()
    const along = (this.headWorld.x - origin.x) * flat.x + (this.headWorld.z - origin.z) * flat.z
    if (along < -6 || along > range + 12) return false
    const lateral = Math.abs(
      (this.headWorld.z - origin.z) * flat.x - (this.headWorld.x - origin.x) * flat.z,
    )
    if (lateral > 13) return false
    this.hurt(damage)
    return true
  }

  /** 水弹、飞剑、火海这类落点型判定 */
  hitPoint(point: THREE.Vector3, radius: number, damage: number) {
    if (!this.active || this.phase !== 'fight') return false
    if (point.y > 34) return false
    const toHead = Math.hypot(point.x - this.headWorld.x, point.z - this.headWorld.z)
    const toBody = Math.hypot(point.x - this.spot.x, point.z - this.spot.z)
    if (toHead > radius + 11 && toBody > radius + 13.5) return false
    this.hurt(damage)
    return true
  }

  private hurt(amount: number) {
    if (this.phase !== 'fight') return
    this.hp = Math.max(0, this.hp - Math.max(0, Math.round(amount)))
    this.pushBossHud()
    this.pushHud()
    if (!this.enraged && this.hp / this.maxHp < 0.35) this.enterEnrage()
    if (this.hp <= 0) this.beginSlain()
  }

  private enterEnrage() {
    this.enraged = true
    this.chargeTimer = Math.min(this.chargeTimer, 2.4)
    this.stompTimer = Math.min(this.stompTimer, 3.2)
    this.world.setWaveBoost(2.2)
    const store = useGameStore.getState()
    store.toast('胖猪大王红了眼 · 冲撞与震荡都密了一半', 'danger')
    audio.thunder()
    this.shakeRequest = Math.max(this.shakeRequest, 1.9)
    this.mistMat.opacity = 0.62
    this.mistMat.color.set('#c247ff')
  }

  private beginSlain() {
    if (this.phase === 'slain') return
    this.phase = 'slain'
    this.slainT = SLAIN_TIME
    this.clearShocks()
    this.clearLane()
    const store = useGameStore.getState()
    store.setBoss(null)
    store.toast('胖猪大王嚎了一声 · 小山似的身子往海里栽', 'danger')
    audio.thunder()
    audio.splash(1)
    this.shakeRequest = Math.max(this.shakeRequest, 2.6)
    this.world.foam.splash(this.spot.x, this.spot.z, 26, 1.4)
    this.world.foam.ripple(this.spot.x, this.spot.z, 12)
    this.spawnLoot()
    this.hooks.onDefeated()
  }

  /** 血条见底后浮在水面上的那根獠牙 */
  private spawnLoot() {
    const group = new THREE.Group()
    const tuskMat = new THREE.MeshStandardMaterial({
      color: '#eae2cc',
      roughness: 0.36,
      metalness: 0.16,
      emissive: '#a05cff',
      emissiveIntensity: 0.32,
      flatShading: true,
    })
    for (let i = 0; i < 3; i++) {
      const piece = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62 - i * 0.16, 0.46 - i * 0.16, 1.9, 7),
        tuskMat,
      )
      piece.position.set(Math.sin(i * 0.8) * 0.62, 1.4 + i * 1.7, 0)
      piece.rotation.z = 0.24 + i * 0.2
      group.add(piece)
    }
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.09, 6, 24),
      new THREE.MeshBasicMaterial({
        color: '#c48aff',
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    )
    halo.rotation.x = Math.PI / 2
    halo.position.y = 0.4
    group.add(halo)
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 22),
      new THREE.MeshBasicMaterial({
        map: this.glow,
        color: '#b06cff',
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      }),
    )
    glow.rotation.x = -Math.PI / 2
    glow.position.y = 0.2
    group.add(glow)
    group.position.set(this.spot.x, 0, this.spot.z)
    this.group.add(group)
    this.loot = group
  }

  private clearLoot() {
    this.removeStray()
    if (this.loot) {
      this.disposeGroup(this.loot)
      this.loot.removeFromParent()
      this.loot = null
    }
  }

  /** 獠牙的拾取提示：靠近了才给 */
  lootPrompt(at: THREE.Vector3) {
    const loot = this.loot ?? this.stray
    if (!loot) return null
    const distance = Math.hypot(at.x - loot.position.x, at.z - loot.position.z)
    if (distance > 16) return null
    return { distance, name: '胖猪的獠牙' }
  }

  /** 身子沉下去了但獠牙还漂着 */
  get hasLoot() {
    return Boolean(this.loot || this.stray)
  }

  collectLoot() {
    if (this.loot) {
      this.disposeGroup(this.loot)
      this.loot.removeFromParent()
      this.loot = null
      this.hooks.onLoot()
      return true
    }
    if (this.stray) {
      this.removeStray()
      this.hooks.onLoot()
      return true
    }
    return false
  }

  private updateStray(dt: number, time: number) {
    if (!this.stray) return
    this.stray.position.y = this.world.waveHeight(this.stray.position.x, this.stray.position.z, time)
    this.stray.rotation.y += dt * 0.8
  }

  private removeStray() {
    if (!this.stray) return
    this.disposeGroup(this.stray)
    this.stray.removeFromParent()
    this.stray = null
  }

  private disposeGroup(node: THREE.Object3D) {
    node.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        const material = obj.material as THREE.Material | THREE.Material[]
        if (Array.isArray(material)) for (const m of material) m.dispose()
        else material.dispose()
      }
    })
  }

  /** 收场：魔气散尽，海面恢复 */
  despawn() {
    if (!this.active) return
    this.active = false
    this.body.visible = false
    this.eyeLight.intensity = 0
    this.clearShocks()
    this.clearLane()
    // 獠牙得留在海上等人来捡，不能跟着身子一起沉
    if (this.loot) {
      this.stray = this.loot
      this.loot = null
    }
    this.enraged = false
    this.world.setStorm(0)
    this.world.setWaveBoost(1)
    this.mistMat.opacity = 0.42
    this.mistMat.color.set('#9a4dff')
    const store = useGameStore.getState()
    store.setBoss(null)
    store.setPig(null)
  }

  // -------------------------------------------------------------- 每帧

  update(dt: number, time: number, player: THREE.Vector3) {
    if (!this.active) {
      this.updateStray(dt, time)
      return
    }

    const store = useGameStore.getState()
    this.clock += dt
    this.hudTimer -= dt
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.2
      this.pushHud()
      // 血条上那行招式名要跟着换，不能停在出场时的「狂奔而来」
      if (this.phase === 'fight') this.pushBossHud()
    }

    if (this.phase === 'rushing') {
      this.runEntrance(dt, time, player, store)
    } else if (this.phase === 'fight') {
      this.runCombat(dt, player, store)
    } else {
      this.slainT -= dt
      this.body.position.y -= dt * 14
      this.body.rotation.z += dt * 0.22
      this.body.scale.multiplyScalar(1 - dt * 0.1)
      this.eyeLight.intensity = Math.max(0, this.eyeLight.intensity - dt * 620)
      if (this.slainT <= 0) {
        this.despawn()
        return
      }
    }

    // 眼睛那盏灯始终跟着头走
    this.head.getWorldPosition(this.headWorld)
    if (this.phase !== 'slain') {
      // 灯架在鼻尖前方：把猩红泼在船前的浪上，而不是把整张脸糊成一片粉
      this.eyeLight.position.set(
        this.headWorld.x + Math.sin(this.yaw) * 13,
        this.headWorld.y + 2.2,
        this.headWorld.z + Math.cos(this.yaw) * 13,
      )
      const glare = this.phase === 'rushing' ? 340 : 250 + Math.sin(time * 3.1) * 46
      this.eyeLight.intensity = glare * (this.enraged ? 1.4 : 1)
      this.eyeMat.emissiveIntensity = this.enraged ? 3.1 : 2.2
    } else {
      this.eyeLight.position.copy(this.headWorld)
    }

    // 魔气绕身
    for (const puff of this.mist) {
      puff.angle += dt * puff.speed * (this.enraged ? 1.8 : 1)
      puff.sprite.position.set(
        Math.cos(puff.angle) * puff.radius,
        puff.height + Math.sin(time * 1.1 + puff.wobble) * 2.2,
        Math.sin(puff.angle) * puff.radius,
      )
      puff.sprite.material.opacity = 0.24 + Math.abs(Math.sin(time * 1.6 + puff.wobble)) * 0.3
    }

    this.updateShocks(dt, player, store)
    if (this.loot) {
      this.loot.position.y = this.world.waveHeight(this.loot.position.x, this.loot.position.z, time)
      this.loot.rotation.y += dt * 0.8
    }
  }

  /** 狂奔入场：一路踩出水花，每一步都在震屏幕 */
  private runEntrance(dt: number, time: number, player: THREE.Vector3, store: ReturnType<typeof useGameStore.getState>) {
    const toPlayer = new THREE.Vector3(player.x - this.spot.x, 0, player.z - this.spot.z)
    const distance = toPlayer.length()
    const wanted = Math.atan2(toPlayer.x, toPlayer.z)
    let delta = wanted - this.yaw
    while (delta > Math.PI) delta -= TAU
    while (delta < -Math.PI) delta += TAU
    this.yaw += delta * Math.min(1, dt * 1.6)

    const speed = Math.min(30, 18 + this.clock * 3.4)
    if (distance > STANDOFF + 4) {
      this.spot.x += Math.sin(this.yaw) * speed * dt
      this.spot.z += Math.cos(this.yaw) * speed * dt
    }

    this.body.position.set(
      this.spot.x,
      this.world.waveHeight(this.spot.x, this.spot.z, time) + Math.abs(Math.sin(this.clock * 6.4)) * 1.5,
      this.spot.z,
    )
    this.body.rotation.set(Math.sin(this.clock * 6.4) * 0.05, this.yaw, Math.sin(this.clock * 3.2) * 0.04)
    this.gallop(this.clock * 6.4)

    this.world.setStorm(0.55)
    this.world.setWaveBoost(1.6)

    // 沉重的脚步：每一步一次轻震 + 一片水花
    this.stepTimer -= dt
    if (this.stepTimer <= 0) {
      this.stepTimer = 0.4
      this.shakeRequest = Math.max(this.shakeRequest, 0.5)
      audio.splash(0.7)
      this.world.foam.splash(this.spot.x, this.spot.z, 14, 0.9)
      this.world.foam.ripple(this.spot.x, this.spot.z, 7)
    }

    if (distance <= STANDOFF + 5 || this.clock > 9) {
      this.phase = 'fight'
      this.mode = 'stalk'
      this.chargeTimer = 3.4
      this.stompTimer = 5.2
      store.setInputLocked(false)
      store.toast('胖猪大王踩住海面 · 别站在他正前方', 'danger')
      this.shakeRequest = Math.max(this.shakeRequest, 1.6)
    }
  }

  private runCombat(dt: number, player: THREE.Vector3, store: ReturnType<typeof useGameStore.getState>) {
    const toPlayer = new THREE.Vector3(player.x - this.spot.x, 0, player.z - this.spot.z)
    const wanted = Math.atan2(toPlayer.x, toPlayer.z)
    let delta = wanted - this.yaw
    while (delta > Math.PI) delta -= TAU
    while (delta < -Math.PI) delta += TAU

    if (this.mode === 'stalk') {
      // 绕着玩家挪，始终留够近战距离
      const hold = new THREE.Vector3(
        player.x - Math.sin(wanted) * STANDOFF,
        0,
        player.z - Math.cos(wanted) * STANDOFF,
      )
      const pull = Math.min(1, dt * 1.15)
      this.spot.x += (hold.x - this.spot.x) * pull
      this.spot.z += (hold.z - this.spot.z) * pull
      this.yaw += delta * Math.min(1, dt * 2.4)
      this.body.position.set(
        this.spot.x,
        this.world.waveHeight(this.spot.x, this.spot.z, this.clock) + Math.sin(this.clock * 1.5) * 0.5,
        this.spot.z,
      )
      this.body.rotation.set(0, this.yaw, Math.sin(this.clock * 0.8) * 0.02)
      this.gallop(this.clock * 1.6)

      this.chargeTimer -= dt
      this.stompTimer -= dt
      // 刚撞完他可能正贴在船边，那样环一出生就糊在脸上——等他退开再踩
      if (this.stompTimer <= 0 && toPlayer.length() >= 27) {
        this.mode = 'stomp'
        this.stompT = STOMP_WINDUP
        store.toast('胖猪大王抬起前蹄 · 魔气震荡要落在水面上', 'danger')
      } else if (this.chargeTimer <= 0) {
        this.mode = 'aim'
        this.aimT = AIM_TIME
        this.chargeLanded = false
        // 预判一点：往玩家将要到的位置撞
        this.aimPoint.set(player.x + toPlayer.x * 0.06, 0, player.z + toPlayer.z * 0.06)
        this.showLane()
        store.toast('胖猪大王刨地 · 野蛮冲撞锁定了你', 'danger')
        this.shakeRequest = Math.max(this.shakeRequest, 0.7)
      }
    } else if (this.mode === 'aim') {
      this.aimT -= dt
      this.yaw += delta * Math.min(1, dt * 3.6)
      this.body.rotation.set(-0.16, this.yaw, 0)
      this.gallop(this.clock * 13)
      this.pulseLane(0.4 + (1 - this.aimT / AIM_TIME) * 0.6)
      this.shakeRequest = Math.max(this.shakeRequest, 0.12)
      if (this.aimT <= 0) {
        this.mode = 'dash'
        this.dashT = DASH_REACH / DASH_SPEED
        const dir = new THREE.Vector3(this.aimPoint.x - this.spot.x, 0, this.aimPoint.z - this.spot.z)
        if (dir.lengthSq() < 0.01) dir.set(Math.sin(this.yaw), 0, Math.cos(this.yaw))
        this.dashDir.copy(dir.normalize())
        this.yaw = Math.atan2(this.dashDir.x, this.dashDir.z)
        audio.thunder()
        this.shakeRequest = Math.max(this.shakeRequest, 1.2)
      }
    } else if (this.mode === 'dash') {
      this.dashT -= dt
      const step = DASH_SPEED * dt
      this.spot.x += this.dashDir.x * step
      this.spot.z += this.dashDir.z * step
      this.body.position.set(
        this.spot.x,
        this.world.waveHeight(this.spot.x, this.spot.z, this.clock) + 0.6,
        this.spot.z,
      )
      this.body.rotation.set(0.2, this.yaw, 0)
      this.gallop(this.clock * 22)
      this.pulseLane(0.85)
      this.world.foam.splash(this.spot.x, this.spot.z, 16, 1.1)
      this.shakeRequest = Math.max(this.shakeRequest, 0.34)

      if (!this.chargeLanded) {
        const ahead = new THREE.Vector3(
          this.spot.x + this.dashDir.x * 9,
          0,
          this.spot.z + this.dashDir.z * 9,
        )
        if (Math.hypot(player.x - ahead.x, player.z - ahead.z) < CHARGE_WIDTH) {
          this.chargeLanded = true
          this.onChargeHit(player, store)
        }
      }
      if (this.dashT <= 0) {
        this.mode = 'recover'
        this.recoverT = 1.2
        this.clearLane()
      }
    } else if (this.mode === 'recover') {
      this.recoverT -= dt
      this.body.rotation.set(0, this.yaw, Math.sin(this.recoverT * 9) * 0.05)
      this.gallop(this.clock * 2)
      if (this.recoverT <= 0) {
        this.mode = 'stalk'
        this.chargeTimer = this.enraged ? PIG_CHARGE_INTERVAL * 0.62 : PIG_CHARGE_INTERVAL
      }
    } else {
      // stomp：抬蹄蓄力，落地放环
      this.stompT -= dt
      this.body.rotation.set(0.1, this.yaw, 0)
      this.gallop(this.clock * 4)
      if (this.stompT <= 0) {
        this.releaseShock(this.enraged ? 2 : 1)
        this.stompTimer = this.enraged ? PIG_STOMP_INTERVAL * 0.7 : PIG_STOMP_INTERVAL
        this.mode = 'stalk'
      }
    }

    this.head.getWorldPosition(this.headWorld)
  }

  /** 撞上来了 */
  private onChargeHit(player: THREE.Vector3, store: ReturnType<typeof useGameStore.getState>) {
    if (store.underwater) {
      store.toast('从他蹄下漏过去了 · 潜得漂亮', 'gold')
      return
    }
    store.damagePlayer(this.enraged ? 82 : 66, '野蛮冲撞', 'physical')
    this.shakeRequest = Math.max(this.shakeRequest, 2.8)
    this.world.foam.splash(player.x, player.z, 20, 1.3)
    audio.thunder()
  }

  /** 践踏：一圈（狂暴两圈）往外推的紫色冲击波 */
  private releaseShock(count: number) {
    const store = useGameStore.getState()
    audio.thunder()
    audio.splash(1)
    this.shakeRequest = Math.max(this.shakeRequest, 1.7)
    this.world.foam.splash(this.spot.x, this.spot.z, 22, 1.2)
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(SHOCK_RADIUS * 2, SHOCK_RADIUS * 2),
        new THREE.MeshBasicMaterial({
          map: this.ring,
          color: i === 0 ? '#b46cff' : '#7d38e0',
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          fog: false,
        }),
      )
      mesh.rotation.x = -Math.PI / 2
      mesh.position.set(this.spot.x, this.world.waveHeight(this.spot.x, this.spot.z, this.clock) + 0.6, this.spot.z)
      mesh.scale.setScalar(0.06)
      mesh.renderOrder = 6
      this.group.add(mesh)
      this.shocks.push({
        mesh,
        origin: new THREE.Vector3(this.spot.x, 0, this.spot.z),
        age: -i * 0.34,
        judged: false,
      })
    }
    store.toast('魔气震荡炸开 · 空格起跳或潜下去', 'danger')
  }

  private updateShocks(dt: number, player: THREE.Vector3, store: ReturnType<typeof useGameStore.getState>) {
    for (let i = this.shocks.length - 1; i >= 0; i--) {
      const shock = this.shocks[i]
      shock.age += dt
      if (shock.age < 0) continue
      const k = clamp(shock.age / SHOCK_LIFE, 0, 1)
      if (k >= 1) {
        this.disposeShock(shock)
        this.shocks.splice(i, 1)
        continue
      }
      const radius = 0.3 + k * 0.82
      shock.mesh.scale.setScalar(radius)
      // 一路推过来都得看得见，只在尾巴上收
      shock.mesh.material.opacity = 0.98 * (1 - k * k * 0.66)
      shock.mesh.position.y =
        this.world.waveHeight(shock.origin.x, shock.origin.z, this.clock) + 0.6 + k * 1.4

      if (!shock.judged) {
        const reached = radius * SHOCK_RADIUS
        const distance = Math.hypot(player.x - shock.origin.x, player.z - shock.origin.z)
        if (reached >= distance) {
          shock.judged = true
          const airborne = this.hooks.isAirborne()
          const dived = store.underwater && store.depth > 1.6
          if (airborne || dived) {
            store.toast(airborne ? '从魔气上头跳了过去' : '潜进浪底 · 震荡从头顶推开', 'gold')
          } else {
            store.damagePlayer(this.enraged ? 42 : 34, '魔气震荡', 'physical')
            this.shakeRequest = Math.max(this.shakeRequest, 1.5)
          }
        }
      }
    }
  }

  private disposeShock(shock: Shock) {
    shock.mesh.removeFromParent()
    shock.mesh.geometry.dispose()
    shock.mesh.material.dispose()
  }

  private clearShocks() {
    for (const shock of this.shocks) this.disposeShock(shock)
    this.shocks = []
  }

  /** 冲撞车道：贴在水面上的一条紫色箭影，指着他要撞过去的方向 */
  private showLane() {
    this.clearLane()
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(24, DASH_REACH),
      new THREE.MeshBasicMaterial({
        map: this.sheet,
        color: '#c48aff',
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      }),
    )
    mesh.rotation.x = -Math.PI / 2
    mesh.renderOrder = 5
    this.group.add(mesh)
    this.lane = mesh
  }

  private pulseLane(strength: number) {
    if (!this.lane) return
    const mid = new THREE.Vector3(
      (this.spot.x + this.aimPoint.x) / 2,
      0,
      (this.spot.z + this.aimPoint.z) / 2,
    )
    this.lane.position.set(
      mid.x,
      this.world.waveHeight(mid.x, mid.z, this.clock) + 0.5,
      mid.z,
    )
    this.lane.rotation.z = -Math.atan2(this.aimPoint.x - this.spot.x, this.aimPoint.z - this.spot.z) + Math.PI
    this.lane.scale.set(1, Math.max(0.05, 1 - this.aimT / AIM_TIME), 1)
    this.lane.material.opacity = 0.35 + strength * 0.55
  }

  private clearLane() {
    if (this.lane) {
      this.lane.removeFromParent()
      this.lane.geometry.dispose()
      this.lane.material.dispose()
      this.lane = null
    }
  }

  /** 四腿交替：跑起来是一串正弦，站着只是喘气 */
  private gallop(phase: number) {
    for (const leg of this.legs) {
      leg.pivot.rotation.x = Math.sin(phase + leg.phase) * 0.62
    }
  }

  private pushHud() {
    const store = useGameStore.getState()
    if (!this.active) {
      store.setPig(null)
      return
    }
    const charging = this.mode === 'aim' || this.mode === 'dash'
    store.setPig({
      phase: this.phase,
      hp: this.hp,
      maxHp: this.maxHp,
      enraged: this.enraged,
      chargeIn: charging ? -this.aimT : this.mode === 'recover' ? 0 : this.chargeTimer,
      charging,
      stompIn: this.mode === 'stomp' ? -this.stompT : this.stompTimer,
      stomping: this.mode === 'stomp' || this.shocks.length > 0,
    })
  }

  private pushBossHud() {
    const store = useGameStore.getState()
    store.setBoss({
      id: PIG_ID,
      name: PIG_NAME,
      hp: this.hp,
      maxHp: this.maxHp,
      phase: this.enraged ? 2 : 1,
      skill:
        this.mode === 'aim' || this.mode === 'dash'
          ? '野蛮冲撞'
          : this.mode === 'stomp' || this.shocks.length > 0
            ? '魔气震荡'
            : '獠牙压场',
      ultimate: true,
      realm: 4,
    })
  }

  dispose() {
    this.clearShocks()
    this.clearLane()
    this.clearLoot()
    for (const puff of this.mist) puff.sprite.material.dispose()
    this.mist = []
    this.legs = []
    this.disposeGroup(this.body)
    this.ring.dispose()
    this.glow.dispose()
    this.sheet.dispose()
    this.eyeMat.dispose()
    this.mistMat.dispose()
    this.group.removeFromParent()
    this.body.removeFromParent()
  }
}

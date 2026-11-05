import * as THREE from 'three'
import { audio } from '@/game/audio/gameAudio'
import { clamp } from '@/game/utils/math'
import { useGameStore } from '@/store/useGameStore'
import type { World } from '@/game/world/world'

export const HUANG_NAME = '黄达鑫'
export const HUANG_ID = 'huang'
/** 灭世雷暴的间隔，狂暴阶段减半 */
export const HUANG_DOOM_INTERVAL = 30
/** 天罚雷柱的落点判定半径 */
const BOLT_RADIUS = 5.6
/** 雷柱预警时长：抬手 → 红光落地 */
const WARN_TIME = 0.9
/** 巨影与船保持的水平距离，近战够得着、又不至于压沉船 */
const STANDOFF = 12.5
const RISE_TIME = 6.4
const SLAIN_TIME = 3.4
const MAX_BOLTS = 18
const MAX_RINGS = 22
const SAFE_ZONES = 3
const SAFE_RADIUS = 7.2
const WRIST_ARCS = 12

const TAU = Math.PI * 2

function boltTexture() {
  const w = 128
  const h = 512
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, w, h)
  ctx.strokeStyle = '#ffd0c4'
  ctx.shadowColor = '#ff2f1c'
  ctx.shadowBlur = 26
  ctx.lineWidth = 12
  ctx.lineJoin = 'round'
  ctx.beginPath()
  let x = w / 2
  ctx.moveTo(x, 6)
  for (let y = 30; y <= h - 6; y += 30) {
    x += (Math.random() - 0.5) * 78
    x = Math.max(10, Math.min(w - 10, x))
    ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.shadowBlur = 5
  ctx.lineWidth = 3.4
  ctx.strokeStyle = '#ffffff'
  ctx.stroke()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function ringTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.34, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.66, 'rgba(255,255,255,0.28)')
  g.addColorStop(0.9, 'rgba(255,255,255,0.95)')
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
  g.addColorStop(0, 'rgba(255,255,255,0.72)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.22)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export type HuangPhase = 'rising' | 'fight' | 'slain'

export interface HuangHud {
  phase: HuangPhase
  hp: number
  maxHp: number
  enraged: boolean
  /** 距离下一记灭世雷暴的秒数 */
  doomIn: number
  /** 灭世雷暴正在预热 */
  warming: boolean
  /** 场上生门数量 */
  safeZones: number
}

interface Warning {
  ring: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  glow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  point: THREE.Vector3
  age: number
  life: number
}

interface SafeZone {
  ring: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  glow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  point: THREE.Vector3
  age: number
  life: number
}

interface Bolt {
  sprite: THREE.Sprite
  age: number
  life: number
}

interface Shock {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  age: number
  life: number
  radius: number
}

interface Arc {
  sprite: THREE.Sprite
  angle: number
  height: number
  radius: number
  speed: number
  flicker: number
}

export interface HuangHooks {
  /** 血条见底：怒吼着往海里沉 */
  onDefeated: () => void
  /** 玩家按 E 收走浮出水面的神器 */
  onLoot: () => void
}

/**
 * 终极大 Boss「黄达鑫」：按照片里的特征用几何体拼出的巨型墨影——
 * 中分黑发、透明框眼镜、鼓起的腮、灰 V 领 T 恤、抬起的那只手和腕上的表。
 * 只做演出与雷罚判定，掉落结算由 hooks 交回 Game。
 */
export class HuangBoss {
  readonly group = new THREE.Group()

  private world: World
  private hooks: HuangHooks
  private body = new THREE.Group()
  private armRight = new THREE.Group()
  private armLeft = new THREE.Group()
  private arcs: Arc[] = []
  private warnings: Warning[] = []
  private zones: SafeZone[] = []
  private bolts: (Bolt | undefined)[] = []
  private shocks: Shock[] = []
  private boltCursor = 0
  private sheet: THREE.CanvasTexture
  private ring: THREE.CanvasTexture
  private glow: THREE.CanvasTexture
  /** 全场只挂两盏灯：一盏缠身、一盏落雷 */
  private aura = new THREE.PointLight('#ff2f1c', 0, 150, 2)
  private flash = new THREE.PointLight('#ffd2c0', 0, 120, 2)
  private flashAge = 99

  private phase: HuangPhase = 'fight'
  private active = false
  private riseT = 0
  private slainT = 0
  private hp = 1
  private maxHp = 1
  private enraged = false
  private clock = 0
  private warnTimer = 0
  private doomTimer = 0
  private warmTimer = 0
  private volleyTimer = 0
  private volleyLeft = 0
  private judged = false
  private hudTimer = 0
  private armRaise = 0
  private yaw = 0
  private aim = new THREE.Vector3()
  private spot = new THREE.Vector3()
  private head = new THREE.Vector3()
  private loot: THREE.Group | null = null
  private lootRing: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null
  private lootAge = 0
  /** 影子沉下去之后还漂在海上的那根针 */
  private stray: THREE.Group | null = null
  private strayAge = 0

  /** Game 每帧取走并清零的镜头抖动请求 */
  shakeRequest = 0

  constructor(scene: THREE.Scene, world: World, hooks: HuangHooks) {
    this.world = world
    this.hooks = hooks
    this.sheet = boltTexture()
    this.ring = ringTexture()
    this.glow = glowTexture()
    this.group.visible = false
    this.aura.castShadow = false
    this.flash.castShadow = false
    this.group.add(this.aura, this.flash)
    scene.add(this.group)
    scene.add(this.body)
    this.buildFigure()
  }

  get isActive() {
    return this.active
  }

  get headPosition() {
    return this.head
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
    const ink = new THREE.MeshStandardMaterial({
      color: '#150f18',
      roughness: 0.86,
      metalness: 0.14,
      flatShading: true,
    })
    const skin = new THREE.MeshStandardMaterial({
      color: '#2c2129',
      roughness: 0.92,
      flatShading: true,
    })
    const hair = new THREE.MeshStandardMaterial({
      color: '#07060c',
      roughness: 0.4,
      metalness: 0.38,
      flatShading: true,
    })
    const tee = new THREE.MeshStandardMaterial({
      color: '#3b4046',
      roughness: 0.96,
      flatShading: true,
    })
    const glass = new THREE.MeshStandardMaterial({
      color: '#d7eefc',
      roughness: 0.14,
      metalness: 0.1,
      transparent: true,
      opacity: 0.4,
    })
    const eye = new THREE.MeshStandardMaterial({
      color: '#ff4030',
      emissive: '#ff2008',
      emissiveIntensity: 2.6,
      roughness: 0.4,
    })
    const steel = new THREE.MeshStandardMaterial({
      color: '#cfd6da',
      roughness: 0.26,
      metalness: 0.86,
      flatShading: true,
    })
    const bamboo = new THREE.MeshStandardMaterial({
      color: '#e6d3a6',
      roughness: 0.7,
      flatShading: true,
    })

    const head = new THREE.Group()
    head.position.y = 20
    this.body.add(head)

    const skull = new THREE.Mesh(new THREE.SphereGeometry(6.4, 16, 12), skin)
    skull.castShadow = true
    head.add(skull)

    // 鼓起的两腮：照片里那口还没咽下去的饭
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(2.05, 12, 10), skin)
      cheek.scale.set(1.05, 0.84, 0.66)
      cheek.position.set(side * 3.1, -1.7, 4.5)
      head.add(cheek)
    }
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), ink)
    mouth.scale.set(1.4, 0.5, 0.6)
    mouth.position.set(0, -3.7, 5.1)
    head.add(mouth)

    // 中分黑发：一顶偏盖的头套 + 左右两拨分开的刘海
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(6.72, 16, 12, 0, TAU, 0, Math.PI * 0.56),
      hair,
    )
    cap.position.y = 0.55
    head.add(cap)
    for (const side of [-1, 1]) {
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(3.5, 12, 10), hair)
      lobe.scale.set(1.22, 0.5, 0.98)
      lobe.position.set(side * 2.7, 3.15, 3.1)
      lobe.rotation.z = side * 0.4
      head.add(lobe)
    }

    // 透明框眼镜：两片方镜框 + 半透镜片，眼睛在镜片后面发红
    for (const side of [-1, 1]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(4.7, 3.0, 0.34), ink)
      frame.position.set(side * 2.9, 0.5, 5.72)
      frame.rotation.y = side * 0.16
      head.add(frame)
      const lens = new THREE.Mesh(new THREE.BoxGeometry(4.1, 2.5, 0.2), glass)
      lens.position.set(side * 2.9, 0.5, 5.98)
      lens.rotation.y = side * 0.16
      head.add(lens)
      const eyeBall = new THREE.Mesh(new THREE.SphereGeometry(1.02, 10, 8), eye)
      eyeBall.position.set(side * 2.9, 0.5, 5.5)
      head.add(eyeBall)
      const temple = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 4.6), ink)
      temple.position.set(side * 5.0, 0.8, 3.5)
      temple.rotation.y = side * 0.32
      head.add(temple)
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.34, 0.3), ink)
    bridge.position.set(0, 1.15, 5.85)
    head.add(bridge)

    // 灰 V 领 T 恤
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 7.8, 15.5, 8), tee)
    torso.position.y = 8
    torso.castShadow = true
    this.body.add(torso)
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.1, 4.2, 8), skin)
    neck.position.y = 16.6
    this.body.add(neck)
    for (const side of [-1, 1]) {
      const collar = new THREE.Mesh(new THREE.BoxGeometry(1.0, 5.4, 0.5), skin)
      collar.position.set(side * 1.7, 13.6, 5.15)
      collar.rotation.z = side * 0.52
      this.body.add(collar)
      const rim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5.6, 0.4), steel)
      rim.position.set(side * 2.5, 13.7, 5.3)
      rim.rotation.z = side * 0.52
      this.body.add(rim)
    }

    this.armRight = this.buildArm(steel, bamboo, tee, skin)
    this.armRight.position.set(7.4, 14.4, 0)
    this.body.add(this.armRight)
    this.armLeft = this.buildArm(steel, bamboo, tee, skin, true)
    this.armLeft.position.set(-7.4, 14.4, 0)
    this.body.add(this.armLeft)

    // 缠身的暗红电弧
    for (let i = 0; i < WRIST_ARCS; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.sheet,
          color: i % 3 === 0 ? '#ff6a4a' : '#ff2f1c',
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fog: false,
        }),
      )
      sprite.scale.set(4.4, 20 + Math.random() * 14, 1)
      sprite.renderOrder = 6
      this.body.add(sprite)
      this.arcs.push({
        sprite,
        angle: (i / WRIST_ARCS) * TAU,
        height: 2 + Math.random() * 24,
        radius: 8.6 + Math.random() * 3.6,
        speed: 0.5 + Math.random() * 0.9,
        flicker: Math.random() * TAU,
      })
    }
  }

  /** 一条手臂：抬起的那只捏着一双筷子，另一只腕上扣着表 */
  private buildArm(
    steel: THREE.MeshStandardMaterial,
    bamboo: THREE.MeshStandardMaterial,
    tee: THREE.MeshStandardMaterial,
    skin: THREE.MeshStandardMaterial,
    withWatch = false,
  ) {
    const pivot = new THREE.Group()
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.35, 7.4, 7), tee)
    upper.position.y = 3.7
    upper.castShadow = true
    pivot.add(upper)

    const elbow = new THREE.Group()
    elbow.position.y = 7.4
    pivot.add(elbow)
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.05, 6.8, 7), tee)
    fore.position.y = 3.4
    fore.castShadow = true
    elbow.add(fore)

    const hand = new THREE.Group()
    hand.position.y = 6.8
    elbow.add(hand)
    const fist = new THREE.Mesh(new THREE.SphereGeometry(1.85, 10, 8), skin)
    fist.castShadow = true
    hand.add(fist)

    if (withWatch) {
      const watch = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.42, 8, 20), steel)
      watch.rotation.x = Math.PI / 2
      watch.position.y = -1.4
      hand.add(watch)
      const dial = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.4, 12), steel)
      dial.position.set(0, -1.4, 1.7)
      dial.rotation.x = Math.PI / 2
      hand.add(dial)
    } else {
      // 抬起的手里那两根筷子，是他唯一武器
      for (const side of [-1, 1]) {
        const stick = new THREE.Mesh(new THREE.BoxGeometry(0.34, 9.2, 0.34), bamboo)
        stick.position.set(side * 0.42, 4.4, side * 0.3)
        stick.rotation.x = side * 0.1
        stick.rotation.z = side * 0.06
        hand.add(stick)
      }
    }
    pivot.rotation.z = withWatch ? 0.46 : -0.62
    return pivot
  }

  // -------------------------------------------------------------- 召唤与生命周期

  /** 从玩家正前方的深海里立起来 */
  summon(player: THREE.Vector3, maxHp: number) {
    if (this.active) return
    this.active = true
    this.phase = 'rising'
    this.riseT = 0
    this.slainT = 0
    this.hp = maxHp
    this.maxHp = maxHp
    this.enraged = false
    this.clock = 0
    this.warnTimer = 1.6
    this.doomTimer = HUANG_DOOM_INTERVAL
    this.warmTimer = 0
    this.volleyLeft = 0
    this.judged = false
    this.armRaise = 0
    this.clearWarnings()
    this.clearZones()
    this.clearLoot()
    this.group.visible = true
    this.body.visible = true
    this.spot.set(player.x, 0, player.z + STANDOFF)
    this.body.position.set(this.spot.x, -46, this.spot.z)
    this.yaw = Math.atan2(player.x - this.spot.x, player.z - this.spot.z)
    this.body.rotation.y = this.yaw

    const store = useGameStore.getState()
    store.setInputLocked(true)
    store.setBoss({
      id: HUANG_ID,
      name: HUANG_NAME,
      hp: this.hp,
      maxHp: this.maxHp,
      phase: 1,
      skill: '天罚将落',
      ultimate: true,
      realm: 4,
    })
    this.pushHud()
  }

  /** 玩家攻击的命中体积：一根绕身体轴线的大圆柱 */
  hitRay(origin: THREE.Vector3, dir: THREE.Vector3, range: number, damage: number) {
    if (!this.active || this.phase !== 'fight') return false
    const toBody = this.planePoint(origin, this.spot)
    const flat = new THREE.Vector3(dir.x, 0, dir.z)
    if (flat.lengthSq() < 0.0001) return false
    flat.normalize()
    const along = (toBody.x - origin.x) * flat.x + (toBody.z - origin.z) * flat.z
    if (along < -2 || along > range + 9.5) return false
    const lateral = Math.abs((toBody.z - origin.z) * flat.x - (toBody.x - origin.x) * flat.z)
    if (lateral > 9.4) return false
    this.hurt(damage)
    return true
  }

  /** 水弹、飞剑、火海这类落点型判定 */
  hitPoint(point: THREE.Vector3, radius: number, damage: number) {
    if (!this.active || this.phase !== 'fight') return false
    if (point.y > 32) return false
    const distance = Math.hypot(point.x - this.spot.x, point.z - this.spot.z)
    if (distance > radius + 9.2) return false
    this.hurt(damage)
    return true
  }

  private planePoint(origin: THREE.Vector3, target: THREE.Vector3) {
    this.aim.set(target.x, origin.y, target.z)
    return this.aim
  }

  private hurt(amount: number) {
    if (this.phase !== 'fight') return
    this.hp = Math.max(0, this.hp - Math.max(0, Math.round(amount)))
    this.pushBossHud()
    this.pushHud()
    if (!this.enraged && this.hp / this.maxHp < 0.3) this.enterEnrage()
    if (this.hp <= 0) this.beginSlain()
  }

  private enterEnrage() {
    this.enraged = true
    this.warnTimer = Math.min(this.warnTimer, 0.8)
    this.doomTimer = Math.min(this.doomTimer, HUANG_DOOM_INTERVAL / 2)
    this.world.setWaveBoost(2.55)
    const store = useGameStore.getState()
    store.toast('黄达鑫暴起 · 雷电密了一倍，海水开始沸腾', 'danger')
    this.world.flashLightning(1.3)
    store.flashSky()
    audio.thunder()
    this.shakeRequest = Math.max(this.shakeRequest, 1.8)
  }

  private beginSlain() {
    if (this.phase === 'slain') return
    this.phase = 'slain'
    this.slainT = SLAIN_TIME
    this.clearWarnings()
    this.clearZones()
    const store = useGameStore.getState()
    store.setBoss(null)
    store.toast('黄达鑫发出一声不甘的怒吼 · 庞大的影子往海里倒', 'danger')
    audio.thunder()
    audio.splash(1)
    this.shakeRequest = Math.max(this.shakeRequest, 2.4)
    this.world.flashLightning(1.3)
    store.flashSky()
    this.spawnLoot()
    this.hooks.onDefeated()
  }

  /** 血条见底后浮在水面上的那根避雷针 */
  private spawnLoot() {
    const group = new THREE.Group()
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.3, 4.4, 8),
      new THREE.MeshStandardMaterial({
        color: '#dfe8ec',
        roughness: 0.22,
        metalness: 0.9,
        emissive: '#5ad2ff',
        emissiveIntensity: 0.35,
        flatShading: true,
      }),
    )
    rod.position.y = 2.4
    group.add(rod)
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 1.5, 8),
      new THREE.MeshStandardMaterial({
        color: '#ffe6a8',
        roughness: 0.3,
        metalness: 0.7,
        emissive: '#ffcf7a',
        emissiveIntensity: 1.1,
        flatShading: true,
      }),
    )
    tip.position.y = 5.1
    group.add(tip)
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.09, 6, 24),
      new THREE.MeshBasicMaterial({
        color: '#ffcf7a',
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
      new THREE.PlaneGeometry(26, 26),
      new THREE.MeshBasicMaterial({
        map: this.ring,
        color: '#ffe0a0',
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      }),
    )
    glow.rotation.x = -Math.PI / 2
    glow.position.y = 0.22
    group.add(glow)
    this.lootRing = glow
    group.position.set(this.spot.x, 0, this.spot.z)
    this.group.parent?.add(group)
    this.loot = group
  }

  private clearLoot() {
    this.removeStray()
    if (this.loot) {
      this.loot.removeFromParent()
      this.loot.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          const material = obj.material as THREE.Material
          material.dispose()
        }
      })
      this.loot = null
      this.lootRing = null
    }
  }

  /** 神器的拾取提示：靠近了才给 */
  lootPrompt(at: THREE.Vector3) {
    const loot = this.loot ?? this.stray
    if (!loot) return null
    const distance = Math.hypot(at.x - loot.position.x, at.z - loot.position.z)
    if (distance > 16) return null
    return { distance, name: '达鑫的避雷针' }
  }

  /** 影子沉下去了但针还漂着：让 game 继续把针浮在浪上 */
  get hasLoot() {
    return Boolean(this.loot || this.stray)
  }

  collectLoot() {
    if (this.loot) {
      this.clearLoot()
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
    this.strayAge += dt
    const x = this.stray.position.x
    const z = this.stray.position.z
    this.stray.position.y = this.world.waveHeight(x, z, time)
    this.stray.rotation.y += dt * 0.9
  }

  private removeStray() {
    if (!this.stray) return
    this.stray.removeFromParent()
    this.stray.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        ;(obj.material as THREE.Material).dispose()
      }
    })
    this.stray = null
  }

  /** 收场：雷暴散尽，海面恢复 */
  despawn() {
    if (!this.active) return
    this.active = false
    this.group.visible = false
    this.body.visible = false
    this.aura.intensity = 0
    this.clearWarnings()
    this.clearZones()
    // 那根针得留在海上等人来捡，不能跟着影子一起消失
    if (this.loot) {
      this.stray = this.loot
      this.strayAge = 0
      this.loot = null
      this.lootRing = null
    }
    for (const bolt of this.bolts) this.disposeBolt(bolt)
    this.bolts = []
    for (const shock of this.shocks) this.disposeShock(shock)
    this.shocks = []
    this.enraged = false
    this.world.setStorm(0)
    this.world.setDoom(0)
    this.world.setWaveBoost(1)
    const store = useGameStore.getState()
    store.setBoss(null)
    store.setHuang(null)
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
    }

    // 巨影始终绕着玩家转，正面朝着船
    const wanted = Math.atan2(player.x - this.spot.x, player.z - this.spot.z)
    let delta = wanted - this.yaw
    while (delta > Math.PI) delta -= TAU
    while (delta < -Math.PI) delta += TAU
    this.yaw += delta * Math.min(1, dt * 0.9)

    if (this.phase === 'rising') {
      this.riseT += dt
      const k = clamp(this.riseT / RISE_TIME, 0, 1)
      const eased = k * k * (3 - 2 * k)
      this.body.position.set(this.spot.x, -46 + eased * 46, this.spot.z)
      this.body.scale.setScalar(0.72 + eased * 0.28)
      this.world.setStorm(1)
      this.world.setDoom(1)
      this.world.setWaveBoost(1.5 + eased * 1.1)
      // 天降异象：每 0.55 秒一道雷、一声震
      if (Math.floor(this.riseT / 0.55) !== Math.floor((this.riseT - dt) / 0.55)) {
        this.world.flashLightning(1.25)
        store.flashSky()
        audio.thunder()
        this.shakeRequest = Math.max(this.shakeRequest, 0.9 + eased * 0.8)
        this.spawnBolt(this.spot.x + (Math.random() - 0.5) * 40, this.spot.z + (Math.random() - 0.5) * 40)
      }
      if (k >= 1) {
        this.phase = 'fight'
        this.warnTimer = 1.2
        this.doomTimer = HUANG_DOOM_INTERVAL
        store.toast('黄达鑫自深渊立起 · 刀剑无用，只有把他打下去', 'danger')
        store.setInputLocked(false)
      }
    } else if (this.phase === 'fight') {
      this.spot.x = player.x + Math.sin(this.yaw) * STANDOFF
      this.spot.z = player.z + Math.cos(this.yaw) * STANDOFF
      const bob = Math.sin(time * 0.62) * 0.9
      this.body.position.set(this.spot.x, bob, this.spot.z)
      this.body.rotation.y = this.yaw
      this.body.rotation.z = Math.sin(time * 0.4) * 0.012
      this.runAttacks(dt, player, store)
    } else {
      this.slainT -= dt
      this.body.position.y -= dt * 16
      this.body.scale.multiplyScalar(1 - dt * 0.12)
      this.armRaise = Math.max(0, this.armRaise - dt)
      if (this.slainT <= 0) {
        this.despawn()
        return
      }
    }

    this.head.set(this.body.position.x, this.body.position.y + 20, this.body.position.z)
    this.aura.position.set(this.body.position.x, this.body.position.y + 14, this.body.position.z)
    this.aura.intensity =
      (this.phase === 'rising' ? 900 : 620) + Math.sin(time * 4.3) * 120 + this.armRaise * 420

    // 抬手：预警期间那条手臂一直举着
    const wantRaise = this.warnings.length > 0 || this.volleyLeft > 0 ? 1 : 0
    this.armRaise += (wantRaise - this.armRaise) * Math.min(1, dt * 5.5)
    this.armRight.rotation.z = -0.62 - this.armRaise * 0.95
    this.armRight.rotation.x = -this.armRaise * 0.3
    this.armLeft.rotation.z = 0.46 + Math.sin(time * 0.9) * 0.05

    // 缠身电弧
    for (const arc of this.arcs) {
      arc.angle += dt * arc.speed * (this.enraged ? 1.7 : 1)
      const sprite = arc.sprite
      sprite.position.set(
        Math.cos(arc.angle) * arc.radius,
        arc.height + Math.sin(time * 1.4 + arc.flicker) * 1.6,
        Math.sin(arc.angle) * arc.radius,
      )
      const pulse = 0.35 + Math.abs(Math.sin(time * 6 + arc.flicker)) * 0.6
      sprite.material.opacity = pulse * (this.enraged ? 1 : 0.78)
      sprite.material.rotation = Math.sin(time * 2 + arc.flicker) * 0.25
    }

    this.updateWarnings(dt, time, player)
    this.updateZones(dt, time, player)
    this.updateBolts(dt)
    this.updateShocks(dt)

    if (this.loot) {
      this.lootAge += dt
      this.loot.position.y = this.world.waveHeight(this.loot.position.x, this.loot.position.z, time)
      this.loot.rotation.y += dt * 0.9
      if (this.lootRing) {
        this.lootRing.material.opacity = 0.42 + Math.sin(this.lootAge * 3.2) * 0.2
        this.lootRing.position.y = 0.22
      }
    }

    this.flashAge += dt
    this.flash.intensity = Math.max(0, (1 - this.flashAge / 0.42) * 1400)
  }

  private runAttacks(dt: number, player: THREE.Vector3, store: ReturnType<typeof useGameStore.getState>) {
    // 无差别雷击：抬手在玩家水域随机落雷柱
    this.warnTimer -= dt
    if (this.warnTimer <= 0) {
      this.warnTimer = this.enraged ? 1.6 : 3.1
      this.spawnWarning(player)
      if (this.enraged) this.spawnWarning(player)
    }

    // 毁天灭地：预热 3 秒 → 全屏落雷 → 结算生门
    this.doomTimer -= dt
    if (this.doomTimer <= 0 && this.warmTimer <= 0) {
      this.warmTimer = 3
      this.judged = false
      this.volleyLeft = this.enraged ? 16 : 12
      this.volleyTimer = 0
      store.toast(this.enraged ? '黄达鑫双手举起 · 灭世雷暴（狂暴）' : '黄达鑫双手举起 · 灭世雷暴将至', 'danger')
      audio.thunder()
      this.shakeRequest = Math.max(this.shakeRequest, 1.1)
    }
    if (this.warmTimer > 0) {
      this.warmTimer -= dt
      this.world.flashLightning(0.5)
      store.flashSky()
      if (this.warmTimer <= 0) {
        this.buildSafeZones(player)
        this.volleyTimer = 0.1
      }
      this.pushHud()
    }
    if (this.volleyLeft > 0) {
      this.volleyTimer -= dt
      if (this.volleyTimer <= 0) {
        this.volleyTimer = 0.18
        this.volleyLeft -= 1
        const angle = Math.random() * TAU
        const reach = 4 + Math.random() * 30
        this.spawnBolt(player.x + Math.cos(angle) * reach, player.z + Math.sin(angle) * reach)
        this.world.flashLightning(0.9)
        if (this.volleyLeft <= 0) this.finishVolley(player, store)
      }
    }
  }

  private finishVolley(player: THREE.Vector3, store: ReturnType<typeof useGameStore.getState>) {
    if (this.judged) return
    this.judged = true
    this.doomTimer = this.enraged ? HUANG_DOOM_INTERVAL / 2 : HUANG_DOOM_INTERVAL
    const sheltered = this.zones.some(
      (zone) => Math.hypot(player.x - zone.point.x, player.z - zone.point.z) < SAFE_RADIUS,
    )
    const deep = store.underwater && store.depth > 7.2
    if (sheltered || deep) {
      store.toast(
        deep ? '潜到海底最深处 · 天雷摸不着你' : '踩中生门 · 雷从耳边绕过去',
        'gold',
      )
    } else {
      store.damagePlayer(this.enraged ? 52 : 38, '灭世雷暴', 'lightning')
      this.shakeRequest = Math.max(this.shakeRequest, 2)
    }
    this.pushHud()
  }

  private spawnWarning(player: THREE.Vector3) {
    if (this.warnings.length >= 6) return
    // 一半落在玩家脚下，一半落在旁边水域，逼着人不停开船
    const tight = Math.random() < 0.55
    const angle = Math.random() * TAU
    const reach = tight ? Math.random() * 4 : 7 + Math.random() * 17
    const point = new THREE.Vector3(
      player.x + Math.cos(angle) * reach,
      0,
      player.z + Math.sin(angle) * reach,
    )
    this.warnings.push(this.makeDisc(point, WARN_TIME, '#ff3a24', false))
  }

  private buildSafeZones(player: THREE.Vector3) {
    this.clearZones()
    for (let i = 0; i < SAFE_ZONES; i++) {
      const angle = (i / SAFE_ZONES) * TAU + Math.random() * 1.4
      const reach = 10 + Math.random() * 9
      const point = new THREE.Vector3(
        player.x + Math.cos(angle) * reach,
        0,
        player.z + Math.sin(angle) * reach,
      )
      this.zones.push(this.makeDisc(point, 6.2, '#5cf2a0', true))
    }
  }

  /** 预警圈与生门共用一套构造：贴在水面上的两张贴片 */
  private makeDisc(point: THREE.Vector3, life: number, color: string, safe: boolean): SafeZone {
    const ring = new THREE.Mesh(
      new THREE.PlaneGeometry(SAFE_RADIUS * 2, SAFE_RADIUS * 2),
      new THREE.MeshBasicMaterial({
        map: this.ring,
        color,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.set(point.x, 0.4, point.z)
    ring.scale.setScalar(safe ? 1 : 0.34)
    ring.renderOrder = 5
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(SAFE_RADIUS * 2, SAFE_RADIUS * 2),
      new THREE.MeshBasicMaterial({
        map: this.glow,
        color,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      }),
    )
    glow.rotation.x = -Math.PI / 2
    glow.position.set(point.x, 0.3, point.z)
    glow.renderOrder = 4
    this.group.parent?.add(ring)
    this.group.parent?.add(glow)
    return { ring, glow, point, age: 0, life }
  }

  private updateWarnings(dt: number, time: number, player: THREE.Vector3) {
    for (let i = this.warnings.length - 1; i >= 0; i--) {
      const warn = this.warnings[i]
      warn.age += dt
      const k = clamp(warn.age / warn.life, 0, 1)
      warn.ring.scale.setScalar(0.34 + k * 0.66)
      warn.ring.material.opacity = 0.55 + k * 0.45
      warn.glow.material.opacity = 0.12 + k * 0.4
      const y = this.world.waveHeight(warn.point.x, warn.point.z, time)
      warn.ring.position.y = y + 0.4
      warn.glow.position.y = y + 0.3
      if (k >= 1) {
        this.warnings.splice(i, 1)
        this.disposeDisc(warn)
        this.spawnBolt(warn.point.x, warn.point.z)
        this.world.flashLightning(0.85)
        audio.thunder()
        const distance = Math.hypot(player.x - warn.point.x, player.z - warn.point.z)
        if (distance < BOLT_RADIUS) {
          useGameStore.getState().damagePlayer(this.enraged ? 26 : 19, '天罚雷柱', 'lightning')
          this.shakeRequest = Math.max(this.shakeRequest, 1.15)
        }
      }
    }
  }

  private updateZones(dt: number, time: number, player: THREE.Vector3) {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const zone = this.zones[i]
      zone.age += dt
      const k = zone.age / zone.life
      if (k >= 1) {
        this.zones.splice(i, 1)
        this.disposeDisc(zone)
        continue
      }
      const pulse = 1 + Math.sin(time * 3.4 + i) * 0.035
      zone.ring.scale.setScalar(pulse)
      zone.ring.material.opacity = (0.5 + Math.sin(time * 4.2 + i) * 0.22) * (1 - k * 0.5)
      zone.glow.material.opacity = 0.3 * (1 - k * 0.6)
      const y = this.world.waveHeight(zone.point.x, zone.point.z, time)
      zone.ring.position.y = y + 0.42
      zone.glow.position.y = y + 0.32
      // 玩家踩进生门时把圈点亮一格，隔着浪也能认出来
      if (Math.hypot(player.x - zone.point.x, player.z - zone.point.z) < SAFE_RADIUS) {
        zone.ring.material.opacity = 0.95
        zone.glow.material.opacity = 0.5
      }
    }
  }

  private disposeDisc(disc: SafeZone) {
    disc.ring.removeFromParent()
    disc.ring.geometry.dispose()
    disc.ring.material.dispose()
    disc.glow.removeFromParent()
    disc.glow.geometry.dispose()
    disc.glow.material.dispose()
  }

  private clearWarnings() {
    for (const warn of this.warnings) this.disposeDisc(warn)
    this.warnings = []
  }

  private clearZones() {
    for (const zone of this.zones) this.disposeDisc(zone)
    this.zones = []
  }

  private spawnBolt(x: number, z: number) {
    const slot = this.boltCursor % MAX_BOLTS
    this.boltCursor += 1
    this.disposeBolt(this.bolts[slot])
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.sheet,
        color: '#ffd8cc',
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    )
    sprite.position.set(x, 34, z)
    sprite.scale.set(9, 68, 1)
    sprite.renderOrder = 7
    this.group.parent?.add(sprite)
    this.bolts[slot] = { sprite, age: 0, life: 0.46 }

    if (this.shocks.length >= MAX_RINGS) this.disposeShock(this.shocks.shift())
    const shock = new THREE.Mesh(
      new THREE.PlaneGeometry(BOLT_RADIUS * 2.6, BOLT_RADIUS * 2.6),
      new THREE.MeshBasicMaterial({
        map: this.ring,
        color: '#ff8a5a',
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      }),
    )
    shock.rotation.x = -Math.PI / 2
    shock.position.set(x, 0.5, z)
    shock.scale.setScalar(0.2)
    shock.renderOrder = 6
    this.group.parent?.add(shock)
    this.shocks.push({ mesh: shock, age: 0, life: 0.55, radius: BOLT_RADIUS * 2.6 })

    this.flash.position.set(x, 6, z)
    this.flashAge = 0
    this.world.foam.splash(x, z, 6, 1.1)
    this.world.foam.ripple(x, z, 3.2)
  }

  private disposeBolt(bolt?: Bolt) {
    if (!bolt) return
    bolt.sprite.removeFromParent()
    bolt.sprite.material.dispose()
  }

  private disposeShock(shock?: Shock) {
    if (!shock) return
    shock.mesh.removeFromParent()
    shock.mesh.geometry.dispose()
    shock.mesh.material.dispose()
  }

  private updateBolts(dt: number) {
    for (let i = 0; i < this.bolts.length; i++) {
      const bolt = this.bolts[i]
      if (!bolt) continue
      bolt.age += dt
      const k = bolt.age / bolt.life
      if (k >= 1) {
        this.disposeBolt(bolt)
        this.bolts[i] = undefined
        continue
      }
      bolt.sprite.material.opacity = 1 - k * k
      bolt.sprite.scale.set(9 + k * 6, 68 - k * 10, 1)
    }
  }

  private updateShocks(dt: number) {
    for (let i = this.shocks.length - 1; i >= 0; i--) {
      const shock = this.shocks[i]
      shock.age += dt
      const k = shock.age / shock.life
      if (k >= 1) {
        this.shocks.splice(i, 1)
        this.disposeShock(shock)
        continue
      }
      shock.mesh.scale.setScalar(0.2 + k * 1.05)
      shock.mesh.material.opacity = 0.95 * (1 - k)
    }
  }

  private pushHud() {
    const store = useGameStore.getState()
    if (!this.active) {
      store.setHuang(null)
      return
    }
    store.setHuang({
      phase: this.phase,
      hp: this.hp,
      maxHp: this.maxHp,
      enraged: this.enraged,
      doomIn: Math.max(0, this.warmTimer > 0 ? -this.warmTimer : this.doomTimer),
      warming: this.warmTimer > 0,
      safeZones: this.zones.length,
    })
  }

  private pushBossHud() {
    const store = useGameStore.getState()
    store.setBoss({
      id: HUANG_ID,
      name: HUANG_NAME,
      hp: this.hp,
      maxHp: this.maxHp,
      phase: this.enraged ? 2 : 1,
      skill: this.warmTimer > 0 ? '灭世雷暴' : this.volleyLeft > 0 ? '天雷倾泻' : '天罚雷柱',
      ultimate: true,
      realm: 4,
    })
  }

  dispose() {
    this.clearWarnings()
    this.clearZones()
    this.clearLoot()
    for (const bolt of this.bolts) this.disposeBolt(bolt)
    for (const shock of this.shocks) this.disposeShock(shock)
    this.bolts = []
    this.shocks = []
    this.sheet.dispose()
    this.ring.dispose()
    this.glow.dispose()
    this.group.removeFromParent()
    this.body.removeFromParent()
  }
}

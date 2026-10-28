import * as THREE from 'three'
import type { World } from '@/game/world/world'
import type { MapZone, RadarContact, WaterId } from '@/types'
import { waterAt } from '@/game/world/waters'
import { creatureRealm } from '@/game/cultivation/realms'
import { useGameStore } from '@/store/useGameStore'
import { audio } from '@/game/audio/gameAudio'
import { gameEvents } from '@/game/eventBus'
import { clamp } from '@/game/utils/math'

type CreatureKind = 'shark' | 'whale' | 'dragon' | 'turtle'

export interface CreaturePlayer {
  position: THREE.Vector3
  underwater: boolean
  dead: boolean
}

interface Creature {
  id: string
  kind: CreatureKind
  name: string
  group: THREE.Group
  material: THREE.MeshStandardMaterial
  accent: THREE.MeshStandardMaterial
  home: THREE.Vector2
  arena: number
  baseY: number
  radius: number
  hp: number
  maxHp: number
  boss: boolean
  zone?: WaterId
  alive: boolean
  state: string
  stateT: number
  attackCd: number
  skillT: number
  skillLabel: string
  hitFlash: number
  speed: number
  wander: number
  phase: number
  slowT: number
  respawnAt: number
  breachT: number
  breachCd: number
  breached: boolean
  shield?: THREE.Mesh
  tail?: THREE.Object3D
  fins: THREE.Object3D[]
  segments: THREE.Object3D[]
  ultimate?: boolean
  corpse?: boolean
  corpseValue?: number
  marker?: THREE.Group
}

const SHARK_MAT = '#55696e'
const WHALE_MAT = '#4a6d86'
const DRAGON_MAT = '#2f8f83'
const TURTLE_MAT = '#556b48'
const GOLD_MAT = '#d8b45a'

/** 天界云海中的同一批生物：换名、换色、加血，成为仙兽 */
const CELESTIAL_FORMS: Record<
  CreatureKind,
  { name: string; body: string; accent: string; hpMul: number }
> = {
  shark: { name: '云海蛟鲨', body: '#6f8fc8', accent: '#ffe6a8', hpMul: 1.7 },
  whale: { name: '凌霄灵鲸', body: '#5b74cc', accent: '#fff0c8', hpMul: 1.6 },
  dragon: { name: '九天雷龙', body: '#d99a1f', accent: '#fff3cf', hpMul: 2.2 },
  turtle: { name: '玄天真龟', body: '#3f8f86', accent: '#ffe6b0', hpMul: 2 },
}

function finGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.lineTo(0.95, 0.16)
  shape.lineTo(0.24, 0.98)
  shape.closePath()
  return new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: false })
}

const FIN_GEO = finGeometry()
const EYE_GEO = new THREE.SphereGeometry(0.1, 6, 5)
const EYE_MAT = new THREE.MeshStandardMaterial({
  color: '#0a1416',
  emissive: '#7fe6d8',
  emissiveIntensity: 0.55,
  roughness: 0.3,
})
const MOUTH_MAT = new THREE.MeshStandardMaterial({ color: '#2a1a1a', roughness: 0.8 })

function markCreature(group: THREE.Group, id: string) {
  group.traverse((obj) => {
    obj.userData.creatureId = id
  })
}

function lootTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.95)')
  g.addColorStop(0.35, 'rgba(255,232,160,0.7)')
  g.addColorStop(1, 'rgba(255,220,120,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = 'rgba(255,250,232,0.98)'
  ctx.beginPath()
  ctx.moveTo(size / 2, 22)
  ctx.lineTo(size / 2 + 16, size / 2)
  ctx.lineTo(size / 2, size - 22)
  ctx.lineTo(size / 2 - 16, size / 2)
  ctx.closePath()
  ctx.fill()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export class CreatureSystem {
  readonly group = new THREE.Group()
  private creatures: Creature[] = []
  private vortex = new THREE.Group()
  private vortexUntil = 0
  private vortexPos = new THREE.Vector3()
  private vortexTick = 0
  private lastBossId: string | null = null
  private zone: MapZone = 'mortal'
  private originals = new Map<string, { name: string; hp: number; body: string; accent: string }>()
  private bossTimer = 0
  private clock = 0
  private raycaster = new THREE.Raycaster()
  private dragonIntro = -1
  private dragonIntroDone = false
  private introRippleStep = -1
  private boltT = 1.4
  private stormActive = false
  private arenaRing = new THREE.Group()

  constructor(
    private scene: THREE.Scene,
    private world: World,
  ) {
    scene.add(this.group)
    this.buildVortex()
    this.spawn()
    this.buildArenaRing()
  }

  get introActive() {
    return this.dragonIntro >= 0
  }

  introFocus(out = new THREE.Vector3()) {
    const dragon = this.creatures.find((c) => c.id === 'boss-dragon')
    if (!dragon) return out.set(0, 0, 0)
    return out.copy(dragon.group.position)
  }

  navBoss() {
    const dragon = this.creatures.find((c) => c.id === 'boss-dragon')
    if (!dragon || !this.dragonIntroDone || !dragon.alive || dragon.corpse) return null
    return {
      id: dragon.id,
      name: dragon.name,
      x: dragon.group.position.x,
      z: dragon.group.position.z,
      arenaX: dragon.home.x,
      arenaZ: dragon.home.y,
      arenaR: dragon.arena,
      intro: this.dragonIntro >= 0,
    }
  }

  bossPosition(id: string, out = new THREE.Vector3()) {
    const boss = this.creatures.find((c) => c.id === id && c.alive && !c.corpse)
    if (!boss) return null
    return out.copy(boss.group.position)
  }

  /** 天界云海：生物换成仙兽形态 */
  setZone(zone: MapZone) {
    if (zone === this.zone) return
    this.zone = zone
    const celestial = zone === 'celestial'
    for (const c of this.creatures) {
      let base = this.originals.get(c.id)
      if (!base) {
        base = {
          name: c.name,
          hp: c.maxHp,
          body: `#${c.material.color.getHexString()}`,
          accent: `#${c.accent.color.getHexString()}`,
        }
        this.originals.set(c.id, base)
      }
      if (celestial) {
        const form = CELESTIAL_FORMS[c.kind]
        c.name = form.name
        c.maxHp = Math.round(base.hp * form.hpMul)
        if (c.alive && !c.corpse) c.hp = c.maxHp
        c.material.color.set(form.body)
        c.accent.color.set(form.accent)
      } else {
        c.name = base.name
        c.maxHp = base.hp
        if (c.alive && !c.corpse) c.hp = c.maxHp
        c.material.color.set(base.body)
        c.accent.color.set(base.accent)
        c.material.emissiveIntensity = 0
      }
    }
  }

  private buildArenaRing() {
    const dragon = this.creatures.find((c) => c.id === 'boss-dragon')
    if (!dragon) return
    const arena = dragon.arena
    const ring = (radius: number, thickness: number, color: string, opacity: number) => {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(radius, thickness, 4, 128),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      mesh.rotation.x = Math.PI / 2
      return mesh
    }
    this.arenaRing.add(
      ring(arena, 0.14, '#ffb13d', 0.32),
      ring(arena + 0.7, 0.05, '#f2c15c', 0.16),
      ring(arena + 14, 0.08, '#ff6d5a', 0.12),
    )
    this.arenaRing.position.set(dragon.home.x, 0.1, dragon.home.y)
    this.arenaRing.visible = false
    this.group.add(this.arenaRing)
  }

  private buildVortex() {
    const mat = new THREE.MeshBasicMaterial({
      color: '#6fe0cf',
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6 + i * 1.15, 0.07, 5, 28), mat)
      ring.rotation.x = Math.PI / 2
      ring.position.y = i * 0.45
      this.vortex.add(ring)
    }
    this.vortex.visible = false
    this.group.add(this.vortex)
  }

  private setStorm(on: boolean) {
    if (on === this.stormActive) return
    this.stormActive = on
    this.world.setStorm(on ? 1 : 0)
  }

  private buildCorpseMarker(color: string) {
    const material = new THREE.SpriteMaterial({
      map: lootTexture(),
      color,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const glow = new THREE.Sprite(material)
    glow.position.y = 3.4
    glow.scale.set(2.8, 2.8, 1)

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.4, 0.08, 6, 40),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.45

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.55, 4.4, 8, 1, true),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    )
    beam.position.y = 2.3

    const marker = new THREE.Group()
    marker.add(glow, ring, beam)
    marker.userData.ring = ring
    marker.userData.glow = glow
    return marker
  }

  private disposeMarker(marker: THREE.Group) {
    this.group.remove(marker)
    marker.traverse((obj) => {
      if (obj instanceof THREE.Sprite) {
        obj.material.map?.dispose()
        obj.material.dispose()
      } else if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        ;(obj.material as THREE.Material).dispose()
      }
    })
  }

  private startDragonIntro() {
    const dragon = this.creatures.find((c) => c.id === 'boss-dragon')
    if (!dragon) return
    this.dragonIntroDone = true
    this.dragonIntro = 0
    this.introRippleStep = -1
    this.boltT = 0.5
    dragon.alive = true
    dragon.corpse = false
    dragon.hp = dragon.maxHp
    dragon.phase = 1
    dragon.state = 'intro'
    dragon.skillLabel = '龙王降临'
    dragon.group.visible = true
    dragon.group.position.set(dragon.home.x, -18, dragon.home.y)
    dragon.group.rotation.set(0, 0, 0)
    this.setStorm(true)
    const store = useGameStore.getState()
    store.setInputLocked(true)
    store.setCombatCamera(false)
    store.setBoss({
      id: dragon.id,
      name: dragon.name,
      hp: Math.round(dragon.hp),
      maxHp: dragon.maxHp,
      phase: 1,
      skill: '龙王降临',
      ultimate: true,
      realm: creatureRealm(dragon.kind),
    })
    store.toast('沉船深沟的水面开始翻涌 · 深渊龙王正在上浮', 'danger')
    store.flashSky()
    audio.thunder()
    this.world.foam.ripple(dragon.home.x, dragon.home.y, 12)
    this.world.foam.splash(dragon.home.x, dragon.home.y, 10, 1.1)
  }

  private updateDragonIntro(dt: number, time: number, player: CreaturePlayer) {
    if (this.dragonIntro < 0) return
    const dragon = this.creatures.find((c) => c.id === 'boss-dragon')
    if (!dragon) {
      this.dragonIntro = -1
      useGameStore.getState().setInputLocked(false)
      return
    }
    const store = useGameStore.getState()
    this.dragonIntro += dt
    const p = clamp(this.dragonIntro / 7.2, 0, 1)
    const eased = p * p * (3 - 2 * p)
    const rise = THREE.MathUtils.lerp(-18, -0.9, eased)
    dragon.group.position.set(dragon.home.x, rise, dragon.home.y)
    dragon.group.visible = true
    const toPlayer = Math.atan2(player.position.x - dragon.home.x, player.position.z - dragon.home.y)
    dragon.group.rotation.y += (toPlayer - dragon.group.rotation.y) * (1 - Math.exp(-dt * 1.2))
    dragon.group.rotation.z = Math.sin(this.dragonIntro * 2.6) * (0.04 + p * 0.08)
    dragon.segments.forEach((seg, i) => {
      seg.position.x = Math.sin(time * 2 + i * 0.6) * (0.4 + i * 0.08) * (0.4 + p * 0.9)
    })

    const step = Math.floor(this.dragonIntro / 0.46)
    if (step !== this.introRippleStep) {
      this.introRippleStep = step
      this.world.foam.ripple(dragon.home.x, dragon.home.y, 4 + p * 12)
      if (p > 0.35) this.world.foam.splash(dragon.home.x, dragon.home.y, 4 + Math.round(p * 6), 0.5 + p * 0.7)
    }

    this.boltT -= dt
    if (this.boltT <= 0) {
      this.boltT = 1.1 + Math.random() * 1.6
      this.world.flashLightning(0.8 + Math.random() * 0.45)
      store.flashSky()
      audio.thunder()
    }

    if (p >= 1) {
      this.dragonIntro = -1
      store.setInputLocked(false)
      dragon.state = 'guard'
      dragon.skillT = 8
      dragon.skillLabel = '深渊漩涡'
      this.world.foam.splash(dragon.home.x, dragon.home.y, 26, 1.8)
      this.world.foam.ripple(dragon.home.x, dragon.home.y, 16)
      store.toast('深渊龙王破水而出 · 终极首领战开始', 'danger')
    }
  }

  private spawn() {
    this.addShark('shark-bay', '鲨鱼', { x: 16, z: -12 }, 22, 90, -1.4)
    this.addShark('shark-far', '黑潮鲨', { x: 123, z: 2 }, 30, 130, -1.6)
    this.addShark('shark-trench', '深沟鲨', { x: -77, z: -53 }, 26, 150, -1.8)
    this.addWhale()
    this.addDragon()
    this.addTurtle()
  }

  private addShark(
    id: string,
    name: string,
    home: { x: number; z: number },
    arena: number,
    hp: number,
    baseY: number,
  ) {
    const group = new THREE.Group()
    const material = new THREE.MeshStandardMaterial({
      color: SHARK_MAT,
      roughness: 0.55,
      metalness: 0.18,
      flatShading: true,
    })
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 2.3, 4, 10), material)
    body.rotation.x = Math.PI / 2
    group.add(body)

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.52, 1.15, 8), material)
    nose.rotation.x = Math.PI / 2
    nose.position.z = 1.72
    group.add(nose)

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.46, 8, 6), new THREE.MeshStandardMaterial({
      color: '#b9c7c7',
      roughness: 0.6,
      flatShading: true,
    }))
    belly.scale.set(1, 0.55, 2.4)
    belly.position.y = -0.22
    group.add(belly)

    const dorsal = new THREE.Mesh(FIN_GEO, material)
    dorsal.rotation.y = Math.PI / 2
    dorsal.position.set(0, 0.46, -0.06)
    dorsal.scale.set(0.9, 1.15, 1)
    group.add(dorsal)

    const tailPivot = new THREE.Group()
    tailPivot.position.z = -1.55
    const tail = new THREE.Mesh(FIN_GEO, material)
    tail.rotation.y = -Math.PI / 2
    tail.rotation.z = 0.3
    tail.position.set(0, 0.32, -0.42)
    tail.scale.set(0.8, 1.5, 1)
    tailPivot.add(tail)
    const lower = new THREE.Mesh(FIN_GEO, material)
    lower.rotation.y = -Math.PI / 2
    lower.rotation.z = Math.PI - 0.35
    lower.position.set(0, -0.45, -0.25)
    lower.scale.set(0.7, 1.0, 1)
    tailPivot.add(lower)
    group.add(tailPivot)

    for (const side of [-1, 1]) {
      const fin = new THREE.Mesh(FIN_GEO, material)
      fin.rotation.set(0.1, side * Math.PI / 2, side * 0.45)
      fin.position.set(side * 0.45, -0.18, 0.3)
      fin.scale.set(0.8, 0.9, 1)
      group.add(fin)
      const eye = new THREE.Mesh(EYE_GEO, EYE_MAT)
      eye.position.set(side * 0.3, 0.16, 1.15)
      group.add(eye)
    }

    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), MOUTH_MAT)
    mouth.position.set(0, -0.37, 1.45)
    group.add(mouth)

    group.scale.setScalar(1.35)
    group.position.set(home.x, baseY, home.z)
    this.group.add(group)
    markCreature(group, id)
    this.creatures.push({
      id,
      kind: 'shark',
      name,
      group,
      material,
      accent: EYE_MAT,
      home: new THREE.Vector2(home.x, home.z),
      arena,
      baseY,
      radius: 2.4,
      hp,
      maxHp: hp,
      boss: false,
      alive: true,
      state: 'patrol',
      stateT: 0,
      attackCd: 0,
      skillT: 0,
      skillLabel: '',
      hitFlash: 0,
      speed: 2.6,
      wander: Math.random() * Math.PI * 2,
      phase: 1,
      slowT: 0,
      respawnAt: 0,
      breachT: 0,
      breachCd: 0,
      breached: false,
      tail: tailPivot,
      fins: [],
      segments: [],
    })
  }

  private addWhale() {
    const id = 'whale-far'
    const group = new THREE.Group()
    const material = new THREE.MeshStandardMaterial({
      color: WHALE_MAT,
      roughness: 0.62,
      metalness: 0.08,
      flatShading: true,
    })
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(2.9, 13, 5, 12), material)
    body.rotation.x = Math.PI / 2
    group.add(body)
    const head = new THREE.Mesh(new THREE.SphereGeometry(3.15, 10, 8), material)
    head.scale.set(1, 0.9, 1.1)
    head.position.z = 7.2
    group.add(head)
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(2.6, 9, 7), new THREE.MeshStandardMaterial({
      color: '#8aa4b4',
      roughness: 0.7,
      flatShading: true,
    }))
    jaw.scale.set(1, 0.5, 1.25)
    jaw.position.set(0, -1.05, 7.6)
    group.add(jaw)
    const tailPivot = new THREE.Group()
    tailPivot.position.z = -7.4
    const fluke = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.22, 2.0), material)
    fluke.position.z = -1.1
    tailPivot.add(fluke)
    group.add(tailPivot)
    for (const side of [-1, 1]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.22, 1.1), material)
      fin.position.set(side * 3.7, -0.5, 1.2)
      fin.rotation.z = side * 0.22
      fin.rotation.y = side * -0.25
      group.add(fin)
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), EYE_MAT)
      eye.position.set(side * 2.4, 0.8, 8.5)
      group.add(eye)
    }
    const blow = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 5), MOUTH_MAT)
    blow.position.set(0, 2.75, 6.2)
    group.add(blow)
    const scars = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.04, 0.8), new THREE.MeshStandardMaterial({
      color: '#9fb6c4',
      roughness: 0.8,
    }))
    scars.position.set(0, 2.88, 1.5)
    group.add(scars)

    group.position.set(128, -2.6, 8)
    this.group.add(group)
    markCreature(group, id)
    this.creatures.push({
      id,
      kind: 'whale',
      name: '潮汐巨鲸',
      group,
      material,
      accent: EYE_MAT,
      home: new THREE.Vector2(128, 8),
      arena: 30,
      baseY: -2.6,
      radius: 8,
      hp: 4200,
      maxHp: 4200,
      boss: false,
      alive: true,
      state: 'patrol',
      stateT: 0,
      attackCd: 0,
      skillT: 0,
      skillLabel: '',
      hitFlash: 0,
      speed: 1.25,
      wander: 0.8,
      phase: 1,
      slowT: 0,
      respawnAt: 0,
      breachT: 0,
      breachCd: 18,
      breached: false,
      tail: tailPivot,
      fins: [],
      segments: [],
    })
  }

  private addDragon() {
    const id = 'boss-dragon'
    const group = new THREE.Group()
    const material = new THREE.MeshStandardMaterial({
      color: DRAGON_MAT,
      roughness: 0.4,
      metalness: 0.32,
      flatShading: true,
      emissive: '#0d3b39',
      emissiveIntensity: 0.4,
    })
    const accent = new THREE.MeshStandardMaterial({
      color: GOLD_MAT,
      roughness: 0.35,
      metalness: 0.6,
      emissive: '#6f4f16',
      emissiveIntensity: 0.4,
    })
    const head = new THREE.Mesh(new THREE.SphereGeometry(1.25, 10, 8), material)
    head.scale.set(0.95, 0.9, 1.35)
    group.add(head)
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.8, 7), material)
    snout.rotation.x = Math.PI / 2
    snout.position.z = 1.5
    group.add(snout)
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.15, 5), accent)
      horn.position.set(side * 0.72, 0.95, -0.2)
      horn.rotation.z = side * -0.42
      group.add(horn)
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), new THREE.MeshStandardMaterial({
        color: '#ffe08a',
        emissive: '#ffb13d',
        emissiveIntensity: 2.2,
        roughness: 0.2,
      }))
      eye.position.set(side * 0.52, 0.3, 0.92)
      group.add(eye)
      const whisker = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 2.2, 4), accent)
      whisker.rotation.z = side * 1.1
      whisker.position.set(side * 1.05, -0.15, 1.2)
      group.add(whisker)
      const mane = new THREE.Mesh(FIN_GEO, accent)
      mane.rotation.y = side * Math.PI / 2
      mane.position.set(side * 1.05, 0.35, -0.5)
      mane.scale.set(0.75, 1.1, 1)
      group.add(mane)
    }

    const segments: THREE.Object3D[] = []
    for (let i = 0; i < 11; i++) {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.96 - i * 0.045, 8, 7), material)
      seg.scale.set(1, 0.88, 1.15)
      seg.position.set(0, -0.1, -1.7 - i * 1.25)
      group.add(seg)
      segments.push(seg)
      const fin = new THREE.Mesh(FIN_GEO, accent)
      fin.rotation.y = Math.PI / 2
      fin.position.set(0, 0.55, -1.7 - i * 1.25)
      fin.scale.set(0.5, 0.75 - i * 0.03, 1)
      group.add(fin)
    }

    group.position.set(-82, -4.2, -58)
    this.group.add(group)
    markCreature(group, id)
    this.creatures.push({
      id,
      kind: 'dragon',
      name: '深渊龙王',
      group,
      material,
      accent,
      home: new THREE.Vector2(-82, -58),
      arena: 26,
      baseY: -4.2,
      radius: 6.5,
      hp: 1400,
      maxHp: 1400,
      boss: true,
      zone: 'trench',
      ultimate: true,
      corpseValue: 2600,
      alive: true,
      state: 'guard',
      stateT: 0,
      attackCd: 0,
      skillT: 10,
      skillLabel: '深渊漩涡',
      hitFlash: 0,
      speed: 3.2,
      wander: 0,
      phase: 1,
      slowT: 0,
      respawnAt: 0,
      breachT: 0,
      breachCd: 0,
      breached: false,
      fins: [],
      segments,
    })
  }

  private addTurtle() {
    const id = 'boss-turtle'
    const group = new THREE.Group()
    const material = new THREE.MeshStandardMaterial({
      color: TURTLE_MAT,
      roughness: 0.8,
      flatShading: true,
    })
    const shellMat = new THREE.MeshStandardMaterial({
      color: '#3f5940',
      roughness: 0.85,
      flatShading: true,
    })
    const shell = new THREE.Mesh(new THREE.SphereGeometry(3.2, 12, 8), shellMat)
    shell.scale.set(1.05, 0.55, 1.3)
    group.add(shell)
    const belly = new THREE.Mesh(new THREE.SphereGeometry(3.0, 10, 7), new THREE.MeshStandardMaterial({
      color: '#b9ad7f',
      roughness: 0.85,
      flatShading: true,
    }))
    belly.scale.set(1.0, 0.32, 1.22)
    belly.position.y = -0.45
    group.add(belly)
    for (let i = 0; i < 3; i++) {
      const ridge = new THREE.Mesh(new THREE.TorusGeometry(1.3 + i * 0.7, 0.09, 4, 18), material)
      ridge.rotation.x = Math.PI / 2
      ridge.scale.set(1, 1.3, 1)
      ridge.position.y = 1.62 - i * 0.08
      group.add(ridge)
    }
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 9, 7), material)
    head.scale.set(0.9, 0.85, 1.2)
    head.position.set(0, 0.15, 3.3)
    group.add(head)
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), material)
    snout.position.set(0, 0.02, 4.05)
    group.add(snout)
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(EYE_GEO, EYE_MAT)
      eye.position.set(side * 0.42, 0.48, 3.5)
      group.add(eye)
    }
    const fins: THREE.Object3D[] = []
    for (const side of [-1, 1]) {
      for (const z of [-1.1, 1.35]) {
        const pivot = new THREE.Group()
        pivot.position.set(side * 2.9, -0.2, z)
        const fin = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.22, 0.95), material)
        fin.position.x = side * 1.1
        pivot.add(fin)
        group.add(pivot)
        fins.push(pivot)
      }
    }
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.3, 6), material)
    tail.rotation.x = -Math.PI / 2
    tail.position.set(0, 0, -4.0)
    group.add(tail)

    const shield = new THREE.Mesh(
      new THREE.SphereGeometry(4.8, 12, 9),
      new THREE.MeshBasicMaterial({
        color: '#8fe6d6',
        transparent: true,
        opacity: 0.14,
        wireframe: true,
        depthWrite: false,
      }),
    )
    shield.visible = false
    group.add(shield)

    group.position.set(88, -4.6, -42)
    this.group.add(group)
    markCreature(group, id)
    this.creatures.push({
      id,
      kind: 'turtle',
      name: '镜湖老龟',
      group,
      material,
      accent: shellMat,
      home: new THREE.Vector2(88, -42),
      arena: 24,
      baseY: -4.6,
      radius: 5,
      hp: 1000,
      maxHp: 1000,
      boss: true,
      zone: 'mirror',
      ultimate: true,
      corpseValue: 1700,
      alive: true,
      state: 'roam',
      stateT: 0,
      attackCd: 0,
      skillT: 12,
      skillLabel: '龟壳防御',
      hitFlash: 0,
      speed: 1.8,
      wander: 0,
      phase: 1,
      slowT: 0,
      respawnAt: 0,
      breachT: 0,
      breachCd: 0,
      breached: false,
      shield,
      fins,
      segments: [],
    })
  }

  private homePoint(c: Creature, time: number) {
    const radius = c.arena * 0.5
    return new THREE.Vector3(
      c.home.x + Math.cos(time * 0.15 + c.wander) * radius,
      0,
      c.home.y + Math.sin(time * 0.11 + c.wander) * radius,
    )
  }

  private moveToward(c: Creature, target: THREE.Vector3, dt: number, speed: number) {
    const dx = target.x - c.group.position.x
    const dz = target.z - c.group.position.z
    if (Math.hypot(dx, dz) < 0.4) return
    const desired = Math.atan2(dx, dz)
    let delta = desired - c.group.rotation.y
    while (delta > Math.PI) delta -= Math.PI * 2
    while (delta < -Math.PI) delta += Math.PI * 2
    const damp = c.slowT > 0 ? 0.35 : 1
    c.group.rotation.y += delta * (1 - Math.exp(-dt * 3.2 * damp))
    const forward = new THREE.Vector3(Math.sin(c.group.rotation.y), 0, Math.cos(c.group.rotation.y))
    c.group.position.addScaledVector(forward, speed * damp * dt)
  }

  private clampToWorld(c: Creature) {
    if (this.zone === 'celestial') {
      // 云海不透底，天界的猎手必须露出云面才看得见
      const crest = this.world.waveHeight(c.group.position.x, c.group.position.z, this.clock)
      const breach = c.kind === 'dragon' ? 3.6 : c.kind === 'whale' ? 1.3 : 0.6
      c.group.position.y = clamp(c.group.position.y, crest + breach - 0.5, crest + breach + 0.9)
    } else {
      const floor = this.world.depthAt(c.group.position.x, c.group.position.z)
      const minY = c.kind === 'whale' ? -6.5 : -Math.max(1, floor - 0.9)
      const maxY = c.kind === 'whale' ? 1.5 : -0.9
      c.group.position.y = clamp(c.group.position.y, minY, maxY)
    }
    const distHome = Math.hypot(
      c.group.position.x - c.home.x,
      c.group.position.z - c.home.y,
    )
    if (distHome > c.arena) {
      const k = c.arena / distHome
      c.group.position.x = c.home.x + (c.group.position.x - c.home.x) * k
      c.group.position.z = c.home.y + (c.group.position.z - c.home.y) * k
    }
  }

  private sharkUpdate(c: Creature, dt: number, time: number, player: CreaturePlayer) {
    const pos = c.group.position
    const dist = pos.distanceTo(player.position)
    const isBoat = !player.underwater
    const detect = isBoat ? 15 : 24
    const biteRange = isBoat ? 4.4 : 2.5
    const biteDamage = isBoat ? 9 : 13

    c.attackCd = Math.max(0, c.attackCd - dt)
    c.stateT = Math.max(0, c.stateT - dt)

    if (c.state === 'retreat') {
      const away = new THREE.Vector3(
        pos.x + Math.sin(c.group.rotation.y) * -20,
        pos.y,
        pos.z + Math.cos(c.group.rotation.y) * -20,
      )
      this.moveToward(c, away, dt, 6.4)
      if (c.stateT <= 0) c.state = 'patrol'
    } else if (c.state === 'charge') {
      this.moveToward(c, player.position, dt, 8.6)
      if (dist < biteRange && c.attackCd <= 0) {
        useGameStore.getState().damagePlayer(biteDamage, isBoat ? '鲨鱼撞船' : '鲨鱼')
        audio.splash(0.9)
        this.world.foam.splash(pos.x, pos.z, 4, 0.8)
        c.attackCd = 2.1
        c.state = 'retreat'
        c.stateT = 3.8
      }
      if (dist > detect * 2.4) c.state = 'patrol'
    } else if (c.state === 'chase') {
      this.moveToward(c, player.position, dt, 5.4)
      if (dist < biteRange + 2.2) c.state = 'charge'
      if (dist > detect * 1.8) c.state = 'patrol'
    } else {
      const target = this.homePoint(c, time)
      target.y = c.baseY
      this.moveToward(c, target, dt, 2.3)
      if (dist < detect && !player.dead) c.state = 'chase'
      if (Math.random() < dt * 0.05) c.wander += Math.PI
    }

    if (c.state !== 'retreat') {
      const desiredY = player.underwater
        ? clamp(player.position.y - 0.6, -Math.max(1, this.world.depthAt(pos.x, pos.z) - 1), -0.9)
        : c.baseY
      pos.y += (desiredY - pos.y) * (1 - Math.exp(-dt * 1.8))
    }
    this.clampToWorld(c)
    if (c.tail) {
      const speedNorm = c.state === 'charge' || c.state === 'chase' ? 1 : 0.4
      c.tail.rotation.y = Math.sin(time * (4 + speedNorm * 4)) * (0.24 + speedNorm * 0.25)
    }
    c.group.rotation.z = Math.sin(time * 1.6) * 0.04
  }

  private whaleUpdate(c: Creature, dt: number, time: number, player: CreaturePlayer) {
    const target = this.homePoint(c, time * 0.6)
    target.y = c.baseY
    this.moveToward(c, target, dt, c.speed)
    this.clampToWorld(c)
    if (c.tail) c.tail.rotation.z = Math.sin(time * 1.1) * 0.18

    const dist = c.group.position.distanceTo(player.position)
    if (c.breachT > 0) {
      c.breachT += dt
      const p = clamp(c.breachT / 5.2, 0, 1)
      const lift = Math.sin(p * Math.PI) * 9.5
      c.group.position.y = c.baseY + lift
      c.group.rotation.x = Math.sin(p * Math.PI) * 0.65 - 0.15
      if (p > 0.42 && p < 0.56 && !c.breached) {
        c.breached = true
        this.world.foam.splash(c.group.position.x, c.group.position.z, 26, 1.6)
        this.world.foam.ripple(c.group.position.x, c.group.position.z, 9)
        if (dist < 12 && !player.dead) {
          useGameStore.getState().damagePlayer(16, '巨鲸跃出水面')
          player.position.x += (player.position.x - c.group.position.x) * 0.2
          player.position.z += (player.position.z - c.group.position.z) * 0.2
        }
      }
      if (p >= 1) {
        c.breachT = 0
        c.group.position.y = c.baseY
        c.group.rotation.x = 0
        this.world.foam.splash(c.group.position.x, c.group.position.z, 30, 1.8)
        audio.splash(1.2)
      }
      return
    }

    if (dist < 95) {
      c.breachCd -= dt
      if (c.breachCd <= 0) {
        c.breachCd = 26 + Math.random() * 12
        c.breachT = 0.001
        c.breached = false
      }
    }
  }

  private bossUpdate(c: Creature, dt: number, time: number, player: CreaturePlayer, canFight: boolean) {
    if (!c.alive) return
    if (c.kind === 'dragon' && this.dragonIntro >= 0) return
    const store = useGameStore.getState()
    const dist = c.group.position.distanceTo(player.position)
    const playerHomeDist = Math.hypot(player.position.x - c.home.x, player.position.z - c.home.y)
    const inArena = playerHomeDist <= c.arena + 2
    const engaged =
      canFight && !player.dead && dist < 48 && (c.kind !== 'dragon' || inArena)

    c.attackCd = Math.max(0, c.attackCd - dt)

    if (!engaged) {
      const target = this.homePoint(c, time)
      target.y = c.baseY
      this.moveToward(c, target, dt, c.speed * 0.45)
      c.group.position.y += (c.baseY - c.group.position.y) * (1 - Math.exp(-dt * 0.6))
      c.shield && (c.shield.visible = false)
      this.clampToWorld(c)
      return
    }

    if (c.phase === 1 && c.hp <= c.maxHp * 0.5) {
      c.phase = 2
      c.speed *= 1.45
      c.skillT = Math.min(c.skillT, 3)
      store.toast(`${c.name}进入狂暴阶段 · 攻击更凶了`, 'danger')
    }

    if (c.kind === 'dragon') {
      const orbit = 8 + Math.sin(time * 0.7) * 3
      const angle = time * 0.45 + (c.phase === 2 ? 0.9 : 0)
      const target = new THREE.Vector3(
        player.position.x + Math.cos(angle) * orbit,
        player.position.y - 0.8,
        player.position.z + Math.sin(angle) * orbit,
      )
      this.moveToward(c, target, dt, c.speed * (c.state === 'guard' ? 0.5 : 1))
      c.group.position.y += (target.y - c.group.position.y) * (1 - Math.exp(-dt * 1.2))
      c.skillT -= dt
      if (c.skillT <= 0) {
        c.skillT = c.phase === 2 ? 7.5 : 11
        this.vortexUntil = this.clock + 4.2
        this.vortexPos.copy(player.position)
        this.vortexPos.y = player.position.y
        const ox = this.vortexPos.x - c.home.x
        const oz = this.vortexPos.z - c.home.y
        const off = Math.hypot(ox, oz)
        const maxOff = c.arena - 2
        if (off > maxOff) {
          this.vortexPos.x = c.home.x + (ox / off) * maxOff
          this.vortexPos.z = c.home.y + (oz / off) * maxOff
        }
        this.vortex.visible = true
        this.vortex.position.copy(this.vortexPos)
        this.vortexTick = 0
        c.skillLabel = '深渊漩涡'
        this.world.foam.ripple(this.vortexPos.x, this.vortexPos.z, 6)
        store.toast('龙王搅起漩涡，快离开中心！', 'danger')
      }
      if (c.phase === 2) {
        c.segments.forEach((seg, i) => {
          seg.position.x = Math.sin(time * 2.2 + i * 0.55) * (0.5 + i * 0.07)
        })
      } else {
        c.segments.forEach((seg, i) => {
          seg.position.x = Math.sin(time * 1.3 + i * 0.5) * (0.4 + i * 0.05)
        })
      }
    } else {
      const angle = time * 0.22
      const target = new THREE.Vector3(
        player.position.x + Math.cos(angle) * 7,
        player.position.y,
        player.position.z + Math.sin(angle) * 7,
      )
      const guarding = c.state === 'guard'
      this.moveToward(c, target, dt, c.speed * (guarding ? 0.35 : 1))
      c.group.position.y += (c.baseY - c.group.position.y) * (1 - Math.exp(-dt * 0.8))
      c.fins.forEach((fin, i) => {
        fin.rotation.z = Math.sin(time * 1.4 + i * 1.2) * 0.35 + (i % 2 === 0 ? 1 : -1) * 0.2
      })
      c.skillT -= dt
      if (c.state === 'guard') {
        c.stateT -= dt
        if (c.shield) {
          c.shield.visible = true
          c.shield.rotation.y += dt * 0.6
          c.shield.rotation.x += dt * 0.25
        }
        if (c.stateT <= 0) {
          c.state = 'roam'
          if (c.shield) c.shield.visible = false
        }
      } else if (c.skillT <= 0) {
        c.state = 'guard'
        c.stateT = c.phase === 2 ? 3 : 4.5
        c.skillT = c.phase === 2 ? 10 : 14
        c.skillLabel = '龟壳防御'
        store.toast('老龟缩进壳里，正面攻击几乎无效', 'info')
      }
    }

    this.clampToWorld(c)
    c.group.rotation.z = Math.sin(time * 1.2) * 0.05
    if (dist < (c.kind === 'dragon' ? 4.2 : 5.2) && c.attackCd <= 0) {
      store.damagePlayer(c.kind === 'dragon' ? 16 : 14, c.name)
      c.attackCd = c.phase === 2 ? 1.6 : 2.4
      if (c.kind === 'dragon') {
        player.position.x += (player.position.x - c.group.position.x) * 0.06
        player.position.z += (player.position.z - c.group.position.z) * 0.06
      }
    }
  }

  update(dt: number, time: number, player: CreaturePlayer) {
    this.clock = time
    const store = useGameStore.getState()
    let engagedBoss: Creature | null = null

    const dragon = this.creatures.find((c) => c.id === 'boss-dragon')
    if (!this.dragonIntroDone && dragon) {
      const alertRange = dragon.arena + 14
      const inAlert = Math.hypot(player.position.x - dragon.home.x, player.position.z - dragon.home.y) <= alertRange
      if (inAlert || waterAt(player.position.x, player.position.z)?.id === 'trench') {
        this.startDragonIntro()
      }
    }
    this.updateDragonIntro(dt, time, player)
    if (dragon) {
      const active = this.dragonIntroDone && dragon.alive && !dragon.corpse
      this.arenaRing.visible = active && dragon.group.position.distanceTo(player.position) < 170
      if (this.arenaRing.visible) {
        this.arenaRing.position.y = this.world.waveHeight(dragon.home.x, dragon.home.y, time) + 0.12
        this.arenaRing.rotation.y += dt * 0.06
        const pulse = 0.7 + Math.sin(time * (this.dragonIntro >= 0 ? 5 : 1.6)) * 0.3
        this.arenaRing.children.forEach((ring, i) => {
          const material = (ring as THREE.Mesh).material as THREE.MeshBasicMaterial
          material.opacity = i === 2 ? 0.1 * pulse : (i === 0 ? 0.32 : 0.16) * pulse
        })
      }
    }
    if (!this.dragonIntroDone && useGameStore.getState().inputLocked) {
      useGameStore.getState().setInputLocked(false)
    }

    for (const c of this.creatures) {
      if (!c.alive) {
        if (c.marker) {
          c.marker.position.set(c.group.position.x, 0.35, c.group.position.z)
          c.marker.rotation.y += dt * 0.8
          const ring = c.marker.userData.ring as THREE.Mesh | undefined
          const glow = c.marker.userData.glow as THREE.Sprite | undefined
          if (ring) {
            const s = 1 + Math.sin(time * 2.6) * 0.12
            ring.scale.setScalar(s)
          }
          if (glow) {
            const s = 2.6 + Math.sin(time * 3.2) * 0.35
            glow.scale.set(s, s, 1)
            glow.position.y = 3.4 + Math.sin(time * 1.8) * 0.25
          }
        }
        if (c.boss && time * 1000 > c.respawnAt) this.revive(c)
        if (c.corpse) {
          c.group.visible = c.group.position.distanceTo(player.position) < 190
          const base = Number(c.group.userData.corpseBase ?? -2.2)
          c.group.position.y = base + Math.sin(time * 0.9 + c.wander) * 0.16
        }
        continue
      }
      const dist = c.group.position.distanceTo(player.position)
      c.group.visible = dist < 190
      if (!c.group.visible) continue

      if (c.slowT > 0) c.slowT = Math.max(0, c.slowT - dt)
      if (c.hitFlash > 0) {
        c.hitFlash = Math.max(0, c.hitFlash - dt)
        c.material.emissive.set('#ff6d5a')
        c.material.emissiveIntensity = c.hitFlash * 2.4
      } else if (c.kind === 'dragon') {
        c.material.emissive.set(this.zone === 'celestial' ? '#7a5410' : '#0d3b39')
        c.material.emissiveIntensity = 0.4
      } else {
        c.material.emissive.set('#000000')
        c.material.emissiveIntensity = 0
      }

      if (c.kind === 'shark') this.sharkUpdate(c, dt, time, player)
      else if (c.kind === 'whale') this.whaleUpdate(c, dt, time, player)
      else {
        const zone = waterAt(player.position.x, player.position.z)?.id
        const canFight = player.underwater || zone === c.zone
        this.bossUpdate(c, dt, time, player, canFight)
        if (canFight && !player.dead && dist < 48) engagedBoss = c
      }
    }

    if (this.vortexUntil > 0) {
      if (this.clock > this.vortexUntil) {
        this.vortexUntil = 0
        this.vortex.visible = false
      } else {
        this.vortex.rotation.y += dt * 2.4
        this.vortex.position.y += Math.sin(this.clock * 3) * dt * 0.2
        const scale = 0.85 + Math.sin(this.clock * 4) * 0.08
        this.vortex.scale.setScalar(scale)
        this.vortexTick -= dt
        const dist = Math.hypot(
          player.position.x - this.vortexPos.x,
          player.position.z - this.vortexPos.z,
        )
        if (dist < 9 && !player.dead) {
          player.position.x += (this.vortexPos.x - player.position.x) * dt * 0.55
          player.position.z += (this.vortexPos.z - player.position.z) * dt * 0.55
          if (this.vortexTick <= 0) {
            this.vortexTick = 0.9
            store.damagePlayer(7, '漩涡')
          }
        }
      }
    }

    this.bossTimer -= dt
    if (engagedBoss) {
      const c = engagedBoss as Creature
      if (this.bossTimer <= 0 || this.lastBossId !== c.id) {
        this.bossTimer = 0.2
        if (this.lastBossId !== c.id) this.lastBossId = c.id
        store.setBoss({
          id: c.id,
          name: c.name,
          hp: Math.max(0, Math.round(c.hp)),
          maxHp: c.maxHp,
          phase: c.phase,
          skill:
            this.dragonIntro >= 0 && c.kind === 'dragon'
              ? '龙王降临'
              : c.kind === 'turtle' && c.state === 'guard'
                ? '龟壳防御'
                : c.skillLabel,
          ultimate: Boolean(c.ultimate),
          realm: creatureRealm(c.kind),
        })
      }
    } else if (this.lastBossId) {
      this.lastBossId = null
      store.setBoss(null)
    }

    const stormOn =
      this.dragonIntroDone &&
      Boolean(dragon) &&
      (this.dragonIntro >= 0 ||
        (dragon!.alive && !dragon!.corpse && dragon!.group.position.distanceTo(player.position) < 130))
    this.setStorm(stormOn)
    if (!stormOn) {
      this.boltT = Math.min(this.boltT, 1.2)
    } else if (this.dragonIntro < 0) {
      this.boltT -= dt
      if (this.boltT <= 0) {
        this.boltT = 2.8 + Math.random() * 3.4
        this.world.flashLightning(0.7 + Math.random() * 0.4)
        useGameStore.getState().flashSky()
        audio.thunder()
      }
    }
  }

  private revive(c: Creature) {
    c.alive = true
    c.corpse = false
    c.hp = c.maxHp
    c.phase = 1
    c.state = c.kind === 'turtle' ? 'roam' : 'guard'
    c.group.visible = true
    c.group.position.set(c.home.x, c.baseY, c.home.y)
    c.group.rotation.set(0, c.group.rotation.y, 0)
    c.speed = c.kind === 'dragon' ? 3.2 : 1.8
    c.skillT = 10
    if (c.marker) {
      this.disposeMarker(c.marker)
      c.marker = undefined
    }
  }

  private defeat(c: Creature) {
    c.alive = false
    c.respawnAt = this.clock * 1000 + (c.boss ? 150_000 : 55_000)
    const store = useGameStore.getState()
    if (c.boss) {
      c.corpse = true
      c.state = 'corpse'
      c.group.visible = true
      c.group.position.y = Math.max(c.group.position.y, c.kind === 'dragon' ? -2.2 : -2.4)
      c.group.userData.corpseBase = c.group.position.y
      c.group.rotation.set(0, c.group.rotation.y, 0.85)
      c.marker = this.buildCorpseMarker(c.ultimate ? '#f2c15c' : '#8fe6d6')
      c.marker.position.set(c.group.position.x, 0.35, c.group.position.z)
      this.group.add(c.marker)
      store.setBoss(null)
      store.toast(`${c.name}沉入水面 · 靠近尸骸按 E 收取战利品`, 'gold')
      this.world.foam.splash(c.group.position.x, c.group.position.z, 22, 1.5)
      this.world.foam.ripple(c.group.position.x, c.group.position.z, 10)
      if (c.kind === 'dragon') {
        this.setStorm(false)
        this.world.flashLightning(1)
        store.flashSky()
        audio.thunder()
      }
    } else {
      c.group.visible = false
      store.grantMoney(60, `${c.name}被赶走了`)
    }
    audio.caught()
    gameEvents.emit('boss:defeated', {
      id: c.id,
      name: c.name,
      ultimate: Boolean(c.ultimate),
    })
    if (c.boss || c.kind === 'whale') {
      gameEvents.emit('boss:core', {
        kind: c.kind,
        name: c.name,
        x: c.group.position.x,
        z: c.group.position.z,
      })
    }
  }

  nearestHarvest(origin: THREE.Vector3) {
    let best: {
      id: string
      name: string
      distance: number
      value: number
      x: number
      z: number
    } | null = null
    for (const c of this.creatures) {
      if (c.alive || !c.corpse) continue
      const distance = c.group.position.distanceTo(origin)
      if (!best || distance < best.distance) {
        best = {
          id: c.id,
          name: c.name,
          distance,
          value: c.corpseValue ?? 600,
          x: c.group.position.x,
          z: c.group.position.z,
        }
      }
    }
    return best
  }

  harvestBoss(id: string, origin: THREE.Vector3, range = 18) {
    const c = this.creatures.find((item) => item.id === id)
    if (!c || c.alive || !c.corpse) return 0
    if (c.group.position.distanceTo(origin) > range) {
      useGameStore.getState().toast('游近一点，再收取尸骸', 'info')
      return 0
    }
    const value = c.corpseValue ?? 600
    c.corpse = false
    c.group.visible = false
    if (c.marker) {
      this.disposeMarker(c.marker)
      c.marker = undefined
    }
    c.respawnAt = this.clock * 1000 + 150_000
    const store = useGameStore.getState()
    store.grantMoney(value, `收割 ${c.name}`)
    store.toast(`取下了 ${c.name} 的鳞甲与筋腱 · +¥${value}`, 'gold')
    this.world.foam.splash(c.group.position.x, c.group.position.z, 14, 1.2)
    this.world.foam.ripple(c.group.position.x, c.group.position.z, 7)
    if (c.kind === 'dragon') this.setStorm(false)
    audio.caught()
    return value
  }

  damageCreature(id: string, amount: number, source = '武器') {
    const c = this.creatures.find((item) => item.id === id)
    if (!c || !c.alive) return 0
    const store = useGameStore.getState()
    let dmg = Math.max(1, Math.round(amount))
    if (c.kind === 'turtle' && c.state === 'guard') dmg = Math.max(1, Math.round(dmg * 0.25))
    c.hp -= dmg
    c.hitFlash = 0.35
    if (c.boss) {
      store.setBoss({
        id: c.id,
        name: c.name,
        hp: Math.max(0, Math.round(c.hp)),
        maxHp: c.maxHp,
        phase: c.phase,
        skill: c.kind === 'turtle' && c.state === 'guard' ? '龟壳防御' : c.skillLabel,
        ultimate: Boolean(c.ultimate),
        realm: creatureRealm(c.kind),
      })
    }
    if (c.hp <= 0) {
      this.defeat(c)
      return dmg
    }
    if (c.kind === 'shark') {
      c.state = 'charge'
      this.world.foam.splash(c.group.position.x, c.group.position.z, 3, 0.5)
    } else if (c.kind === 'whale') {
      c.speed = 2.4
      c.group.position.x += Math.sin(c.group.rotation.y) * 2
      c.group.position.z += Math.cos(c.group.rotation.y) * 2
    }
    store.toast(`${source}命中 ${c.name} · -${dmg}`, c.boss ? 'gold' : 'info')
    return dmg
  }

  meleeHit(origin: THREE.Vector3, direction: THREE.Vector3, range: number, damage: number) {
    let best: Creature | null = null
    let bestDist = Infinity
    for (const c of this.creatures) {
      if (!c.alive) continue
      const to = c.group.position.clone().sub(origin)
      const dist = to.length()
      if (dist > range + c.radius) continue
      if (to.normalize().dot(direction) < 0.15 && dist > c.radius) continue
      if (dist < bestDist) {
        bestDist = dist
        best = c
      }
    }
    if (!best) return 0
    return this.damageCreature(best.id, damage, '渔刀')
  }

  rayHit(origin: THREE.Vector3, direction: THREE.Vector3, range: number, damage: number) {
    this.raycaster.set(origin, direction)
    this.raycaster.far = range
    const meshes: THREE.Object3D[] = []
    for (const c of this.creatures) {
      if (c.alive && c.group.visible) meshes.push(c.group)
    }
    const hits = this.raycaster.intersectObjects(meshes, true)
    if (!hits.length) return null
    let obj: THREE.Object3D | null = hits[0].object
    let id: string | undefined
    while (obj && !id) {
      id = obj.userData.creatureId as string | undefined
      obj = obj.parent
    }
    if (!id) return null
    const dealt = this.damageCreature(id, damage, '鱼枪')
    if (!dealt) return null
    return { point: hits[0].point.clone(), dealt }
  }

  aoeHit(center: THREE.Vector3, radius: number, damage: number, slow = 0, source = '爆炸') {
    let hits = 0
    for (const c of this.creatures) {
      if (!c.alive) continue
      if (c.group.position.distanceTo(center) <= radius + c.radius) {
        if (this.damageCreature(c.id, damage, source)) {
          if (slow > 0) c.slowT = Math.max(c.slowT, slow)
          hits++
        }
      }
    }
    return hits
  }

  slowIds(ids: string[], seconds: number) {
    for (const c of this.creatures) {
      if (ids.includes(c.id)) c.slowT = Math.max(c.slowT, seconds)
    }
  }

  nearestCreatureDistance(origin: THREE.Vector3) {
    let best = Infinity
    for (const c of this.creatures) {
      if (!c.alive) continue
      best = Math.min(best, c.group.position.distanceTo(origin) - c.radius)
    }
    return best
  }

  contacts(origin: THREE.Vector3): RadarContact[] {
    const out: RadarContact[] = []
    for (const c of this.creatures) {
      if (!c.alive) continue
      const dx = c.group.position.x - origin.x
      const dz = c.group.position.z - origin.z
      const distance = Math.hypot(dx, dz)
      if (distance > 85) continue
      out.push({
        id: c.id,
        x: c.group.position.x,
        z: c.group.position.z,
        depth: -c.group.position.y,
        kind: c.kind === 'shark' ? 'shark' : c.kind === 'whale' ? 'whale' : 'boss',
        label: c.name,
        distance,
        bearing: Math.atan2(dx, dz),
      })
    }
    return out
  }

  dispose() {
    this.scene.remove(this.group)
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        const mat = obj.material as THREE.Material
        mat.dispose()
      }
    })
  }
}

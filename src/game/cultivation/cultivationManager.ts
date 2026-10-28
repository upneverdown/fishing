import * as THREE from 'three'
import type { World } from '@/game/world/world'
import type { CreatureSystem } from '@/game/creatures/creatureSystem'
import { gameEvents } from '@/game/eventBus'
import { useGameStore } from '@/store/useGameStore'
import { audio } from '@/game/audio/gameAudio'
import { clamp } from '@/game/utils/math'
import {
  SKILLS,
  coreSpec,
  isAscensionRealm,
  realmAt,
  realmAttackMul,
  skillUnlocked,
  type SkillId,
} from './realms'

export interface CultivationPlayer {
  position: THREE.Vector3
  forward: THREE.Vector3
  /** 潜水、垂钓、打开面板或死亡时不允许渡劫 */
  busy: boolean
  underwater: boolean
}

interface CoreDrop {
  id: number
  group: THREE.Group
  glow: THREE.Sprite
  ring: THREE.Mesh
  name: string
  xp: number
  age: number
  life: number
  phase: number
}

interface WaterSurge {
  group: THREE.Group
  dir: THREE.Vector3
  speed: number
  travelled: number
  range: number
  age: number
  life: number
}

interface FireSea {
  group: THREE.Group
  disc: THREE.Mesh
  embers: THREE.Points
  center: THREE.Vector3
  radius: number
  age: number
  life: number
  tick: number
  damage: number
}

interface SwordRing {
  blades: THREE.Mesh[]
  group: THREE.Group
  age: number
  life: number
  strike: number
  angle: number
  damage: number
}

interface Bolt {
  sprite: THREE.Sprite
  light: THREE.PointLight
  age: number
  life: number
}

interface Burst {
  points: THREE.Points
  velocities: Float32Array
  age: number
  life: number
}

interface Halo {
  mesh: THREE.Mesh
  age: number
  life: number
}

const TRIBULATION_STEPS = [
  { phase: 'gathering' as const, duration: 2.2 },
  { phase: 'striking' as const, duration: 3.0 },
  { phase: 'burning' as const, duration: 2.1 },
  { phase: 'ascended' as const, duration: 2.8 },
]

const CORE_LIFETIME = 240
const PICKUP_RANGE = 9

function glowTexture(inner = 'rgba(255,255,255,0.98)', middle = 'rgba(255,232,160,0.66)') {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, inner)
  g.addColorStop(0.4, middle)
  g.addColorStop(1, 'rgba(255,200,120,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function boltTexture() {
  const w = 128
  const h = 512
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, w, h)
  ctx.strokeStyle = '#fff4f6'
  ctx.shadowColor = '#ff8f7a'
  ctx.shadowBlur = 22
  ctx.lineWidth = 10
  ctx.lineJoin = 'round'
  ctx.beginPath()
  let x = w / 2
  ctx.moveTo(x, 6)
  for (let y = 34; y <= h - 6; y += 34) {
    x += (Math.random() - 0.5) * 62
    x = Math.max(14, Math.min(w - 14, x))
    ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.shadowBlur = 8
  ctx.lineWidth = 3
  ctx.strokeStyle = '#ffffff'
  ctx.stroke()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export class CultivationManager {
  readonly group = new THREE.Group()

  private cores: CoreDrop[] = []
  private surges: WaterSurge[] = []
  private fires: FireSea[] = []
  private swords: SwordRing[] = []
  private bolts: Bolt[] = []
  private bursts: Burst[] = []
  private halos: Halo[] = []

  private seq = 0
  private clock = 0
  private cooldowns: Record<SkillId, number> = { water: 0, fire: 0, sword: 0 }
  private lastCds = ''

  private pending = false
  private step = -1
  private stepT = 0
  private boltsFired = 0
  private shake = 0
  private tribFrom = ''

  private tribAscend = false
  private tribTo = ''
  private tribColor = '#ffffff'

  private coreTexture = glowTexture()
  private boltSheet = boltTexture()
  private emberTexture = glowTexture('rgba(255,246,214,0.98)', 'rgba(255,150,60,0.6)')
  private unsubscribes: (() => void)[] = []

  constructor(
    private scene: THREE.Scene,
    private world: World,
    private creatures: CreatureSystem,
  ) {
    scene.add(this.group)
    this.unsubscribes.push(
      gameEvents.on('boss:core', ({ kind, x, z }) => this.spawnCore(kind, x, z)),
      gameEvents.on('cultivation:ready', () => this.requestTribulation()),
    )
  }

  get tribulating() {
    return this.step >= 0
  }

  get cameraShake() {
    return this.shake
  }

  get hasPendingCore() {
    return this.cores.length > 0
  }

  cooldownOf(id: SkillId) {
    return this.cooldowns[id]
  }

  private spawnCore(kind: string, x: number, z: number) {
    const spec = coreSpec(kind)
    const group = new THREE.Group()
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(spec.size, 16, 12),
      new THREE.MeshStandardMaterial({
        color: spec.color,
        emissive: spec.color,
        emissiveIntensity: 1.5,
        roughness: 0.25,
        metalness: 0.1,
      }),
    )
    group.add(orb)

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.coreTexture,
        color: spec.color,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    glow.scale.setScalar(spec.size * 7)
    group.add(glow)

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(spec.size * 2.1, 0.045, 8, 28),
      new THREE.MeshBasicMaterial({
        color: spec.color,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    ring.rotation.x = Math.PI / 2
    group.add(ring)

    const light = new THREE.PointLight(new THREE.Color(spec.color).getHex(), 9, 26, 2)
    group.add(light)

    this.seq += 1
    this.cores.push({
      id: this.seq,
      group,
      glow,
      ring,
      name: spec.name,
      xp: spec.xp,
      age: 0,
      life: CORE_LIFETIME,
      phase: Math.random() * Math.PI * 2,
    })
    group.position.set(x, 0.85, z)
    this.group.add(group)
    this.world.foam.ripple(x, z, 5)
    audio.caught()
    useGameStore.getState().toast(`${spec.name}浮出水面 · 按 F 吸收`, 'gold')
  }

  nearestCore(origin: THREE.Vector3) {
    let best: CoreDrop | null = null
    let bestDistance = Infinity
    for (const core of this.cores) {
      const distance = Math.hypot(core.group.position.x - origin.x, core.group.position.z - origin.z)
      if (distance < bestDistance) {
        bestDistance = distance
        best = core
      }
    }
    if (!best || bestDistance > PICKUP_RANGE) return null
    return { id: best.id, name: best.name, xp: best.xp, distance: bestDistance }
  }

  /** 返回是否成功吸收；吸收后若修为圆满则排期渡劫 */
  absorbNearestCore(origin: THREE.Vector3) {
    const target = this.nearestCore(origin)
    if (!target) return false
    const index = this.cores.findIndex((c) => c.id === target.id)
    if (index < 0) return false
    const [core] = this.cores.splice(index, 1)
    this.group.remove(core.group)
    core.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh & { geometry?: THREE.BufferGeometry }
      mesh.geometry?.dispose?.()
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(material)) material.forEach((m) => m.dispose())
      else material?.dispose?.()
    })

    const position = core.group.position.clone()
    this.burst(position, 90, 4.2)
    this.world.foam.splash(position.x, position.z, 9, 0.9)
    audio.snap()

    const ready = useGameStore.getState().absorbCore(core.name, core.xp)
    if (ready) this.requestTribulation()
    return true
  }

  requestTribulation() {
    const state = useGameStore.getState()
    if (!Number.isFinite(realmAt(state.realm).requiredXp)) return
    if (this.tribulating) return
    this.pending = true
    state.toast('丹田发热 · 天象有变，静待雷劫', 'gold')
  }

  private startTribulation() {
    const state = useGameStore.getState()
    const from = realmAt(state.realm)
    const to = realmAt(state.realm + 1)
    this.pending = false
    this.step = 0
    this.stepT = 0
    this.boltsFired = 0
    this.tribFrom = from.name
    this.tribTo = to.name
    this.tribColor = to.color
    this.tribAscend = isAscensionRealm(state.realm)
    state.setInputLocked(true)
    state.setTribulation({
      phase: 'gathering',
      bolt: 0,
      totalBolts: 3,
      fromName: from.name,
      toName: to.name,
      color: to.color,
    })
    this.world.setDoom(1)
    state.toast('雷劫将至 · 稳住道心', 'danger')
    audio.thunder()
  }

  private advanceStep() {
    this.step += 1
    this.stepT = 0
    const state = useGameStore.getState()
    if (this.step >= TRIBULATION_STEPS.length) {
      this.endTribulation()
      return
    }
    const definition = TRIBULATION_STEPS[this.step]
    if (definition.phase === 'ascended') {
      state.applyBreakthrough()
      if (this.tribAscend) state.markAscended()
      this.world.setDoom(0)
      state.flashSky()
    }
    state.setTribulation({
      phase: definition.phase,
      bolt: this.boltsFired,
      totalBolts: 3,
      fromName: this.tribFrom,
      toName: this.tribTo,
      color: this.tribColor,
    })
  }

  private endTribulation() {
    const state = useGameStore.getState()
    this.step = -1
    this.stepT = 0
    this.boltsFired = 0
    this.shake = 0
    this.pending = false
    this.world.setDoom(0)
    state.setTribulation(null)
    state.setInputLocked(false)
    this.unlockToast()
    if (this.tribAscend) {
      this.tribAscend = false
      gameEvents.emit('ascension:gate', { at: this.clock })
    }
  }

  private unlockToast() {
    const state = useGameStore.getState()
    const unlocked = SKILLS.filter((s) => s.realmIndex === state.realm)
    for (const skill of unlocked) {
      state.toast(`解锁神通 ${skill.key} · ${skill.name}`, 'gold')
    }
  }

  /** 死亡或存档重置时立即结算，避免操作权被锁死 */
  abort() {
    if (!this.tribulating) {
      this.pending = false
      return
    }
    useGameStore.getState().applyBreakthrough()
    this.endTribulation()
    this.clearVisuals()
  }

  private clearVisuals() {
    for (const bolt of this.bolts) this.remove(bolt.sprite)
    this.bolts.length = 0
    for (const burst of this.bursts) this.remove(burst.points)
    this.bursts.length = 0
    for (const halo of this.halos) this.remove(halo.mesh)
    this.halos.length = 0
    this.world.setDoom(0)
  }

  private remove(object: THREE.Object3D) {
    this.group.remove(object)
    object.traverse((obj) => {
      const mesh = obj as THREE.Mesh & { geometry?: THREE.BufferGeometry }
      mesh.geometry?.dispose?.()
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(material)) material.forEach((m) => m.dispose())
      else material?.dispose?.()
    })
  }

  private burst(at: THREE.Vector3, count: number, spread: number) {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * spread
      positions[i * 3] = at.x + Math.cos(angle) * 0.4
      positions[i * 3 + 1] = at.y + 0.4 + Math.random() * 1.2
      positions[i * 3 + 2] = at.z + Math.sin(angle) * 0.4
      velocities[i * 3] = Math.cos(angle) * radius * 0.9
      velocities[i * 3 + 1] = 2.4 + Math.random() * radius
      velocities[i * 3 + 2] = Math.sin(angle) * radius * 0.9
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 0.55,
        map: this.emberTexture,
        color: '#ffd28a',
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    )
    points.frustumCulled = false
    this.group.add(points)
    this.bursts.push({ points, velocities, age: 0, life: 1.5 })
  }

  update(dt: number, time: number, player: CultivationPlayer) {
    const state = useGameStore.getState()
    this.clock += dt

    for (const key of Object.keys(this.cooldowns) as SkillId[]) {
      this.cooldowns[key] = Math.max(0, this.cooldowns[key] - dt)
    }
    this.syncCooldownHud(state)

    if (this.pending && !player.busy && !this.tribulating) this.startTribulation()

    if (this.tribulating) {
      const definition = TRIBULATION_STEPS[this.step]
      this.stepT += dt
      if (definition.phase === 'striking') {
        const wanted = Math.min(3, Math.floor(this.stepT / 0.92) + 1)
        while (this.boltsFired < wanted) {
          this.boltsFired += 1
          this.strikeLightning(player.position, this.boltsFired)
        }
      }
      if (definition.phase === 'burning' && this.stepT < dt * 2) {
        this.burst(player.position.clone(), 220, 7)
        audio.thunder()
      }
      if (definition.phase === 'ascended' && this.stepT < dt * 2) {
        this.ascend(player.position, definition.duration)
      }
      this.shake = definition.phase === 'striking' ? 1 : definition.phase === 'gathering' ? 0.16 : 0.28
      if (this.stepT >= definition.duration) this.advanceStep()
      const hud = state.tribulation
      if (hud && hud.phase === 'striking' && hud.bolt !== this.boltsFired) {
        state.setTribulation({ ...hud, bolt: this.boltsFired })
      }
    } else {
      this.shake = Math.max(0, this.shake - dt * 3.2)
    }

    for (let i = this.cores.length - 1; i >= 0; i--) {
      const core = this.cores[i]
      core.age += dt
      const wave = this.world.waveHeight(core.group.position.x, core.group.position.z, time)
      core.group.position.y = wave + 0.75 + Math.sin(time * 1.4 + core.phase) * 0.22
      core.group.rotation.y += dt * 0.9
      core.ring.rotation.z += dt * 1.6
      core.glow.material.opacity = 0.75 + Math.sin(time * 3.1 + core.phase) * 0.18
      if (core.age > core.life) {
        this.cores.splice(i, 1)
        this.remove(core.group)
      }
    }

    for (let i = this.surges.length - 1; i >= 0; i--) {
      const surge = this.surges[i]
      surge.age += dt
      surge.travelled += surge.speed * dt
      surge.group.position.addScaledVector(surge.dir, surge.speed * dt)
      const k = surge.age / surge.life
      surge.group.scale.setScalar(1 + k * 1.5)
      surge.group.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        const material = mesh.material as THREE.MeshBasicMaterial | undefined
        if (material?.opacity !== undefined) material.opacity = 0.85 * (1 - k)
      })
      if (surge.age >= surge.life || surge.travelled > surge.range) {
        this.surges.splice(i, 1)
        this.remove(surge.group)
      }
    }

    for (let i = this.fires.length - 1; i >= 0; i--) {
      const fire = this.fires[i]
      fire.age += dt
      const k = fire.age / fire.life
      const wave = Math.sin(time * 6) * 0.06
      fire.disc.scale.set(fire.radius * (1.45 + k * 0.5 + wave), fire.radius * (1.1 + k * 0.4), 1)
      ;(fire.disc.material as THREE.MeshBasicMaterial).opacity = 0.78 * (1 - k * k)
      const positions = fire.embers.geometry.getAttribute('position') as THREE.BufferAttribute
      const array = positions.array as Float32Array
      for (let p = 0; p < array.length; p += 3) {
        array[p + 1] += dt * (1.6 + (p % 7) * 0.12)
        if (array[p + 1] > 6) array[p + 1] = 0.2
      }
      positions.needsUpdate = true
      ;(fire.embers.material as THREE.PointsMaterial).opacity = 0.9 * (1 - k)

      fire.tick -= dt
      if (fire.tick <= 0 && fire.age < fire.life) {
        fire.tick = 0.55
        const hits = this.creatures.aoeHit(fire.center, fire.radius, fire.damage, 0, '火龙术')
        if (hits) this.world.foam.splash(fire.center.x, fire.center.z, 6, 0.5)
      }
      if (fire.age >= fire.life) {
        this.fires.splice(i, 1)
        this.remove(fire.group)
      }
    }

    for (let i = this.swords.length - 1; i >= 0; i--) {
      const ring = this.swords[i]
      ring.age += dt
      ring.angle += dt * 3.4
      ring.group.position.copy(player.position)
      ring.group.position.y += 1.5
      for (let b = 0; b < ring.blades.length; b++) {
        const blade = ring.blades[b]
        const a = ring.angle + (b / ring.blades.length) * Math.PI * 2
        blade.position.set(Math.cos(a) * 3.4, Math.sin(a * 0.8) * 0.5, Math.sin(a) * 3.4)
        blade.rotation.y = -a + Math.PI / 2
        blade.rotation.z = Math.sin(ring.age * 6 + b) * 0.2
      }
      ring.strike -= dt
      if (ring.strike <= 0) {
        ring.strike = 0.6
        const contact = this.nearestContact(player.position, 30)
        if (contact) {
          this.creatures.damageCreature(contact.id, ring.damage, '万剑归宗')
          const at = new THREE.Vector3(contact.x, 0.6, contact.z)
          this.burst(at, 26, 1.6)
        }
      }
      const fade = 1 - clamp((ring.age - (ring.life - 0.8)) / 0.8, 0, 1)
      ring.group.scale.setScalar(0.6 + fade * 0.4)
      if (ring.age >= ring.life) {
        this.swords.splice(i, 1)
        this.remove(ring.group)
      }
    }

    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const bolt = this.bolts[i]
      bolt.age += dt
      const k = bolt.age / bolt.life
      bolt.sprite.material.opacity = 1 - k
      bolt.sprite.scale.set(7 + k * 6, 60, 1)
      bolt.light.intensity = Math.max(0, (1 - k) * 900)
      if (bolt.age >= bolt.life) {
        this.bolts.splice(i, 1)
        this.remove(bolt.sprite)
        this.group.remove(bolt.light)
      }
    }

    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i]
      burst.age += dt
      const positions = burst.points.geometry.getAttribute('position') as THREE.BufferAttribute
      const array = positions.array as Float32Array
      for (let p = 0; p < array.length; p += 3) {
        array[p] += burst.velocities[p] * dt
        array[p + 1] += burst.velocities[p + 1] * dt
        array[p + 2] += burst.velocities[p + 2] * dt
        burst.velocities[p + 1] -= 5.4 * dt
      }
      positions.needsUpdate = true
      ;(burst.points.material as THREE.PointsMaterial).opacity = 0.95 * (1 - burst.age / burst.life)
      if (burst.age >= burst.life) {
        this.bursts.splice(i, 1)
        this.remove(burst.points)
      }
    }

    for (let i = this.halos.length - 1; i >= 0; i--) {
      const halo = this.halos[i]
      halo.age += dt
      const k = halo.age / halo.life
      halo.mesh.scale.setScalar(1 + k * 4.2)
      halo.mesh.rotation.z += dt * 1.2
      ;(halo.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k)
      if (halo.age >= halo.life) {
        this.halos.splice(i, 1)
        this.remove(halo.mesh)
      }
    }
  }

  private nearestContact(origin: THREE.Vector3, range: number) {
    const contacts = this.creatures.contacts(origin)
    let best: (typeof contacts)[number] | null = null
    for (const contact of contacts) {
      if (contact.distance > range) continue
      if (!best || contact.distance < best.distance) best = contact
    }
    return best
  }

  private syncCooldownHud(state: ReturnType<typeof useGameStore.getState>) {
    const signature = `${state.realm}|${SKILLS.map((s) => Math.ceil(this.cooldowns[s.id] * 5)).join(',')}`
    if (signature === this.lastCds) return
    this.lastCds = signature
    state.setSkillCds(
      SKILLS.map((skill) => ({
        id: skill.id,
        key: skill.key,
        name: skill.name,
        color: skill.color,
        left: Math.max(0, this.cooldowns[skill.id]),
        total: skill.cooldown,
        locked: !skillUnlocked(skill, state.realm),
        needRealm: realmAt(skill.realmIndex).name,
      })),
    )
  }

  private strikeLightning(at: THREE.Vector3, index: number) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.boltSheet,
        color: index === 3 ? '#ffe6b0' : '#ffd2d0',
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    sprite.scale.set(7, 60, 1)
    sprite.position.set(at.x, at.y + 30, at.z)
    sprite.material.rotation = (Math.random() - 0.5) * 0.2
    this.group.add(sprite)

    const light = new THREE.PointLight(0xffdcd2, 900, 90, 2)
    light.position.set(at.x, at.y + 12, at.z)
    this.group.add(light)

    this.bolts.push({ sprite, light, age: 0, life: 0.42 })
    this.world.flashLightning(1.2)
    this.world.foam.splash(at.x, at.z, 26, 1.6)
    this.world.foam.ripple(at.x, at.z, 12)
    audio.thunder()
    useGameStore.getState().flashSky()
  }

  private ascend(at: THREE.Vector3, duration: number) {
    const realm = realmAt(useGameStore.getState().realm)
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(2.1, 2.9, 40),
      new THREE.MeshBasicMaterial({
        color: realm.color,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    halo.rotation.x = -Math.PI / 2
    halo.position.set(at.x, at.y + 0.4, at.z)
    this.group.add(halo)
    this.halos.push({ mesh: halo, age: 0, life: duration })

    this.burst(at.clone(), 180, 9)
    this.world.foam.ripple(at.x, at.z, 16)
    audio.thunder()
  }

  // 技能：御水诀
  castWater(player: CultivationPlayer) {
    const state = useGameStore.getState()
    if (!skillUnlocked(SKILLS[0], state.realm)) {
      state.toast(`御水诀需突破至${realmAt(SKILLS[0].realmIndex).name}`, 'info')
      return false
    }
    if (this.cooldowns.water > 0) return false

    this.cooldowns.water = SKILLS[0].cooldown
    const damage = Math.round(SKILLS[0].damage * realmAttackMul(state.realm))
    const group = new THREE.Group()
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.8 + i * 0.9, 0.16, 8, 26, Math.PI * 1.15),
        new THREE.MeshBasicMaterial({
          color: i === 0 ? '#d8fbff' : '#6fd8ff',
          transparent: true,
          opacity: 0.8 - i * 0.12,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      ring.rotation.x = -Math.PI / 2
      ring.rotation.z = Math.PI / 2
      ring.position.y = 0.25 + i * 0.1
      group.add(ring)
    }
    group.position.copy(player.position)
    group.position.y = this.world.waveHeight(player.position.x, player.position.z, this.clock) + 0.2
    group.rotation.y = Math.atan2(player.forward.x, player.forward.z)
    this.group.add(group)
    this.surges.push({
      group,
      dir: new THREE.Vector3(player.forward.x, 0, player.forward.z).normalize(),
      speed: 34,
      travelled: 0,
      range: 26,
      age: 0,
      life: 0.8,
    })

    const hits: string[] = []
    for (const contact of this.creatures.contacts(player.position)) {
      if (contact.distance > 26) continue
      const dx = contact.x - player.position.x
      const dz = contact.z - player.position.z
      const dot = (dx * player.forward.x + dz * player.forward.z) / Math.max(1, contact.distance)
      if (dot < 0.45) continue
      if (this.creatures.damageCreature(contact.id, damage, '御水诀')) hits.push(contact.id)
    }
    this.creatures.slowIds(hits, 2.6)
    this.world.foam.splash(player.position.x, player.position.z, 14, 1)
    audio.splash(hits.length ? 1.4 : 0.9)
    if (!hits.length) state.toast('御水诀冲出一道水墙 · 附近没有海怪', 'info')
    else state.toast(`御水诀命中 ${hits.length} 只海怪并令其迟滞 · 伤害 ${damage}`, 'gold')
    return true
  }

  // 技能：火龙术
  castFire(player: CultivationPlayer) {
    const state = useGameStore.getState()
    if (!skillUnlocked(SKILLS[1], state.realm)) {
      state.toast(`火龙术需突破至${realmAt(SKILLS[1].realmIndex).name}`, 'info')
      return false
    }
    if (this.cooldowns.fire > 0) return false

    const target = this.nearestContact(player.position, 42)
    if (!target) {
      state.toast('四周没有锁定目标 · 火龙术留待下次', 'info')
      return false
    }
    this.cooldowns.fire = SKILLS[1].cooldown

    const radius = 8.5
    const center = new THREE.Vector3(target.x, 0, target.z)
    const group = new THREE.Group()
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1, 34),
      new THREE.MeshBasicMaterial({
        color: '#ff9a52',
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    )
    disc.rotation.x = -Math.PI / 2
    disc.scale.set(radius, radius * 0.78, 1)
    group.add(disc)

    const count = 150
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = Math.random() * radius * 0.9
      positions[i * 3] = center.x + Math.cos(angle) * r
      positions[i * 3 + 1] = 0.2 + Math.random() * 1.2
      positions[i * 3 + 2] = center.z + Math.sin(angle) * r
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const embers = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 0.75,
        map: this.emberTexture,
        color: '#ffb257',
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    embers.frustumCulled = false
    group.add(embers)

    const light = new THREE.PointLight(0xff8a3d, 260, 46, 2)
    light.position.set(center.x, 3, center.z)
    group.add(light)

    this.group.add(group)
    this.fires.push({
      group,
      disc,
      embers,
      center,
      radius,
      age: 0,
      life: 4.2,
      tick: 0,
      damage: Math.round(SKILLS[1].damage * realmAttackMul(state.realm)),
    })
    this.world.foam.splash(center.x, center.z, 12, 0.8)
    audio.thunder()
    state.toast(`火龙术 · ${target.label}脚下燃起火海`, 'gold')
    return true
  }

  // 技能：万剑归宗
  castSword(player: CultivationPlayer) {
    const state = useGameStore.getState()
    if (!skillUnlocked(SKILLS[2], state.realm)) {
      state.toast(`万剑归宗需突破至${realmAt(SKILLS[2].realmIndex).name}`, 'info')
      return false
    }
    if (this.cooldowns.sword > 0) return false

    this.cooldowns.sword = SKILLS[2].cooldown
    const group = new THREE.Group()
    const blades: THREE.Mesh[] = []
    const bladeGeometry = new THREE.BoxGeometry(0.14, 1.5, 0.42)
    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: '#dfe9ff',
      emissive: '#b9a6ff',
      emissiveIntensity: 0.8,
      roughness: 0.25,
      metalness: 0.6,
    })
    for (let i = 0; i < 7; i++) {
      const blade = new THREE.Mesh(bladeGeometry, bladeMaterial)
      blade.castShadow = false
      group.add(blade)
      blades.push(blade)
    }
    const trail = new THREE.Mesh(
      new THREE.RingGeometry(3.1, 3.6, 32),
      new THREE.MeshBasicMaterial({
        color: '#e2c8ff',
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    trail.rotation.x = -Math.PI / 2
    group.add(trail)

    group.position.copy(player.position)
    this.group.add(group)
    this.swords.push({
      blades,
      group,
      age: 0,
      life: 9,
      strike: 0,
      angle: 0,
      damage: Math.round(SKILLS[2].damage * realmAttackMul(state.realm)),
    })
    audio.snap()
    state.toast('万剑归宗 · 飞剑绕身追斩海怪', 'gold')
    return true
  }

  dispose() {
    for (const off of this.unsubscribes) off()
    this.unsubscribes.length = 0
    for (const core of this.cores) this.remove(core.group)
    this.cores.length = 0
    for (const surge of this.surges) this.remove(surge.group)
    this.surges.length = 0
    for (const fire of this.fires) this.remove(fire.group)
    this.fires.length = 0
    for (const ring of this.swords) this.remove(ring.group)
    this.swords.length = 0
    this.clearVisuals()
    this.scene.remove(this.group)
    this.coreTexture.dispose()
    this.boltSheet.dispose()
    this.emberTexture.dispose()
  }
}

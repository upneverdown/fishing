import * as THREE from 'three'
import { runeRing, softSprite } from '@/game/celestial/celestialTextures'
import { playerMaxHp } from '@/game/cultivation/realms'
import {
  FACTIONS,
  mirrorName,
  rivalFaction,
  type FactionDef,
  type FactionId,
} from '@/game/cultivation/factions'

const TAU = Math.PI * 2

/** 擂台落在仙界地图中央偏北，避开接引仙阵与首领擂台 */
export const CONTEST_POINT = { x: 0, z: 105 }
export const CONTEST_RADIUS = 26
/** 对手被击溃前会一直压着这个半径打 */
export const CONTEST_KEEP = 6.5

export interface ContestOpening {
  realm: number
  faction: FactionId
}

export interface ContestTick {
  /** 这一帧镜像对玩家造成的伤害 */
  damage: number
  /** 伤害来源名，用于死亡提示 */
  label: string
}

interface Mirror {
  group: THREE.Group
  disc: THREE.Mesh
  orb: THREE.Mesh
  aura: THREE.Points
  drift: number
}

/** 宗门大比：擂台、结界与心魔镜像的全部 3D 内容 */
export class ContestArena {
  readonly group = new THREE.Group()

  /** 擂台本体常年立在仙界，结界与镜像只在开打时出现 */
  private stage: THREE.Group
  private combat: THREE.Group
  private barrier: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>
  private mirror: Mirror | null = null
  private runes: THREE.Group | null = null

  private sprite = softSprite(64)
  private disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = []
  private barrierMat: THREE.MeshBasicMaterial

  private hp = 0
  private maxHp = 0
  private attackTimer = 0
  private attackInterval = 2.2
  private strikeFlash = 0

  active = false
  opponentName = ''
  opponentFaction: FactionId = 'immortal'

  constructor(scene: THREE.Scene) {
    this.disposables.push(this.sprite)
    scene.add(this.group)
    this.stage = this.buildPlatform()
    this.combat = new THREE.Group()
    this.group.add(this.combat)
    this.barrier = this.buildBarrier()
    this.barrierMat = this.barrier.material
    this.combat.visible = false
    this.stage.visible = false
  }

  private buildPlatform() {
    const group = new THREE.Group()
    group.position.set(CONTEST_POINT.x, -0.55, CONTEST_POINT.z)

    const rock = this.mat({ color: '#20304a', roughness: 0.92 })
    const pale = this.mat({ color: '#dfe9ff', roughness: 0.78 })
    const gold = this.mat({
      color: '#ffe2a8',
      emissive: '#ffbe5c',
      emissiveIntensity: 0.9,
      metalness: 0.5,
      roughness: 0.3,
    })

    const floor = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(CONTEST_RADIUS, CONTEST_RADIUS * 0.94, 1.1, 48)), rock)
    group.add(floor)

    const inlay = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(CONTEST_RADIUS * 0.82, CONTEST_RADIUS * 0.82, 0.32, 48)), pale)
    inlay.position.y = 0.62
    group.add(inlay)

    const runes = new THREE.Group()
    for (const [size, y, spin] of [
      [CONTEST_RADIUS * 1.7, 0.86, 3],
      [CONTEST_RADIUS * 1.05, 0.92, 11],
    ] as const) {
      const disc = new THREE.Mesh(
        this.geo(new THREE.PlaneGeometry(size, size)),
        new THREE.MeshBasicMaterial({
          map: this.texture(runeRing(spin, 512)),
          color: '#bfe4ff',
          transparent: true,
          opacity: 0.7,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          fog: false,
        }),
      )
      this.disposables.push(disc.material)
      disc.rotation.x = -Math.PI / 2
      disc.position.y = y
      disc.renderOrder = 3
      runes.add(disc)
    }
    this.runes = runes
    group.add(runes)

    const pillarGeo = this.geo(new THREE.CylinderGeometry(0.9, 1.35, 9, 6))
    const lampGeo = this.geo(new THREE.OctahedronGeometry(0.75, 0))
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * TAU
      const x = Math.cos(angle) * (CONTEST_RADIUS - 2.2)
      const z = Math.sin(angle) * (CONTEST_RADIUS - 2.2)
      const pillar = new THREE.Mesh(pillarGeo, pale)
      pillar.position.set(x, 4.6, z)
      const lamp = new THREE.Mesh(lampGeo, gold)
      lamp.position.set(x, 9.4, z)
      lamp.scale.set(0.8, 1.4, 0.8)
      group.add(pillar, lamp)
    }

    const ring = new THREE.Mesh(this.geo(new THREE.TorusGeometry(CONTEST_RADIUS - 1, 0.35, 8, 60)), gold)
    ring.rotation.x = Math.PI / 2
    ring.position.y = 8.9
    ring.renderOrder = 2
    group.add(ring)

    const light = new THREE.PointLight('#cfe6ff', 40, 120, 2)
    light.position.y = 12
    light.castShadow = false
    group.add(light)

    this.group.add(group)
    return group
  }

  private buildBarrier() {
    const material = new THREE.MeshBasicMaterial({
      color: '#9fd8ff',
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
    this.disposables.push(material)
    const mesh = new THREE.Mesh(
      this.geo(new THREE.CylinderGeometry(CONTEST_RADIUS - 0.6, CONTEST_RADIUS - 0.6, 15, 48, 1, true)),
      material,
    )
    mesh.position.set(CONTEST_POINT.x, 7, CONTEST_POINT.z)
    mesh.renderOrder = 5
    this.combat.add(mesh)
    return mesh
  }

  private mat(spec: THREE.MeshStandardMaterialParameters) {
    const material = new THREE.MeshStandardMaterial({ flatShading: true, fog: false, ...spec })
    this.disposables.push(material)
    return material
  }

  private geo<T extends THREE.BufferGeometry>(geometry: T): T {
    this.disposables.push(geometry)
    return geometry
  }

  private texture(tex: THREE.CanvasTexture) {
    this.disposables.push(tex)
    return tex
  }

  /** 心魔镜像：敌对阵营的一具法相，踩剑悬浮在擂台上 */
  private spawnMirror(def: FactionDef, realm: number) {
    this.clearMirror()
    const group = new THREE.Group()
    const robe = this.mat({ color: def.body, roughness: 0.8 })
    const trim = this.mat({ color: def.trim, emissive: def.trim, emissiveIntensity: 0.7, roughness: 0.55 })
    const accent = this.mat({
      color: def.accent,
      emissive: def.accent,
      emissiveIntensity: 1.6,
      roughness: 0.3,
    })
    const skin = this.mat({ color: '#e8dcc8', roughness: 0.9 })

    const body = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(0.4, 0.9, 2.4, 8)), robe)
    body.position.y = 1.2
    const head = new THREE.Mesh(this.geo(new THREE.SphereGeometry(0.4, 12, 8)), skin)
    head.position.y = 2.75
    const hood = new THREE.Mesh(this.geo(new THREE.ConeGeometry(0.66, 1.1, 8)), trim)
    hood.position.y = 3.1
    const armGeo = this.geo(new THREE.CylinderGeometry(0.18, 0.34, 1.5, 6))
    const armA = new THREE.Mesh(armGeo, robe)
    armA.position.set(0.72, 1.7, 0.1)
    armA.rotation.z = -0.7
    const armB = new THREE.Mesh(armGeo, robe)
    armB.position.set(-0.72, 1.7, 0.1)
    armB.rotation.z = 0.7
    const blade = new THREE.Mesh(this.geo(new THREE.BoxGeometry(0.16, 2.9, 0.5)), accent)
    blade.position.set(1.05, 2.1, 0.35)
    blade.rotation.z = -0.55
    const disc = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(2.4, 2.9, 0.5, 10)), trim)
    disc.position.y = -0.2
    const orb = new THREE.Mesh(this.geo(new THREE.OctahedronGeometry(0.42, 0)), accent)
    orb.position.y = 3.9

    const count = 70
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const core = new THREE.Color(def.aura.core)
    const halo = new THREE.Color(def.aura.halo)
    const mix = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * TAU
      const r = 1.6 + (i % 5) * 0.34
      positions[i * 3] = Math.cos(angle) * r
      positions[i * 3 + 1] = 0.4 + (i / count) * 3.4
      positions[i * 3 + 2] = Math.sin(angle) * r
      mix.copy(core).lerp(halo, (i % 6) / 6)
      colors[i * 3] = mix.r
      colors[i * 3 + 1] = mix.g
      colors[i * 3 + 2] = mix.b
    }
    const auraGeo = new THREE.BufferGeometry()
    auraGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    auraGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const auraMat = new THREE.PointsMaterial({
      size: def.aura.size,
      map: this.sprite,
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      opacity: def.aura.opacity,
      sizeAttenuation: true,
      blending: def.aura.rise < 0 ? THREE.NormalBlending : THREE.AdditiveBlending,
    })
    this.disposables.push(auraGeo, auraMat)
    const aura = new THREE.Points(auraGeo, auraMat)
    aura.frustumCulled = false
    aura.renderOrder = 4

    group.add(body, head, hood, armA, armB, blade, disc, orb, aura)
    group.userData.realm = realm
    this.combat.add(group)
    this.mirror = { group, disc, orb, aura, drift: Math.random() * TAU }
  }

  private clearMirror() {
    if (!this.mirror) return
    this.combat.remove(this.mirror.group)
    this.mirror.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        ;(obj.material as THREE.Material).dispose()
      }
      if (obj instanceof THREE.Points) {
        obj.geometry.dispose()
        ;(obj.material as THREE.Material).dispose()
      }
    })
    this.mirror = null
  }

  /** 报名成功：擂台亮起，镜像踏空而来 */
  begin(opening: ContestOpening) {
    const rival = rivalFaction(opening.faction)
    const def = FACTIONS[rival]
    this.opponentFaction = rival
    this.opponentName = mirrorName(rival, `第${opening.realm}重`)
    // 心魔与玩家同源，血池按玩家生命上限放大，否则渔刀三刀就散了架
    this.maxHp = playerMaxHp(opening.realm) * 5
    this.hp = this.maxHp
    this.attackInterval = Math.max(1.7, 3.4 - opening.realm * 0.14)
    // 进场大字那几秒镜像只在蓄力，别让它隔着光幕先手连击
    this.attackTimer = this.attackInterval + 2.6
    this.strikeFlash = 0
    this.active = true
    this.combat.visible = true
    this.stage.visible = true
    this.barrierMat.color.set(def.glow)
    this.spawnMirror(def, opening.realm)
    if (this.mirror) {
      this.mirror.group.position.set(CONTEST_POINT.x, 1.9, CONTEST_POINT.z - 11)
    }
  }

  end() {
    this.active = false
    this.combat.visible = false
    this.clearMirror()
  }

  /** 离开仙界时把擂台一起收进云里 */
  setZoneVisible(visible: boolean) {
    this.stage.visible = visible
  }

  get opponentHp() {
    return this.hp
  }

  get opponentMaxHp() {
    return this.maxHp
  }

  /** 玩家出手：命中距离由武器射程决定，给了方向就要求大致瞄准 */
  strike(origin: THREE.Vector3, range: number, damage: number, aim?: THREE.Vector3) {
    if (!this.active || !this.mirror) return false
    const p = this.mirror.group.position
    const dx = p.x - origin.x
    const dz = p.z - origin.z
    const distance = Math.hypot(dx, dz)
    if (distance > range) return false
    if (aim && (dx * aim.x + dz * aim.z) / Math.max(0.0001, distance) < 0.5) return false
    this.hp = Math.max(0, this.hp - Math.max(1, Math.round(damage)))
    this.mirror.group.position.y += 0.22
    this.strikeFlash = 0.18
    return true
  }

  get opponentPosition() {
    return this.mirror ? this.mirror.group.position : null
  }

  update(dt: number, time: number, player: THREE.Vector3): ContestTick {
    const tick: ContestTick = { damage: 0, label: this.opponentName }
    if (!this.active || !this.mirror) return tick

    const mirror = this.mirror
    const to = mirror.group.position
    const dx = player.x - to.x
    const dz = player.z - to.z
    const distance = Math.hypot(dx, dz) || 1

    // 基础走位：绕着玩家游走，靠到交手距离就停下打转
    mirror.drift += dt * 0.75
    const approach = distance > CONTEST_KEEP + 1.4 ? 1 : distance < CONTEST_KEEP - 2 ? -0.7 : 0
    const side = Math.sin(mirror.drift) * 0.6
    const forwardX = (dx / distance) * approach + (dz / distance) * side
    const forwardZ = (dz / distance) * approach - (dx / distance) * side
    to.x += forwardX * 5.2 * dt
    to.z += forwardZ * 5.2 * dt

    const room = CONTEST_RADIUS - 3
    const fromCenterX = to.x - CONTEST_POINT.x
    const fromCenterZ = to.z - CONTEST_POINT.z
    const fromCenter = Math.hypot(fromCenterX, fromCenterZ)
    if (fromCenter > room) {
      to.x = CONTEST_POINT.x + (fromCenterX / fromCenter) * room
      to.z = CONTEST_POINT.z + (fromCenterZ / fromCenter) * room
    }

    to.y = 1.9 + Math.sin(time * 1.3 + mirror.drift) * 0.18
    mirror.group.rotation.y = Math.atan2(dx, dz)
    mirror.orb.rotation.y = time * 1.8
    mirror.disc.rotation.y = time * 0.9
    this.tickAura(mirror, time, dt)

    this.attackTimer -= dt
    if (this.attackTimer <= 0 && distance < 17) {
      this.attackTimer = this.attackInterval
      const def = FACTIONS[this.opponentFaction]
      tick.damage = Math.max(
        4,
        Math.round((6 + (mirror.group.userData.realm as number) * 1.4) * def.attackMul),
      )
      tick.label = `${this.opponentName} · ${def.name}`
      this.strikeFlash = 0.3
    }

    this.strikeFlash = Math.max(0, this.strikeFlash - dt)
    this.barrierMat.opacity = 0.14 + Math.sin(time * 0.8) * 0.03 + this.strikeFlash * 0.5
    return tick
  }

  /** 擂台常年自转，符文环反向跟着转 */
  ambient(time: number) {
    this.stage.rotation.y = time * 0.012
    if (this.runes) this.runes.rotation.y = -time * 0.05
  }

  private tickAura(mirror: Mirror, time: number, dt: number) {
    const def = FACTIONS[this.opponentFaction]
    const attr = mirror.aura.geometry.getAttribute('position') as THREE.BufferAttribute
    const array = attr.array as Float32Array
    const rise = def.aura.rise
    for (let i = 0; i < attr.count; i++) {
      const y = i * 3 + 1
      array[y] += rise * (0.7 + (i % 4) * 0.2) * dt
      if (rise > 0 && array[y] > 4.2) array[y] = 0.3
      else if (rise < 0 && array[y] < 0.2) array[y] = 4
      array[i * 3] += Math.sin(time * 1.2 + i) * 0.012
    }
    attr.needsUpdate = true
  }

  /** 判负时把镜像按住，避免它在结算界面里继续游走 */
  freeze() {
    this.attackTimer = 999
  }

  dispose() {
    this.clearMirror()
    for (const item of this.disposables) item.dispose()
    this.group.removeFromParent()
  }
}

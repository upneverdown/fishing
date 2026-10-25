import * as THREE from 'three'
import type { World } from '@/game/world/world'
import type { Boat } from '@/game/entities/boat'
import { DOCK_POINT, WORLD_HALF } from '@/game/world/worldMap'
import { audio } from '@/game/audio/gameAudio'
import { useGameStore } from '@/store/useGameStore'
import type { SeaEventHud } from '@/types'

type SeaEventKind = SeaEventHud['kind']

interface SeaEventInfo {
  name: string
  desc: string
  danger: boolean
  reward: number
}

const EVENT_INFO: Record<SeaEventKind, SeaEventInfo> = {
  ghost: {
    name: '幽灵船',
    desc: '一艘挂着破帆的幽灵船从雾里滑出，甲板上似乎压着一只旧钱箱。',
    danger: false,
    reward: 320,
  },
  tentacle: {
    name: '海怪触手',
    desc: '船底传来闷响，几条湿滑的触手缠住了船舷，正一下下砸向甲板。',
    danger: true,
    reward: 280,
  },
  merchant: {
    name: '漂流商人',
    desc: '一名商人抱着货箱漂在碎木上，正拼命朝你挥手求救。',
    danger: false,
    reward: 300,
  },
  storm: {
    name: '暴风雨 · 桅杆断裂',
    desc: '狂风掀断了桅杆，船速骤降，船体在浪里发出不安的呻吟。',
    danger: true,
    reward: 150,
  },
}

interface Tentacle {
  group: THREE.Group
  pivots: THREE.Group[]
  base: THREE.Vector3
  hp: number
  alive: boolean
  phase: number
  slam: number
  slamDone: boolean
}

interface SeaUpdateOptions {
  canSpawn: boolean
  sailing: boolean
  paused: boolean
}

export class SeaEvents {
  private root = new THREE.Group()
  private kind: SeaEventKind | null = null
  private ghost: THREE.Group | null = null
  private ghostLantern: THREE.Mesh | null = null
  private raft: THREE.Group | null = null
  private mast: THREE.Group | null = null
  private tentacles: Tentacle[] = []

  private spawnTimer = 24 + Math.random() * 14
  private cooldown = 0
  private age = 0
  private timeLeft = 0
  private progress = 0
  private target = 1
  private hudTimer = 0
  private hitCooldown = 0
  private slamTimer = 0
  private lightningTimer = 0
  private hullTimer = 0
  private raftAttached = false
  private ghostDrift = 0
  private paused = false

  private scratch = new THREE.Vector3()
  private strikeVec = new THREE.Vector3()
  private strikeNear = new THREE.Vector3()

  constructor(
    private scene: THREE.Scene,
    private world: World,
    private boat: Boat,
  ) {
    this.root.name = 'sea-events'
    this.scene.add(this.root)
  }

  get activeKind(): SeaEventKind | null {
    return this.kind
  }

  update(dt: number, time: number, opts: SeaUpdateOptions) {
    this.hitCooldown = Math.max(0, this.hitCooldown - dt)
    this.paused = opts.paused

    if (!this.kind) {
      this.cooldown = Math.max(0, this.cooldown - dt)
      if (!opts.canSpawn || this.cooldown > 0) return
      const store = useGameStore.getState()
      if (!opts.sailing || store.dead) return
      if (Math.hypot(this.boat.position.x - DOCK_POINT.x, this.boat.position.z - DOCK_POINT.z) < 30) {
        return
      }
      this.spawnTimer -= dt
      if (this.spawnTimer <= 0) this.start(this.pickKind())
      return
    }

    if (opts.paused) return

    this.age += dt
    this.timeLeft = Math.max(0, this.timeLeft - dt)
    this.hudTimer -= dt

    if (this.kind === 'ghost') this.updateGhost(dt, time)
    else if (this.kind === 'merchant') this.updateMerchant(dt, time)
    else if (this.kind === 'tentacle') this.updateTentacles(dt, time)
    else this.updateStorm(dt)

    if (!this.kind) return

    if (this.timeLeft <= 0) {
      const timeout = {
        ghost: '幽灵船沉回雾里，只留下一圈冷雾',
        tentacle: '触手松开了船舷，缩回深水',
        merchant: '漂流商人被浪推远，没能等到救援',
        storm: '暴风雨过去，桅杆已经彻底折断',
      }[this.kind]
      if (this.kind === 'storm') this.boat.stormSpeedMul = 1
      this.finish(false, timeout)
      return
    }

    if (this.hudTimer <= 0) {
      this.hudTimer = 0.18
      useGameStore.getState().setSeaEvent(this.snapshot())
    }
  }

  private pickKind(): SeaEventKind {
    const roll = Math.random()
    if (roll < 0.29) return 'ghost'
    if (roll < 0.56) return 'merchant'
    if (roll < 0.8) return 'tentacle'
    return 'storm'
  }

  private start(kind: SeaEventKind) {
    this.kind = kind
    this.age = 0
    this.progress = 0
    this.hudTimer = 0
    this.hitCooldown = 0
    this.slamTimer = 2.4
    this.lightningTimer = 0.3
    this.hullTimer = 6
    this.raftAttached = false
    this.timeLeft = 75
    this.target = 1
    this.ghostDrift = Math.random() * Math.PI * 2

    if (kind === 'ghost') {
      this.ghost = this.buildGhostShip()
      const spot = this.waterPoint(26 + Math.random() * 12, 0.45)
      this.ghost.position.set(spot.x, 0, spot.z)
      this.root.add(this.ghost)
    } else if (kind === 'merchant') {
      this.raft = this.buildRaft()
      const spot = this.waterPoint(20 + Math.random() * 10, 0.6)
      this.raft.position.set(spot.x, 0, spot.z)
      this.root.add(this.raft)
      this.timeLeft = 85
    } else if (kind === 'tentacle') {
      this.target = 3
      this.timeLeft = 70
      this.spawnTentacles()
    } else {
      this.target = 3
      this.timeLeft = 80
      this.boat.stormSpeedMul = 0.55
      this.world.setStorm(1)
      this.world.flashLightning(1)
      audio.thunder()
      useGameStore.getState().flashSky()
      this.mast = this.buildBrokenMast()
      this.mast.position.set(0, this.boat.deck.y + 0.5, -0.15)
      this.mast.rotation.z = 0.62
      this.boat.group.add(this.mast)
    }

    const info = EVENT_INFO[kind]
    const store = useGameStore.getState()
    store.setSeaEvent(this.snapshot())
    store.toast(
      kind === 'storm'
        ? '暴风雨突然压了下来 · 桅杆断了，快按 E 抢修'
        : `海上事件 · ${info.name}`,
      kind === 'storm' || kind === 'tentacle' ? 'danger' : 'info',
    )
  }

  private startHint(): string {
    if (this.kind === 'ghost') return '靠近幽灵船，按 E 登船搜索'
    if (this.kind === 'tentacle') return '按 E 挥刀砍向最近的触手（武器也能攻击）'
    if (this.kind === 'merchant') {
      return this.raftAttached ? '保持护航，等他把货物捆好' : '靠近漂流商人，按 E 抛出缆绳'
    }
    return `按 E 抢修断裂的桅杆（${this.progress}/${this.target}）`
  }

  private snapshot(): SeaEventHud {
    const kind = this.kind ?? 'ghost'
    const info = EVENT_INFO[kind]
    return {
      kind,
      name: info.name,
      desc: info.desc,
      hint: this.startHint(),
      progress: this.kind === 'merchant' ? Math.min(this.target, this.progress) : this.progress,
      target: this.target,
      timeLeft: Math.ceil(this.timeLeft),
      danger: info.danger,
    }
  }

  private waterPoint(distance: number, angleJitter: number) {
    const fwd = this.boat.getForward(new THREE.Vector3())
    const baseAngle = Math.atan2(fwd.x, fwd.z)
    for (let i = 0; i < 18; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * Math.PI * angleJitter * 2
      const dist = distance * (0.8 + Math.random() * 0.45)
      const x = this.boat.position.x + Math.sin(angle) * dist
      const z = this.boat.position.z + Math.cos(angle) * dist
      if (Math.abs(x) > WORLD_HALF - 12 || Math.abs(z) > WORLD_HALF - 12) continue
      if (this.world.depthAt(x, z) > 1.6) return { x, z }
    }
    return { x: this.boat.position.x, z: this.boat.position.z + distance }
  }

  private buildGhostShip() {
    const group = new THREE.Group()
    const hullMat = new THREE.MeshStandardMaterial({
      color: '#1f2b30',
      roughness: 0.82,
      flatShading: true,
      emissive: '#2c5a55',
      emissiveIntensity: 0.12,
    })
    const trimMat = new THREE.MeshStandardMaterial({
      color: '#4b6f68',
      roughness: 0.6,
      flatShading: true,
      emissive: '#6fe0cf',
      emissiveIntensity: 0.18,
    })
    const sailMat = new THREE.MeshStandardMaterial({
      color: '#cfe8dd',
      roughness: 0.9,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      emissive: '#8fe6d6',
      emissiveIntensity: 0.22,
      flatShading: true,
    })

    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 6.4), hullMat)
    hull.position.y = 0.3
    const bow = new THREE.Mesh(new THREE.ConeGeometry(1.25, 2.2, 4), hullMat)
    bow.rotation.x = -Math.PI / 2
    bow.rotation.y = Math.PI / 4
    bow.position.set(0, 0.35, -4.1)
    const stern = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.5, 1.4), hullMat)
    stern.position.set(0, 0.6, 3.2)
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 6.4), trimMat)
    railL.position.set(-1.28, 0.9, 0)
    const railR = railL.clone()
    railR.position.x = 1.28
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 6.2, 6), trimMat)
    mast.position.set(0, 3.4, -0.4)
    mast.rotation.z = 0.05
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 3.2, 2, 2), sailMat)
    sail.position.set(0.1, 4.1, -0.2)
    sail.rotation.y = Math.PI / 2
    const sailTwo = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.8), sailMat)
    sailTwo.position.set(0, 1.9, -2.6)
    sailTwo.rotation.y = Math.PI / 2
    sailTwo.rotation.z = 0.12
    const lanternMat = new THREE.MeshStandardMaterial({
      color: '#9ff0df',
      emissive: '#8fe6d6',
      emissiveIntensity: 1.6,
      transparent: true,
      opacity: 0.9,
    })
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), lanternMat)
    lantern.position.set(0, 2.1, -3.9)
    const light = new THREE.PointLight('#9fe8d8', 0.9, 17, 2)
    light.position.copy(lantern.position)
    const haze = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 9),
      new THREE.MeshBasicMaterial({
        color: '#8fe6d6',
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    )
    haze.rotation.x = -Math.PI / 2
    haze.position.y = 0.08

    group.add(hull, bow, stern, railL, railR, mast, sail, sailTwo, lantern, light, haze)
    this.ghostLantern = lantern
    return group
  }

  private buildRaft() {
    const group = new THREE.Group()
    const wood = new THREE.MeshStandardMaterial({
      color: '#7a5a3c',
      roughness: 0.88,
      flatShading: true,
    })
    const woodDark = new THREE.MeshStandardMaterial({
      color: '#4e3a28',
      roughness: 0.9,
      flatShading: true,
    })
    const cloth = new THREE.MeshStandardMaterial({
      color: '#e8dcc0',
      roughness: 0.92,
      side: THREE.DoubleSide,
      flatShading: true,
    })
    for (let i = -1; i <= 1; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 3.2, 6), wood)
      log.rotation.x = Math.PI / 2
      log.position.set(i * 0.5, 0.05, 0)
      group.add(log)
    }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 2.7), woodDark)
    deck.position.y = 0.26
    group.add(deck)
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), wood)
    crate.position.set(-0.35, 0.58, 0.6)
    crate.rotation.y = 0.3
    group.add(crate)
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.4, 5), woodDark)
    mast.position.set(0.2, 1.5, -0.5)
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.3), cloth)
    sail.position.set(0.2, 1.9, -0.5)
    sail.rotation.y = Math.PI / 2
    group.add(mast, sail)

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.24, 0.68, 7),
      new THREE.MeshStandardMaterial({ color: '#3d6f73', roughness: 0.8, flatShading: true }),
    )
    body.position.set(0.35, 0.75, 0.9)
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 7, 6),
      new THREE.MeshStandardMaterial({ color: '#e6bf95', roughness: 0.7, flatShading: true }),
    )
    head.position.set(0.35, 1.19, 0.9)
    const hat = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.2, 7),
      new THREE.MeshStandardMaterial({ color: '#c9a45f', roughness: 0.85, flatShading: true }),
    )
    hat.position.set(0.35, 1.34, 0.9)
    const torch = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 6, 5),
      new THREE.MeshStandardMaterial({
        color: '#ffd27a',
        emissive: '#ffb347',
        emissiveIntensity: 1.5,
      }),
    )
    torch.position.set(-0.5, 0.95, -0.1)
    group.add(body, head, hat, torch)
    return group
  }

  private buildBrokenMast() {
    const group = new THREE.Group()
    const wood = new THREE.MeshStandardMaterial({
      color: '#6a4a30',
      roughness: 0.9,
      flatShading: true,
    })
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.1, 6), wood)
    stump.position.y = 0.2
    const spar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 2.4, 6), wood)
    spar.position.set(0.55, 1.1, 0.1)
    spar.rotation.z = -0.75
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.05),
      new THREE.MeshStandardMaterial({
        color: '#d8cbb0',
        roughness: 0.94,
        side: THREE.DoubleSide,
        flatShading: true,
      }),
    )
    cloth.position.set(1.15, 1.45, 0.1)
    cloth.rotation.y = Math.PI / 2
    cloth.rotation.z = -0.35
    group.add(stump, spar, cloth)
    return group
  }

  private spawnTentacles() {
    const count = 3
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5
      const dist = 6.5 + Math.random() * 3.2
      let x = this.boat.position.x + Math.sin(angle) * dist
      let z = this.boat.position.z + Math.cos(angle) * dist
      if (this.world.depthAt(x, z) < 1.2) {
        const spot = this.waterPoint(8, 0.9)
        x = spot.x
        z = spot.z
      }
      const tentacle = this.buildTentacle(i)
      tentacle.group.position.set(x, 0, z)
      tentacle.base.set(x, 0, z)
      this.root.add(tentacle.group)
      this.tentacles.push(tentacle)
    }
    audio.splash(1.1)
    this.world.foam.ripple(this.boat.position.x, this.boat.position.z, 5)
  }

  private buildTentacle(index: number): Tentacle {
    const group = new THREE.Group()
    const mat = new THREE.MeshStandardMaterial({
      color: '#453349',
      roughness: 0.7,
      flatShading: true,
      emissive: '#241426',
      emissiveIntensity: 0.35,
    })
    const pivots: THREE.Group[] = []
    let parent = group
    for (let i = 0; i < 6; i++) {
      const pivot = new THREE.Group()
      pivot.position.y = i === 0 ? 0 : 0.66
      const top = 0.34 * (1 - (i + 1) * 0.14)
      const bottom = 0.34 * (1 - i * 0.14)
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, 0.64, 7), mat)
      seg.position.y = 0.32
      pivot.add(seg)
      parent.add(pivot)
      parent = pivot
      pivots.push(pivot)
    }
    const suckerMat = new THREE.MeshStandardMaterial({
      color: '#8b5f7d',
      roughness: 0.55,
      flatShading: true,
      emissive: '#4a2438',
      emissiveIntensity: 0.4,
    })
    for (let i = 1; i < 5; i++) {
      const sucker = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), suckerMat)
      sucker.position.set(0, i * 0.62, 0.2)
      group.add(sucker)
    }
    return {
      group,
      pivots,
      base: new THREE.Vector3(),
      hp: 60,
      alive: true,
      phase: index * 1.7 + Math.random() * 2,
      slam: 0,
      slamDone: true,
    }
  }

  private updateGhost(dt: number, time: number) {
    if (!this.ghost) return
    this.ghostDrift += dt * 0.12
    const dx = this.boat.position.x - this.ghost.position.x
    const dz = this.boat.position.z - this.ghost.position.z
    const dist = Math.hypot(dx, dz)
    if (dist > 16) {
      this.ghost.position.x += (dx / dist) * dt * 1.5
      this.ghost.position.z += (dz / dist) * dt * 1.5
    } else {
      this.ghost.position.x += Math.cos(this.ghostDrift) * dt * 0.45
      this.ghost.position.z += Math.sin(this.ghostDrift) * dt * 0.45
    }
    const y = this.world.waveHeight(this.ghost.position.x, this.ghost.position.z, time)
    this.ghost.position.y = y + 0.02 + Math.sin(time * 0.9 + 1.3) * 0.07
    this.ghost.rotation.z = Math.sin(time * 0.7) * 0.03
    this.ghost.rotation.x = Math.sin(time * 0.55 + 1) * 0.018
    if (this.ghostLantern) {
      const mat = this.ghostLantern.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 1.2 + Math.sin(time * 2.4) * 0.5
    }
  }

  private updateMerchant(dt: number, time: number) {
    if (!this.raft) return
    const fwd = this.boat.getForward(this.scratch)
    if (this.raftAttached) {
      const backX = this.boat.position.x - fwd.x * 7.5 - fwd.z * 3.2
      const backZ = this.boat.position.z - fwd.z * 7.5 + fwd.x * 3.2
      this.raft.position.x += (backX - this.raft.position.x) * (1 - Math.exp(-dt * 2.2))
      this.raft.position.z += (backZ - this.raft.position.z) * (1 - Math.exp(-dt * 2.2))
      this.progress = Math.min(this.target, this.progress + dt)
      if (this.progress >= this.target) {
        const store = useGameStore.getState()
        store.grantMoney(EVENT_INFO.merchant.reward, '漂流商人脱险后的答谢')
        store.healPlayer(16)
        this.finish(true, '商人把货箱捆好，千恩万谢地划走了')
        return
      }
    }
    const y = this.world.waveHeight(this.raft.position.x, this.raft.position.z, time)
    this.raft.position.y = y + 0.05 + Math.sin(time * 1.6 + 0.6) * 0.05
    this.raft.rotation.z = Math.sin(time * 1.2) * 0.045
  }

  private updateTentacles(dt: number, time: number) {
    const store = useGameStore.getState()
    let alive = 0
    for (const tentacle of this.tentacles) {
      if (!tentacle.alive) continue
      alive += 1
      const y = this.world.waveHeight(tentacle.base.x, tentacle.base.z, time)
      tentacle.group.position.y = y - 0.15
      tentacle.group.rotation.y += dt * 0.22
      for (let i = 0; i < tentacle.pivots.length; i++) {
        const pivot = tentacle.pivots[i]
        const sway = Math.sin(time * 1.5 + tentacle.phase + i * 0.55)
        pivot.rotation.z = sway * (0.16 + i * 0.03)
        pivot.rotation.x = Math.cos(time * 1.2 + tentacle.phase + i * 0.4) * 0.13
      }
      if (tentacle.slam > 0) {
        tentacle.slam = Math.max(0, tentacle.slam - dt * 1.9)
        const arc = Math.sin((1 - tentacle.slam) * Math.PI)
        tentacle.group.scale.y = 1 + arc * 0.35
        tentacle.group.rotation.x = arc * 0.28
        if (!tentacle.slamDone && tentacle.slam < 0.55) {
          tentacle.slamDone = true
          this.world.foam.splash(tentacle.base.x, tentacle.base.z, 10, 1.5)
          this.world.foam.ripple(tentacle.base.x, tentacle.base.z, 2.4)
          audio.splash(0.9)
          if (this.boat.position.distanceTo(tentacle.base) < 22) {
            store.damagePlayer(4 + Math.round(Math.random() * 4), '海怪触手')
          }
        }
      } else {
        tentacle.group.scale.y += (1 - tentacle.group.scale.y) * (1 - Math.exp(-dt * 4))
        tentacle.group.rotation.x *= Math.exp(-dt * 3)
      }
    }

    if (!alive) {
      this.finish(true, '触手被尽数砍断，海面重新安静下来')
      return
    }

    this.slamTimer -= dt
    if (this.slamTimer <= 0) {
      this.slamTimer = 4.2 + Math.random() * 1.6
      const aliveList = this.tentacles.filter((t) => t.alive)
      const target = aliveList[Math.floor(Math.random() * aliveList.length)]
      target.slam = 1
      target.slamDone = false
    }
  }

  private updateStorm(dt: number) {
    this.world.setStorm(1)
    this.lightningTimer -= dt
    if (this.lightningTimer <= 0) {
      this.lightningTimer = 2.6 + Math.random() * 2.6
      this.world.flashLightning(0.7 + Math.random() * 0.45)
      audio.thunder()
      useGameStore.getState().flashSky()
    }
    this.hullTimer -= dt
    if (this.hullTimer <= 0) {
      this.hullTimer = 6.5
      if (!useGameStore.getState().dead) {
        useGameStore.getState().damagePlayer(3, '暴风雨中的巨浪')
      }
    }
    if (this.mast) {
      this.mast.rotation.z = 0.62 + Math.sin(this.age * 3.4) * 0.04
      this.mast.rotation.x = Math.sin(this.age * 2.1) * 0.03
    }
  }

  private nearestTentacle(origin: THREE.Vector3, range: number) {
    let best: Tentacle | null = null
    let bestDistance = range
    for (const tentacle of this.tentacles) {
      if (!tentacle.alive) continue
      const distance = origin.distanceTo(tentacle.base)
      if (distance < bestDistance) {
        best = tentacle
        bestDistance = distance
      }
    }
    return best
  }

  private damageTentacle(tentacle: Tentacle, damage: number) {
    if (!tentacle.alive) return
    tentacle.hp -= damage
    this.world.foam.splash(tentacle.base.x, tentacle.base.z, 5, 0.85)
    if (tentacle.hp > 0) return
    tentacle.alive = false
    tentacle.group.visible = false
    this.progress = Math.min(this.target, this.progress + 1)
    audio.caught()
    const store = useGameStore.getState()
    if (this.progress >= this.target) {
      store.grantMoney(EVENT_INFO.tentacle.reward, '击退海怪')
      this.finish(true, '最后一条触手沉进深水，船舷上的吸盘印还在')
    } else {
      store.toast(`砍断一条触手 · ${this.progress}/${this.target}`, 'gold')
      useGameStore.getState().setSeaEvent(this.snapshot())
    }
  }

  /** Called from melee / ranged weapons so ordinary attacks also cut tentacles. */
  strike(origin: THREE.Vector3, dir: THREE.Vector3, range: number, damage: number) {
    if (this.kind !== 'tentacle' || !this.tentacles.length) return false
    let hit = false
    for (const tentacle of this.tentacles) {
      if (!tentacle.alive) continue
      this.strikeVec
        .copy(tentacle.base)
        .setY(tentacle.base.y + 0.9)
        .sub(origin)
      const along = this.strikeVec.dot(dir)
      if (along < 0 || along > range + 2) continue
      this.strikeNear.copy(origin).addScaledVector(dir, along)
      this.strikeNear.y = tentacle.base.y + 0.9
      if (this.strikeNear.distanceTo(tentacle.base) > 2.6) continue
      this.damageTentacle(tentacle, damage)
      hit = true
      break
    }
    return hit
  }

  interactInfo(): { prompt: string; label: string } | null {
    if (!this.kind || this.paused) return null
    const boat = this.boat.position
    if (this.kind === 'ghost' && this.ghost) {
      if (this.ghost.position.distanceTo(boat) > 14) return null
      return { prompt: '幽灵船 · 甲板上压着一只旧钱箱', label: '登船' }
    }
    if (this.kind === 'merchant' && this.raft && !this.raftAttached) {
      if (this.raft.position.distanceTo(boat) > 12) return null
      return { prompt: '漂流商人 · 抛出缆绳把他拖稳', label: '救援' }
    }
    if (this.kind === 'tentacle') {
      if (this.hitCooldown > 0) return null
      if (!this.nearestTentacle(boat, 12)) return null
      return { prompt: '海怪触手 · 挥刀砍下去', label: '砍击' }
    }
    if (this.kind === 'storm') {
      if (this.hitCooldown > 0) return null
      return { prompt: `断裂的桅杆 · 抢修 ${this.progress}/${this.target}`, label: '修理' }
    }
    return null
  }

  interact(): boolean {
    if (!this.kind || this.paused || this.hitCooldown > 0) return false
    const store = useGameStore.getState()
    const boat = this.boat.position

    if (this.kind === 'ghost' && this.ghost) {
      if (this.ghost.position.distanceTo(boat) > 14) return false
      this.hitCooldown = 0.6
      const reward = 260 + Math.floor(Math.random() * 160)
      store.grantMoney(reward, '幽灵船上的旧钱箱')
      if (Math.random() < 0.4) store.addRelic('幽灵船残页')
      this.world.foam.splash(this.ghost.position.x, this.ghost.position.z, 8, 1.1)
      audio.thunder()
      this.finish(true, '你抓起钱箱跳回船上，幽灵船在雾里散成一缕冷光')
      return true
    }

    if (this.kind === 'merchant' && this.raft && !this.raftAttached) {
      if (this.raft.position.distanceTo(boat) > 12) return false
      this.hitCooldown = 0.6
      this.raftAttached = true
      this.target = 12
      this.progress = 0
      this.timeLeft = 12
      audio.snap()
      this.world.foam.ripple(this.raft.position.x, this.raft.position.z, 1.8)
      store.toast('缆绳抛了过去 · 保持护航 12 秒', 'info')
      store.setSeaEvent(this.snapshot())
      return true
    }

    if (this.kind === 'tentacle') {
      const tentacle = this.nearestTentacle(boat, 12)
      if (!tentacle) return false
      this.hitCooldown = 0.65
      audio.snap()
      this.damageTentacle(tentacle, 24)
      return true
    }

    if (this.kind === 'storm') {
      this.hitCooldown = 0.7
      this.progress = Math.min(this.target, this.progress + 1)
      audio.snap()
      this.world.foam.splash(boat.x, boat.z, 4, 0.7)
      if (this.progress >= this.target) {
        this.boat.stormSpeedMul = 1
        if (!store.boss) this.world.setStorm(0)
        store.grantMoney(EVENT_INFO.storm.reward, '及时抢修省下的修理费')
        store.healPlayer(10)
        this.finish(true, '桅杆临时绑牢了 · 风暴正在退去')
      } else {
        store.toast(`抢修桅杆 · ${this.progress}/${this.target}`, 'info')
        useGameStore.getState().setSeaEvent(this.snapshot())
      }
      return true
    }

    return false
  }

  cancel() {
    this.finish(false, '')
    this.spawnTimer = 26 + Math.random() * 16
  }

  private finish(_success: boolean, message: string) {
    const kind = this.kind
    if (!kind) return
    if (this.ghost) this.removeProp(this.ghost)
    if (this.raft) this.removeProp(this.raft)
    if (this.mast) {
      this.boat.group.remove(this.mast)
      this.disposeObject(this.mast)
    }
    for (const tentacle of this.tentacles) this.removeProp(tentacle.group)
    this.ghost = null
    this.ghostLantern = null
    this.raft = null
    this.mast = null
    this.tentacles = []
    this.kind = null
    this.raftAttached = false
    this.progress = 0
    this.timeLeft = 0
    this.target = 1
    if (kind === 'storm') {
      this.boat.stormSpeedMul = 1
      const store = useGameStore.getState()
      if (!store.boss) this.world.setStorm(0)
    }
    this.cooldown = 46 + Math.random() * 28
    this.spawnTimer = this.cooldown
    const store = useGameStore.getState()
    store.setSeaEvent(null)
    if (message) store.toast(message, _success ? 'gold' : 'info')
  }

  private removeProp(object: THREE.Object3D) {
    object.parent?.remove(object)
    this.disposeObject(object)
  }

  private disposeObject(object: THREE.Object3D) {
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.geometry.dispose()
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      for (const material of materials) material.dispose()
    })
  }

  dispose() {
    this.finish(false, '')
    this.scene.remove(this.root)
    this.disposeObject(this.root)
  }
}

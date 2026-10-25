import * as THREE from 'three'
import type { World } from '@/game/world/world'
import type { Boat } from '@/game/entities/boat'
import { gameEvents } from '@/game/eventBus'
import { audio } from '@/game/audio/gameAudio'
import { isModalOpen, useGameStore } from '@/store/useGameStore'
import type { ToolVariantId } from '@/game/capture/variants'

type Store = ReturnType<typeof useGameStore.getState>

interface ChestSite {
  id: string
  group: THREE.Group
  lid: THREE.Group
  beacon: THREE.Mesh
  glow: THREE.Mesh
  x: number
  y: number
  z: number
  openedAt: number
  openT: number
}

interface DriftBarrel {
  id: string
  group: THREE.Group
  x: number
  z: number
  bornAt: number
  phase: number
}

const CHEST_RESPAWN = 90_000
const CHEST_RANGE = 4.6
const SALVAGE_RANGE = 11
const RARE_VARIANTS: ToolVariantId[] = ['boomHarpoon', 'rapidHarpoon', 'abyssNet', 'stunNet']

const SITE_ANCHORS = [
  { x: 2, z: 6 },
  { x: -30, z: -42 },
  { x: 88, z: -42 },
  { x: 128, z: 8 },
  { x: 40, z: 46 },
  { x: -82, z: -58 },
]

export class TreasureSystem {
  private root = new THREE.Group()
  private chests: ChestSite[] = []
  private barrels: DriftBarrel[] = []
  private spawnTimer = 14
  private barrelSeq = 0
  private prompt: string | null = null
  private clock = 0

  constructor(
    private scene: THREE.Scene,
    private world: World,
    private boat: Boat,
  ) {
    this.root.name = 'treasures'
    this.scene.add(this.root)
    this.buildSites()
  }

  private buildSites() {
    for (let i = 0; i < SITE_ANCHORS.length; i++) {
      const anchor = SITE_ANCHORS[i]
      const site = this.findDeepSpot(anchor.x, anchor.z, 6, 3.2)
      if (!site) continue
      this.root.add(this.buildWreck(site, i))
      const chestSpot = this.findDeepSpot(site.x + 2.4, site.z + 1.6, 4, 2.8)
      if (!chestSpot) continue
      this.chests.push(this.buildChest(chestSpot, `chest-${i}`, site))
    }
  }

  private findDeepSpot(x: number, z: number, spread: number, minDepth: number) {
    for (let attempt = 0; attempt < 22; attempt++) {
      const px = x + (Math.random() - 0.5) * spread * 2
      const pz = z + (Math.random() - 0.5) * spread * 2
      const depth = this.world.depthAt(px, pz)
      if (depth >= minDepth) return { x: px, z: pz, depth }
    }
    const depth = this.world.depthAt(x, z)
    if (depth >= minDepth) return { x, z, depth }
    return null
  }

  private seabedMaterial(color: string, emissive = '#000000', intensity = 0) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.86,
      metalness: 0.06,
      flatShading: true,
      emissive,
      emissiveIntensity: intensity,
    })
  }

  private buildWreck(site: { x: number; z: number; depth: number }, index: number) {
    const group = new THREE.Group()
    group.position.set(site.x, -site.depth + 0.1, site.z)
    group.rotation.y = index * 1.37 + Math.random() * 0.8
    group.rotation.z = (Math.random() - 0.5) * 0.28
    group.rotation.x = (Math.random() - 0.5) * 0.14

    const wood = this.seabedMaterial('#4b3a2b')
    const woodDark = this.seabedMaterial('#31261c')
    const kelp = this.seabedMaterial('#365a44', '#183325', 0.15)

    const hull = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.3, 7.4), wood)
    hull.position.y = 0.5
    const broken = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 3), wood)
    broken.position.set(-2.2, 0.35, 1.7)
    broken.rotation.z = 0.45
    broken.rotation.y = 0.4
    const stern = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 1.2), woodDark)
    stern.position.set(0.3, 1.2, 3.2)
    stern.rotation.x = -0.35
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5.4, 6), woodDark)
    mast.position.set(0.6, 2.2, -1.2)
    mast.rotation.z = 1.32
    mast.rotation.y = 0.4
    group.add(hull, broken, stern, mast)

    for (let i = 0; i < 5; i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.9 + Math.random() * 0.7, 0.16), woodDark)
      rib.position.set(-1.4 + i * 0.7, 1.1, -2.6 + i * 1.1)
      rib.rotation.z = (Math.random() - 0.5) * 0.5
      group.add(rib)
    }
    for (let i = 0; i < 7; i++) {
      const weed = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.9 + Math.random() * 0.8, 4), kelp)
      weed.position.set((Math.random() - 0.5) * 5, 0.4, (Math.random() - 0.5) * 7)
      weed.rotation.z = (Math.random() - 0.5) * 0.5
      group.add(weed)
    }
    return group
  }

  private buildChest(
    spot: { x: number; z: number; depth: number },
    id: string,
    wreck: { x: number; z: number },
  ) {
    const group = new THREE.Group()
    const y = -spot.depth + 0.32
    group.position.set(spot.x, y, spot.z)
    group.rotation.y = Math.atan2(wreck.x - spot.x, wreck.z - spot.z) + 0.4

    const wood = this.seabedMaterial('#7b5433', '#3d2612', 0.22)
    const band = this.seabedMaterial('#d8b45a', '#c79a3a', 0.7)
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.62, 1.02), wood)
    base.position.y = 0.31
    const lidPivot = new THREE.Group()
    lidPivot.position.set(0, 0.62, -0.51)
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.24, 1.02), wood)
    lid.position.set(0, 0.1, 0.51)
    const bandFront = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.66, 1.06), band)
    bandFront.position.set(0, 0.31, 0)
    const bandLid = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 1.06), band)
    bandLid.position.set(0, 0.1, 0.51)
    lidPivot.add(lid, bandLid)
    group.add(base, bandFront, lidPivot)

    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.1), band)
    lock.position.set(0, 0.34, 0.53)
    group.add(lock)

    const glowMat = new THREE.MeshBasicMaterial({
      color: '#f2c15c',
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const glow = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.45, 22), glowMat)
    glow.rotation.x = -Math.PI / 2
    glow.position.y = 0.05
    group.add(glow)

    const beaconMat = new THREE.MeshBasicMaterial({
      color: '#f6d68a',
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.85, 9, 10, 1, true), beaconMat)
    beacon.position.y = 5
    group.add(beacon)

    return {
      id,
      group,
      lid: lidPivot,
      beacon,
      glow,
      x: spot.x,
      y,
      z: spot.z,
      openedAt: 0,
      openT: 0,
    }
  }

  updateSurface(dt: number, time: number, active: boolean) {
    this.clock += dt
    for (const barrel of this.barrels) {
      const wave = this.world.waveHeight(barrel.x, barrel.z, time)
      barrel.group.position.set(
        barrel.x + Math.sin(time * 0.4 + barrel.phase) * 0.25,
        wave + 0.06 + Math.sin(time * 1.3 + barrel.phase) * 0.06,
        barrel.z + Math.cos(time * 0.32 + barrel.phase) * 0.18,
      )
      barrel.group.rotation.z = Math.sin(time * 1.1 + barrel.phase) * 0.08
      barrel.group.rotation.x = Math.cos(time * 0.9 + barrel.phase) * 0.06
    }

    if (!active) return
    for (let i = this.barrels.length - 1; i >= 0; i--) {
      const barrel = this.barrels[i]
      const distance = Math.hypot(
        barrel.x - this.boat.position.x,
        barrel.z - this.boat.position.z,
      )
      if (distance > 150 || this.clock - barrel.bornAt > 240) this.removeBarrel(barrel)
    }

    if (this.barrels.length >= 4) return
    this.spawnTimer -= dt
    if (this.spawnTimer > 0) return
    this.spawnTimer = 16 + Math.random() * 12
    this.spawnBarrel()
  }

  private spawnBarrel() {
    const fwd = this.boat.getForward(new THREE.Vector3())
    const heading = Math.atan2(fwd.x, fwd.z)
    for (let attempt = 0; attempt < 12; attempt++) {
      const angle = heading + (Math.random() - 0.5) * Math.PI * 1.4
      const distance = 18 + Math.random() * 20
      const x = this.boat.position.x + Math.sin(angle) * distance
      const z = this.boat.position.z + Math.cos(angle) * distance
      if (this.world.depthAt(x, z) < 1.1) continue
      const group = this.buildBarrel()
      const barrel: DriftBarrel = {
        id: `drift-${this.barrelSeq}`,
        group,
        x,
        z,
        bornAt: this.clock,
        phase: Math.random() * Math.PI * 2,
      }
      this.barrelSeq += 1
      group.position.set(x, this.world.waveHeight(x, z, 0), z)
      this.root.add(group)
      this.barrels.push(barrel)
      return
    }
  }

  private buildBarrel() {
    const group = new THREE.Group()
    const wood = this.seabedMaterial('#8a6238')
    const hoop = this.seabedMaterial('#4b4034', '#1c1a16', 0.2)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.3, 0.82, 9), wood)
    body.rotation.z = Math.PI / 2
    body.rotation.x = 0.08
    const bandA = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 4, 10), hoop)
    bandA.rotation.y = Math.PI / 2
    bandA.position.x = 0.22
    const bandB = bandA.clone()
    bandB.position.x = -0.22
    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 4, 8), hoop)
    rope.position.set(0.35, 0.12, 0)
    rope.rotation.y = 0.4
    group.add(body, bandA, bandB, rope)
    return group
  }

  private removeBarrel(barrel: DriftBarrel) {
    this.root.remove(barrel.group)
    this.disposeObject(barrel.group)
    const index = this.barrels.indexOf(barrel)
    if (index >= 0) this.barrels.splice(index, 1)
  }

  salvageInfo(position: THREE.Vector3): string | null {
    let best: DriftBarrel | null = null
    let bestDistance = SALVAGE_RANGE
    for (const barrel of this.barrels) {
      const distance = Math.hypot(barrel.x - position.x, barrel.z - position.z)
      if (distance < bestDistance) {
        best = barrel
        bestDistance = distance
      }
    }
    return best ? '漂流木桶 · 里面有能卖钱的东西' : null
  }

  salvageNearest(store: Store): boolean {
    let best: DriftBarrel | null = null
    let bestDistance = SALVAGE_RANGE
    for (const barrel of this.barrels) {
      const distance = Math.hypot(barrel.x - this.boat.position.x, barrel.z - this.boat.position.z)
      if (distance < bestDistance) {
        best = barrel
        bestDistance = distance
      }
    }
    if (!best) return false
    this.world.foam.splash(best.x, best.z, 4, 0.7)
    this.world.foam.ripple(best.x, best.z, 1.4)
    audio.splash(0.45)
    const roll = Math.random()
    if (roll < 0.18) {
      const relic = ['漂流瓶里的旧海图', '褪色的船票', '半张潮汐手记'][
        Math.floor(Math.random() * 3)
      ]
      store.addRelic(relic)
      store.grantMoney(30 + Math.floor(Math.random() * 40), `木桶里还有一张${relic}`)
    } else if (roll < 0.55) {
      store.grantMoney(40 + Math.floor(Math.random() * 50), '打捞漂流木桶')
    } else {
      store.grantMoney(25 + Math.floor(Math.random() * 35), '木桶里是几枚湿透的硬币')
    }
    this.removeBarrel(best)
    return true
  }

  updateUnderwater(dt: number, time: number, position: THREE.Vector3, store: Store) {
    this.clock += dt
    const now = Date.now()
    let nearest: ChestSite | null = null
    let nearestDistance = CHEST_RANGE

    for (const chest of this.chests) {
      const pulse = 0.42 + Math.sin(time * 2.1 + chest.x) * 0.16
      const glowMat = chest.glow.material as THREE.MeshBasicMaterial
      glowMat.opacity = chest.openedAt ? 0 : pulse
      const beaconMat = chest.beacon.material as THREE.MeshBasicMaterial
      beaconMat.opacity = chest.openedAt ? 0 : 0.09 + Math.sin(time * 1.4 + chest.z) * 0.035
      chest.glow.rotation.z = time * 0.3

      if (chest.openedAt) {
        chest.openT = Math.min(1, chest.openT + dt * 2.6)
        chest.lid.rotation.x = -chest.openT * 1.55
        if (now - chest.openedAt > 1400) chest.group.visible = false
        if (now - chest.openedAt > CHEST_RESPAWN) {
          chest.openedAt = 0
          chest.openT = 0
          chest.lid.rotation.x = 0
          chest.group.visible = true
        }
        continue
      }

      const distance = Math.hypot(
        chest.x - position.x,
        chest.y + 0.5 - position.y,
        chest.z - position.z,
      )
      if (distance < nearestDistance) {
        nearest = chest
        nearestDistance = distance
      }
    }

    const prompt =
      nearest && !isModalOpen(store) && !store.dead ? '沉船宝箱 · 里面有东西在反光' : null
    if (prompt !== this.prompt) {
      this.prompt = prompt
      store.setChestPrompt(prompt)
    }
  }

  tryOpenChest(position: THREE.Vector3, store: Store): boolean {
    let best: ChestSite | null = null
    let bestDistance = CHEST_RANGE
    for (const chest of this.chests) {
      if (chest.openedAt) continue
      const distance = Math.hypot(
        chest.x - position.x,
        chest.y + 0.5 - position.y,
        chest.z - position.z,
      )
      if (distance < bestDistance) {
        best = chest
        bestDistance = distance
      }
    }
    if (!best) return false

    best.openedAt = Date.now()
    best.openT = 0
    this.prompt = null
    store.setChestPrompt(null)
    audio.caught()
    const roll = Math.random()
    let reward = '金币'
    if (roll < 0.54) {
      const coins = 90 + Math.floor(Math.random() * 180)
      store.grantMoney(coins, '沉船宝箱里的金币')
      reward = `金币 ×${coins}`
    } else if (roll < 0.8) {
      store.addRelic('海盗图纸')
      store.grantMoney(60 + Math.floor(Math.random() * 60), '宝箱里的海盗图纸和零钱')
      reward = '海盗图纸'
    } else {
      const variant = RARE_VARIANTS[Math.floor(Math.random() * RARE_VARIANTS.length)]
      store.grantVariant(variant)
      reward = '稀有装备'
    }
    gameEvents.emit('chest:opened', { id: best.id, reward })
    return true
  }

  clearPrompt() {
    if (this.prompt === null) return
    this.prompt = null
    useGameStore.getState().setChestPrompt(null)
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
    this.clearPrompt()
    this.scene.remove(this.root)
    this.disposeObject(this.root)
    this.barrels = []
    this.chests = []
  }
}

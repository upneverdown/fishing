import * as THREE from 'three'
import type { World } from '@/game/world/world'
import { FISH, RARITIES, fishById, type FishDef } from '@/game/fishing/fishTable'
import { SEASONS } from '@/game/world/seasons'
import { mulberry32 } from '@/game/utils/math'
import type { SeasonId } from '@/types'

const FISH_COUNT = 26
const WEED_COUNT = 88
const ROCK_COUNT = 26
const BUBBLE_COUNT = 150
const MOTES = 140

const bodyGeo = new THREE.SphereGeometry(0.22, 8, 6)
const tailGeo = new THREE.ConeGeometry(0.14, 0.32, 4)
const finGeo = new THREE.ConeGeometry(0.07, 0.2, 3)
const eyeGeo = new THREE.SphereGeometry(0.018, 5, 4)
const eyeMat = new THREE.MeshStandardMaterial({ color: '#071a1c', roughness: 0.35 })

function spriteTexture() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.95)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.45)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

const WEED_PALETTE: Record<SeasonId, string[]> = {
  spring: ['#3f7f5e', '#4a9468', '#5fa873'],
  summer: ['#2f7358', '#3d8a63', '#4f9c70'],
  autumn: ['#8a6a3a', '#a08045', '#6f7a45'],
  winter: ['#3f6f74', '#4d8288', '#5f9196'],
}

interface Swimmer {
  group: THREE.Group
  def: FishDef
  radius: number
  angle: number
  speed: number
  depthOffset: number
  phase: number
  scale: number
  closeScale: number
}

interface Weed {
  x: number
  z: number
  bottom: number
  height: number
  lean: number
  phase: number
}

interface Bubble {
  x: number
  y: number
  z: number
  speed: number
  sway: number
  phase: number
}

interface Rock {
  x: number
  z: number
  bottom: number
  scale: number
  rotation: number
}

function fishColor(def: FishDef) {
  const color = new THREE.Color(RARITIES[def.rarity].color)
  const silver = new THREE.Color('#b9d6d2')
  color.lerp(silver, def.rarity === 'common' ? 0.55 : 0.28)
  if (def.id === 'fireflybait') color.set('#d8f38a')
  if (def.id === 'abysssturgeon') color.set('#4d6a70')
  if (def.id === 'redfin') color.set('#b6543f')
  if (def.id === 'moonsturgeon') color.set('#8fa6c4')
  return color
}

export class UnderwaterWorld {
  private reserves: { swimmer: Swimmer; at: number }[] = []
  private lastTime = 0
  private group = new THREE.Group()
  private swimmers: Swimmer[] = []
  private weeds: Weed[] = []
  private rocks: Rock[] = []
  private bubbles: Bubble[] = []
  private bubblePoints: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  private motePoints: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  private weedMesh: THREE.InstancedMesh
  private rockMesh: THREE.InstancedMesh
  private season: SeasonId = 'spring'
  private decorCenter = new THREE.Vector3(9999, 0, 9999)
  private dummy = new THREE.Object3D()

  constructor(private scene: THREE.Scene, private world: World) {
    scene.add(this.group)
    this.group.visible = false

    this.weedMesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1, 1, 3),
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.92,
        side: THREE.DoubleSide,
        flatShading: true,
      }),
      WEED_COUNT,
    )
    this.weedMesh.frustumCulled = false
    this.weedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.group.add(this.weedMesh)

    this.rockMesh = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ color: '#2c4a4b', roughness: 1, flatShading: true }),
      ROCK_COUNT,
    )
    this.rockMesh.frustumCulled = false
    this.group.add(this.rockMesh)

    const bubbleGeo = new THREE.BufferGeometry()
    this.bubblePoints = new THREE.Points(
      bubbleGeo,
      new THREE.PointsMaterial({
        size: 0.12,
        map: spriteTexture(),
        color: '#c8f6f2',
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    )
    this.bubblePoints.frustumCulled = false
    this.bubblePoints.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BUBBLE_COUNT * 3), 3))
    this.group.add(this.bubblePoints)

    const moteGeo = new THREE.BufferGeometry()
    const motePositions = new Float32Array(MOTES * 3)
    for (let i = 0; i < MOTES; i++) {
      motePositions[i * 3] = (Math.random() * 2 - 1) * 18
      motePositions[i * 3 + 1] = (Math.random() * 2 - 1) * 8
      motePositions[i * 3 + 2] = (Math.random() * 2 - 1) * 18
    }
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3))
    this.motePoints = new THREE.Points(
      moteGeo,
      new THREE.PointsMaterial({
        size: 0.045,
        map: spriteTexture(),
        color: '#bfeae4',
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    )
    this.motePoints.frustumCulled = false
    this.group.add(this.motePoints)
  }

  private pickSwimmerDef(season: SeasonId) {
    const active = FISH.filter((f) => !f.seasons || f.seasons.includes(season))
    const common = active.filter((f) => f.rarity === 'common' || f.rarity === 'uncommon')
    const pool = common.length && Math.random() < 0.72 ? common : active.length ? active : FISH
    return pool[Math.floor(Math.random() * pool.length)]
  }

  private buildFish(season: SeasonId) {
    for (const swimmer of this.swimmers) {
      this.group.remove(swimmer.group)
      swimmer.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const mat = obj.material as THREE.Material
          if (mat.userData.owned) mat.dispose()
        }
      })
    }
    this.swimmers = []

    for (let i = 0; i < FISH_COUNT; i++) {
      const def = this.pickSwimmerDef(season)
      const color = fishColor(def)
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.42,
        metalness: 0.18,
        emissive: def.id === 'fireflybait' ? '#b6e86a' : '#000000',
        emissiveIntensity: def.id === 'fireflybait' ? 0.9 : 0,
        flatShading: true,
      })
      material.userData.owned = true

      const fish = new THREE.Group()
      const body = new THREE.Mesh(bodyGeo, material)
      body.scale.set(0.72, 0.82, 1.9)
      fish.add(body)

      const tail = new THREE.Mesh(tailGeo, material)
      tail.rotation.x = -Math.PI / 2
      tail.position.z = -0.52
      tail.scale.set(1.2, 1, 0.7)
      fish.add(tail)

      for (const side of [-1, 1]) {
        const fin = new THREE.Mesh(finGeo, material)
        fin.rotation.z = side * 1.2
        fin.position.set(side * 0.16, 0.02, 0.05)
        fish.add(fin)
        const eye = new THREE.Mesh(eyeGeo, eyeMat)
        eye.position.set(side * 0.08, 0.03, 0.36)
        fish.add(eye)
      }

      fish.traverse((obj) => {
        obj.userData.defId = def.id
      })

      const scale = (def.rarity === 'legendary' ? 1.5 : def.rarity === 'epic' ? 1.2 : 1) * (0.7 + Math.random() * 0.6)
      fish.scale.setScalar(scale)
      this.group.add(fish)
      this.swimmers.push({
        group: fish,
        def,
        radius: 5 + Math.random() * 18,
        angle: Math.random() * Math.PI * 2,
        speed: (0.18 + Math.random() * 0.4) * (Math.random() < 0.5 ? -1 : 1),
        depthOffset: 1.2 + Math.random() * 4.2,
        phase: Math.random() * Math.PI * 2,
        scale,
        closeScale: scale,
      })
    }

    for (const swimmer of this.swimmers) {
      const r = Math.random()
      swimmer.radius = r < 0.25 ? 4 + Math.random() * 4 : 8 + Math.random() * 17
    }
  }

  setSeason(season: SeasonId) {
    this.season = season
    this.buildFish(season)
    const palette = WEED_PALETTE[season]
    const color = new THREE.Color()
    for (let i = 0; i < WEED_COUNT; i++) {
      color.set(palette[i % palette.length])
      this.weedMesh.setColorAt(i, color)
    }
    if (this.weedMesh.instanceColor) this.weedMesh.instanceColor.needsUpdate = true
    this.regenerateDecor(this.decorCenter, true)
  }

  private regenerateDecor(center: THREE.Vector3, force = false) {
    if (!force && this.decorCenter.distanceTo(center) < 30) return
    this.decorCenter.copy(center)
    const rand = mulberry32(Math.floor(center.x * 733 + center.z * 191) + 17)
    this.weeds = []
    for (let i = 0; i < WEED_COUNT; i++) {
      const angle = rand() * Math.PI * 2
      const radius = 3 + Math.sqrt(rand()) * 30
      const x = center.x + Math.cos(angle) * radius
      const z = center.z + Math.sin(angle) * radius
      const depth = this.world.depthAt(x, z)
      if (depth < 1.1) continue
      this.weeds.push({
        x,
        z,
        bottom: -depth,
        height: 1.2 + rand() * 3.6,
        lean: rand() * Math.PI * 2,
        phase: rand() * Math.PI * 2,
      })
    }
    this.weedMesh.count = this.weeds.length

    this.rocks = []
    for (let i = 0; i < ROCK_COUNT; i++) {
      const angle = rand() * Math.PI * 2
      const radius = 4 + Math.sqrt(rand()) * 26
      const x = center.x + Math.cos(angle) * radius
      const z = center.z + Math.sin(angle) * radius
      const depth = this.world.depthAt(x, z)
      if (depth < 1.4) continue
      this.rocks.push({
        x,
        z,
        bottom: -depth,
        scale: 0.5 + rand() * 1.8,
        rotation: rand() * Math.PI,
      })
    }
    this.rockMesh.count = this.rocks.length
    for (let i = 0; i < this.rocks.length; i++) {
      const rock = this.rocks[i]
      this.dummy.position.set(rock.x, rock.bottom + rock.scale * 0.35, rock.z)
      this.dummy.rotation.set(rock.rotation, rock.rotation * 2, 0)
      this.dummy.scale.set(rock.scale, rock.scale * 0.65, rock.scale)
      this.dummy.updateMatrix()
      this.rockMesh.setMatrixAt(i, this.dummy.matrix)
    }
    this.rockMesh.instanceMatrix.needsUpdate = true

    const positions = this.bubblePoints.geometry.getAttribute('position') as THREE.BufferAttribute
    this.bubbles = []
    for (let i = 0; i < BUBBLE_COUNT; i++) {
      const x = center.x + (rand() * 2 - 1) * 22
      const z = center.z + (rand() * 2 - 1) * 22
      const depth = this.world.depthAt(x, z)
      const bubble: Bubble = {
        x,
        y: -Math.max(0.8, depth) * (0.15 + rand() * 0.8),
        z,
        speed: 0.35 + rand() * 1.1,
        sway: 0.2 + rand() * 0.6,
        phase: rand() * Math.PI * 2,
      }
      this.bubbles.push(bubble)
      positions.setXYZ(i, bubble.x, bubble.y, bubble.z)
    }
    positions.needsUpdate = true
  }

  private respawnBubble(bubble: Bubble, center: THREE.Vector3, rand: () => number) {
    bubble.x = center.x + (rand() * 2 - 1) * 22
    bubble.z = center.z + (rand() * 2 - 1) * 22
    const depth = Math.max(1.5, this.world.depthAt(bubble.x, bubble.z))
    bubble.y = -depth + rand() * 0.8
    bubble.speed = 0.35 + rand() * 1.1
    bubble.phase = rand() * Math.PI * 2
  }

  update(time: number, dt: number, center: THREE.Vector3) {
    this.group.visible = true
    this.simulate(time, dt, center)
  }

  /** Keeps fish roaming under the boat while the player is on the surface, without revealing the underwater group. */
  updateAmbient(time: number, dt: number, center: THREE.Vector3) {
    this.simulate(time, dt, center)
  }

  private simulate(time: number, dt: number, center: THREE.Vector3) {
    this.lastTime = time
    this.regenerateDecor(center)

    if (this.reserves.length) {
      const ready = this.reserves.filter((r) => time >= r.at)
      if (ready.length) {
        this.reserves = this.reserves.filter((r) => time < r.at)
        for (const r of ready) {
          r.swimmer.angle = Math.random() * Math.PI * 2
          r.swimmer.radius = 6 + Math.random() * 16
          r.swimmer.depthOffset = 1.2 + Math.random() * 4
          r.swimmer.group.visible = true
          this.swimmers.push(r.swimmer)
        }
      }
    }
    const swimmerCenter = center

    for (const swimmer of this.swimmers) {
      const depth = this.world.depthAt(
        swimmerCenter.x + Math.cos(swimmer.angle) * swimmer.radius,
        swimmerCenter.z + Math.sin(swimmer.angle) * swimmer.radius,
      )
      if (depth > 1.6) {
        swimmer.angle += (swimmer.speed * dt * 6) / Math.max(2.5, swimmer.radius)
      } else {
        swimmer.angle += dt * 1.4
      }
      const radiusPulse = Math.sin(time * 0.22 + swimmer.phase) * 1.2
      const radius = Math.max(2.4, swimmer.radius + radiusPulse)
      const x = swimmerCenter.x + Math.cos(swimmer.angle) * radius
      const z = swimmerCenter.z + Math.sin(swimmer.angle) * radius
      const floor = Math.max(0.8, this.world.depthAt(x, z))
      const offset = Math.min(swimmer.depthOffset, floor - 0.45)
      const y = -offset + Math.sin(time * 0.6 + swimmer.phase) * 0.18
      const dx = -Math.sin(swimmer.angle)
      const dz = Math.cos(swimmer.angle)
      const dir = swimmer.speed >= 0 ? 1 : -1
      swimmer.group.position.set(x, y, z)
      swimmer.group.rotation.y = Math.atan2(dx * dir, dz * dir)
      swimmer.group.rotation.z = Math.sin(time * 2.2 + swimmer.phase) * 0.08
      const near = Math.max(0, 1 - Math.min(1, swimmer.group.position.distanceTo(center) / 8))
      swimmer.group.scale.setScalar(swimmer.closeScale * (1 + near * 0.12))
    }

    for (let i = 0; i < this.weeds.length; i++) {
      const weed = this.weeds[i]
      this.dummy.position.set(weed.x, weed.bottom + weed.height / 2, weed.z)
      this.dummy.rotation.set(0, weed.lean, Math.sin(time * 0.8 + weed.phase) * 0.14)
      this.dummy.scale.set(0.85 + Math.sin(weed.phase) * 0.25, weed.height, 1)
      this.dummy.updateMatrix()
      this.weedMesh.setMatrixAt(i, this.dummy.matrix)
    }
    if (this.weeds.length) this.weedMesh.instanceMatrix.needsUpdate = true

    const bubblePositions = this.bubblePoints.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < this.bubbles.length; i++) {
      const bubble = this.bubbles[i]
      bubble.y += bubble.speed * dt
      bubble.x += Math.sin(time * 1.4 + bubble.phase) * bubble.sway * dt
      const dx = bubble.x - center.x
      const dz = bubble.z - center.z
      if (bubble.y > -0.12 || dx * dx + dz * dz > 32 * 32) {
        this.respawnBubble(bubble, center, Math.random)
      }
      bubblePositions.setXYZ(i, bubble.x, bubble.y, bubble.z)
    }
    bubblePositions.needsUpdate = true

    this.motePoints.position.copy(center)
    const motePositions = this.motePoints.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < MOTES; i++) {
      const x = motePositions.getX(i)
      const y = motePositions.getY(i) - dt * 0.08
      const z = motePositions.getZ(i)
      motePositions.setXYZ(
        i,
        x + Math.sin(time * 0.3 + i) * dt * 0.04,
        y < -8 ? 8 : y,
        z + Math.cos(time * 0.26 + i) * dt * 0.04,
      )
    }
    motePositions.needsUpdate = true
  }

  setVisible(visible: boolean) {
    this.group.visible = visible
  }

  get fishGroups() {
    return this.swimmers.map((s) => s.group)
  }

  catchableFish() {
    return this.swimmers.map((s) => ({ group: s.group, def: s.def }))
  }

  removeFish(group: THREE.Group) {
    const index = this.swimmers.findIndex((s) => s.group === group)
    if (index < 0) return
    const [swimmer] = this.swimmers.splice(index, 1)
    swimmer.group.visible = false
    this.reserves.push({ swimmer, at: this.lastTime + 14 + Math.random() * 10 })
  }

  startleFish(group: THREE.Group) {
    const swimmer = this.swimmers.find((s) => s.group === group)
    if (!swimmer) return
    swimmer.speed *= 1.9
    swimmer.radius = Math.min(32, swimmer.radius + 7)
    swimmer.phase += 1.4
  }

  fishDefAt(id: string) {
    return fishById(id)
  }

  currentSeason() {
    return this.season
  }

  dispose() {
    this.scene.remove(this.group)
    for (const swimmer of this.swimmers) {
      swimmer.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const mat = obj.material as THREE.Material
          if (mat.userData.owned) mat.dispose()
        }
      })
    }
    this.weedMesh.geometry.dispose()
    ;(this.weedMesh.material as THREE.Material).dispose()
    this.weedMesh.dispose()
    this.rockMesh.geometry.dispose()
    ;(this.rockMesh.material as THREE.Material).dispose()
    this.rockMesh.dispose()
    for (const points of [this.bubblePoints, this.motePoints]) {
      points.geometry.dispose()
      points.material.map?.dispose()
      points.material.dispose()
    }
  }
}

import * as THREE from 'three'
import { haloRing, runeRing, softSprite } from '@/game/celestial/celestialTextures'
import { FACTIONS, type FactionId } from '@/game/cultivation/factions'
import { mulberry32 } from '@/game/utils/math'

const TAU = Math.PI * 2

/** 山门位置：天界海域两端，避开接引仙阵、仙舟商舶与天界首领擂台 */
export const SECT_LAYOUT: Record<FactionId, { x: number; z: number }> = {
  immortal: { x: -150, z: 70 },
  demon: { x: 150, z: -70 },
}

/** 大门可交互半径（只比 x/z，船浮在云海面上） */
export const SECT_GATE_RADIUS = 15

export const SECT_ELDERS: Record<FactionId, { name: string; role: string; greeting: string }> = {
  immortal: {
    name: '虚竹真人',
    role: '缥缈仙宗 · 传功长老',
    greeting: '仙道漫漫，渔亦有道。上交渔获积攒功德，功法便能一步步精进。',
  },
  demon: {
    name: '血河老祖',
    role: '血煞魔宗 · 刑典长老',
    greeting: '魔宗不问善恶，只问强弱。抢来的修为才是自己的修为。',
  },
}

export interface SectGateHit {
  faction: FactionId
  distance: number
}

interface SpiritFieldSpec {
  count: number
  radius: number
  bottom: number
  top: number
  rise: number
  spin: number
  size: number
  opacity: number
  core: string
  halo: string
  additive: boolean
}

/** 山门气运粒子：仙宗金青上浮，魔宗赤黑翻涌 */
class SpiritFieldLayer {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  private positions: Float32Array
  private heights: Float32Array
  private angles: Float32Array
  private radii: Float32Array
  private speeds: Float32Array
  private spin: number
  private rise: number
  private bottom: number
  private top: number

  constructor(spec: SpiritFieldSpec, texture: THREE.Texture) {
    const count = spec.count
    this.positions = new Float32Array(count * 3)
    this.heights = new Float32Array(count)
    this.angles = new Float32Array(count)
    this.radii = new Float32Array(count)
    this.speeds = new Float32Array(count)
    this.spin = spec.spin
    this.rise = spec.rise
    this.bottom = spec.bottom
    this.top = spec.top

    const colors = new Float32Array(count * 3)
    const core = new THREE.Color(spec.core)
    const halo = new THREE.Color(spec.halo)
    const mix = new THREE.Color()
    for (let i = 0; i < count; i++) {
      this.angles[i] = Math.random() * TAU
      this.radii[i] = spec.radius * (0.25 + Math.random() * 0.75)
      this.speeds[i] = 0.6 + Math.random() * 1.5
      this.heights[i] = spec.bottom + Math.random() * (spec.top - spec.bottom)
      mix.copy(core).lerp(halo, (i % 7) / 7)
      colors[i * 3] = mix.r
      colors[i * 3 + 1] = mix.g
      colors[i * 3 + 2] = mix.b
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const material = new THREE.PointsMaterial({
      size: spec.size,
      map: texture,
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      opacity: spec.opacity,
      sizeAttenuation: true,
      blending: spec.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    })

    this.points = new THREE.Points(geometry, material)
    this.points.frustumCulled = false
    this.points.renderOrder = 4
  }

  update(time: number, dt: number) {
    for (let i = 0; i < this.heights.length; i++) {
      this.angles[i] += this.spin * this.speeds[i] * dt
      this.heights[i] += this.rise * this.speeds[i] * dt
      if (this.rise > 0 && this.heights[i] > this.top) this.heights[i] = this.bottom
      else if (this.rise < 0 && this.heights[i] < this.bottom) this.heights[i] = this.top
      const r = this.radii[i] + Math.sin(time * 0.9 + i * 1.7) * 0.9
      this.positions[i * 3] = Math.cos(this.angles[i]) * r
      this.positions[i * 3 + 1] = this.heights[i] + Math.sin(time * 1.4 + i) * 0.22
      this.positions[i * 3 + 2] = Math.sin(this.angles[i]) * r
    }
    ;(this.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
  }

  dispose() {
    this.points.geometry.dispose()
    this.points.material.dispose()
  }
}

interface Hall {
  group: THREE.Group
  spirits: SpiritFieldLayer[]
  halo: THREE.Mesh
  floorRing: THREE.Mesh
  sigil: THREE.Mesh
  elder: THREE.Mesh | THREE.Group
  orbits: THREE.Mesh[]
}

/** 天界双山门：缥缈仙宗悬空浮岛 + 血煞魔宗暗红悬崖，全部用基础几何体拼建 */
export class SectHalls {
  readonly group = new THREE.Group()

  private halls: Record<FactionId, Hall>
  private sprite = softSprite(64)
  private haloTex = haloRing(256)
  private disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = []
  private rand = mulberry32(90210)

  constructor(scene: THREE.Scene) {
    this.group.visible = false
    this.disposables.push(this.sprite, this.haloTex)
    this.halls = {
      immortal: this.buildImmortal(),
      demon: this.buildDemon(),
    }
    scene.add(this.group)
  }

  setVisible(visible: boolean) {
    this.group.visible = visible
  }

  /** 最近的山门；阵营不符时由调用方决定拒渡 */
  nearestGate(position: THREE.Vector3): SectGateHit | null {
    let best: SectGateHit | null = null
    for (const id of ['immortal', 'demon'] as FactionId[]) {
      const slot = SECT_LAYOUT[id]
      const distance = Math.hypot(position.x - slot.x, position.z - slot.z)
      if (distance > SECT_GATE_RADIUS) continue
      if (best === null || distance < best.distance) best = { faction: id, distance }
    }
    return best
  }

  update(time: number, dt: number) {
    if (!this.group.visible) return
    for (const id of ['immortal', 'demon'] as FactionId[]) {
      const hall = this.halls[id]
      for (const spirit of hall.spirits) spirit.update(time, dt)
      const speed = id === 'immortal' ? 0.34 : 0.5
      hall.halo.rotation.z = time * (id === 'immortal' ? 0.12 : -0.16)
      hall.floorRing.rotation.z = time * 0.08
      hall.floorRing.scale.setScalar(1 + Math.sin(time * (id === 'immortal' ? 0.7 : 1.1)) * 0.035)
      hall.sigil.rotation.y = time * (id === 'immortal' ? 0.55 : -0.4)
      hall.elder.position.y = 0.35 + Math.sin(time * 1.1 + (id === 'immortal' ? 0 : 1.7)) * 0.08
      for (const [i, orbit] of hall.orbits.entries()) {
        const angle = time * speed + (i / hall.orbits.length) * TAU
        const radius = (orbit.userData.radius as number) || 8
        const lift = (orbit.userData.lift as number) || 6
        orbit.position.set(Math.cos(angle) * radius, lift, Math.sin(angle) * radius)
        orbit.rotation.x = time * 0.6
        orbit.rotation.y = angle
      }
    }
  }

  dispose() {
    for (const hall of Object.values(this.halls)) {
      for (const spirit of hall.spirits) spirit.dispose()
    }
    for (const item of this.disposables) item.dispose()
    this.group.removeFromParent()
  }

  // ---- 材质与零件 ----------------------------------------------------------

  private mat(spec: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({ flatShading: true, fog: false, ...spec })
    this.disposables.push(material)
    return material
  }

  private geo<T extends THREE.BufferGeometry>(geometry: T): T {
    this.disposables.push(geometry)
    return geometry
  }

  private texture(tex: THREE.CanvasTexture): THREE.CanvasTexture {
    this.disposables.push(tex)
    return tex
  }

  /** 云海上的光环阵纹 */
  private floorRing(size: number, color: string, opacity: number) {
    const mesh = new THREE.Mesh(
      this.geo(new THREE.PlaneGeometry(size, size)),
      new THREE.MeshBasicMaterial({
        map: this.haloTex,
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      }),
    )
    this.disposables.push(mesh.material)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = 0.45
    mesh.renderOrder = 3
    return mesh
  }

  /** 门中悬浮的宗门印 */
  private gateSigil(faction: FactionId, size: number) {
    const mesh = new THREE.Mesh(
      this.geo(new THREE.CircleGeometry(size, 40)),
      new THREE.MeshBasicMaterial({
        map: this.texture(runeRing(faction === 'immortal' ? 3 : 17, 512)),
        color: FACTIONS[faction].accent,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      }),
    )
    this.disposables.push(mesh.material)
    mesh.position.set(0, faction === 'immortal' ? 5.6 : 5.4, 0)
    return mesh
  }

  /** 传功长老：圆柱道袍 +  sphere 首 + 锥形冠 */
  private elder(faction: FactionId) {
    const def = FACTIONS[faction]
    const group = new THREE.Group()
    const robe = this.mat({ color: def.body, roughness: 0.82 })
    const trim = this.mat({
      color: def.trim,
      emissive: def.trim,
      emissiveIntensity: 0.55,
      roughness: 0.6,
    })
    const skin = this.mat({ color: '#f0d9c0', roughness: 0.9 })
    const glow = this.mat({
      color: def.accent,
      emissive: def.accent,
      emissiveIntensity: 1.5,
      roughness: 0.3,
    })

    const body = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(0.34, 0.72, 1.9, 8)), robe)
    body.position.y = 0.95
    const sleeveGeo = this.geo(new THREE.CylinderGeometry(0.16, 0.3, 1.25, 6))
    const sleeveA = new THREE.Mesh(sleeveGeo, robe)
    sleeveA.position.set(0.56, 1.36, 0)
    sleeveA.rotation.z = -0.55
    const sleeveB = new THREE.Mesh(sleeveGeo, robe)
    sleeveB.position.set(-0.56, 1.36, 0)
    sleeveB.rotation.z = 0.55
    const head = new THREE.Mesh(this.geo(new THREE.SphereGeometry(0.32, 10, 8)), skin)
    head.position.y = 2.2
    const hat = new THREE.Mesh(this.geo(new THREE.ConeGeometry(0.52, 0.78, 8)), trim)
    hat.position.y = 2.62
    const band = new THREE.Mesh(this.geo(new THREE.TorusGeometry(0.36, 0.055, 8, 20)), trim)
    band.position.y = 2.02
    band.rotation.x = Math.PI / 2
    const staff = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6)), trim)
    staff.position.set(0.82, 1.3, 0.12)
    staff.rotation.z = 0.12
    const orb = new THREE.Mesh(this.geo(new THREE.OctahedronGeometry(0.2, 0)), glow)
    orb.position.set(0.95, 2.72, 0.12)
    group.add(body, sleeveA, sleeveB, head, hat, band, staff, orb)
    return group
  }

  // ---- 缥缈仙宗 ------------------------------------------------------------

  private buildImmortal(): Hall {
    const slot = SECT_LAYOUT.immortal
    const root = new THREE.Group()
    root.position.set(slot.x, 0, slot.z)

    const stone = this.mat({
      color: '#f6efff',
      roughness: 0.9,
      transparent: true,
      opacity: 0.94,
    })
    const jade = this.mat({
      color: '#bff4ff',
      emissive: '#6fdcff',
      emissiveIntensity: 0.5,
      roughness: 0.35,
      transparent: true,
      opacity: 0.82,
    })
    const gold = this.mat({
      color: '#ffe9b0',
      emissive: '#ffbe5c',
      emissiveIntensity: 1.15,
      metalness: 0.5,
      roughness: 0.3,
    })

    // 山门牌坊：立于云海，是交互入口
    const pierGeo = this.geo(new THREE.CylinderGeometry(0.85, 1.25, 9, 8))
    const capGeo = this.geo(new THREE.ConeGeometry(1.35, 2.2, 8))
    for (const x of [-4.6, 4.6]) {
      const pier = new THREE.Mesh(pierGeo, stone)
      pier.position.set(x, 4.5, 0)
      const cap = new THREE.Mesh(capGeo, gold)
      cap.position.set(x, 9.7, 0)
      root.add(pier, cap)
    }
    const lintel = new THREE.Mesh(this.geo(new THREE.BoxGeometry(11.6, 0.8, 1.5)), jade)
    lintel.position.y = 8.4
    const roof = new THREE.Mesh(this.geo(new THREE.ConeGeometry(7.2, 2.6, 4)), gold)
    roof.position.y = 9.9
    roof.rotation.y = Math.PI / 4
    root.add(lintel, roof)

    const sigil = this.gateSigil('immortal', 3.5)
    root.add(sigil)

    // 悬空浮岛
    const island = new THREE.Mesh(this.geo(new THREE.IcosahedronGeometry(17, 1)), stone)
    island.scale.set(1, 0.42, 1)
    island.position.y = 21
    const roots = new THREE.Mesh(this.geo(new THREE.ConeGeometry(13, 17, 7)), stone)
    roots.position.y = 12.5
    roots.rotation.x = Math.PI
    const crown = new THREE.Mesh(this.geo(new THREE.ConeGeometry(15.5, 12, 9)), jade)
    crown.position.y = 25.5
    crown.scale.set(1, 0.24, 1)
    root.add(island, roots, crown)

    // 大殿
    const palace = new THREE.Group()
    palace.position.y = 26.4
    const plinth = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(9, 10.4, 1.3, 10)), jade)
    plinth.position.y = 0.65
    const body = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(6, 6.7, 4.6, 8)), stone)
    body.position.y = 3.4
    const mainRoof = new THREE.Mesh(this.geo(new THREE.ConeGeometry(9.4, 4.6, 8)), gold)
    mainRoof.position.y = 8
    mainRoof.rotation.y = Math.PI / 8
    palace.add(plinth, body, mainRoof)

    const spireGeo = this.geo(new THREE.CylinderGeometry(0.5, 0.85, 8.5, 6))
    const tipGeo = this.geo(new THREE.ConeGeometry(1.5, 4.4, 6))
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * TAU + Math.PI / 4
      const x = Math.cos(angle) * 8.6
      const z = Math.sin(angle) * 8.6
      const spire = new THREE.Mesh(spireGeo, stone)
      spire.position.set(x, 4.2, z)
      const tip = new THREE.Mesh(tipGeo, gold)
      tip.position.set(x, 10.4, z)
      palace.add(spire, tip)
    }
    root.add(palace)

    const halo = new THREE.Mesh(this.geo(new THREE.TorusGeometry(13.5, 0.42, 8, 48)), gold)
    halo.position.y = 20.4
    halo.rotation.x = Math.PI / 2
    halo.renderOrder = 2
    root.add(halo)

    const orbits: THREE.Mesh[] = []
    const shardGeo = this.geo(new THREE.OctahedronGeometry(0.85, 0))
    for (let i = 0; i < 5; i++) {
      const shard = new THREE.Mesh(shardGeo, jade)
      shard.scale.set(0.5, 1.5, 0.5)
      shard.userData.radius = 7.4
      shard.userData.lift = 6.5 + i * 0.5
      orbits.push(shard)
      root.add(shard)
    }

    const floorRing = this.floorRing(26, '#9fe8ff', 0.5)
    root.add(floorRing)

    const elder = this.elder('immortal')
    elder.position.set(2.9, 0.35, 3.4)
    elder.rotation.y = -0.5
    root.add(elder)

    const light = new THREE.PointLight('#bfefff', 26, 92, 2)
    light.position.set(0, 7.5, 1.5)
    root.add(light)

    const spirits = [
      new SpiritFieldLayer(
        {
          count: 90,
          radius: 14,
          bottom: 0.5,
          top: 15,
          rise: 1.5,
          spin: 0.16,
          size: 0.42,
          opacity: 0.78,
          core: '#ffe9a8',
          halo: '#9ff0ff',
          additive: true,
        },
        this.sprite,
      ),
      new SpiritFieldLayer(
        {
          count: 70,
          radius: 19,
          bottom: 17,
          top: 40,
          rise: 2.4,
          spin: -0.1,
          size: 0.6,
          opacity: 0.52,
          core: '#fff3cf',
          halo: '#8fe8ff',
          additive: true,
        },
        this.sprite,
      ),
    ]
    for (const spirit of spirits) root.add(spirit.points)

    this.group.add(root)
    return { group: root, spirits, halo, floorRing, sigil, elder, orbits }
  }

  // ---- 血煞魔宗 ------------------------------------------------------------

  private buildDemon(): Hall {
    const slot = SECT_LAYOUT.demon
    const root = new THREE.Group()
    root.position.set(slot.x, 0, slot.z)

    const basalt = this.mat({ color: '#240a0d', roughness: 0.96 })
    const blood = this.mat({
      color: '#8e1f26',
      emissive: '#c8352b',
      emissiveIntensity: 0.65,
      roughness: 0.55,
    })
    const ember = this.mat({
      color: '#ff5a3c',
      emissive: '#ff4a28',
      emissiveIntensity: 1.5,
      roughness: 0.4,
    })

    // 山门：两根断石柱压一道歪梁
    const gate = new THREE.Group()
    for (const [x, h] of [[-4.2, 8.6], [4.2, 7.4]] as const) {
      const column = new THREE.Mesh(this.geo(new THREE.BoxGeometry(2.1, h, 2.1)), basalt)
      column.position.set(x, h / 2, 0)
      column.rotation.y = (this.rand() - 0.5) * 0.14
      const tooth = new THREE.Mesh(this.geo(new THREE.BoxGeometry(1.5, 0.9, 1.5)), blood)
      tooth.position.set(x, h + 0.4, 0)
      tooth.rotation.z = (this.rand() - 0.5) * 0.4
      gate.add(column, tooth)
    }
    const beam = new THREE.Mesh(this.geo(new THREE.BoxGeometry(11.8, 1.5, 1.8)), basalt)
    beam.position.y = 8.1
    beam.rotation.z = 0.035
    const barbs = new THREE.Mesh(this.geo(new THREE.BoxGeometry(9.4, 0.5, 1.2)), ember)
    barbs.position.y = 7.1
    gate.add(beam, barbs)
    root.add(gate)

    const sigil = this.gateSigil('demon', 3.2)
    root.add(sigil)

    // 悬崖与残殿
    const cliff = new THREE.Mesh(this.geo(new THREE.IcosahedronGeometry(18, 1)), basalt)
    cliff.scale.set(1, 1.15, 1)
    cliff.position.y = 20
    const shelf = new THREE.Mesh(this.geo(new THREE.BoxGeometry(22, 2.4, 18)), basalt)
    shelf.position.y = 32
    shelf.rotation.y = 0.2
    root.add(cliff, shelf)

    const palace = new THREE.Group()
    palace.position.y = 33.2
    const wall = new THREE.Mesh(this.geo(new THREE.BoxGeometry(13, 6.5, 10)), basalt)
    wall.position.y = 3.2
    palace.add(wall)
    for (let i = 0; i < 5; i++) {
      const slab = new THREE.Mesh(this.geo(new THREE.BoxGeometry(7 + this.rand() * 4, 0.8, 4.4)), blood)
      slab.position.set((this.rand() - 0.5) * 7, 7 + this.rand() * 1.4, (this.rand() - 0.5) * 6)
      slab.rotation.set(this.rand() * 0.3 - 0.15, this.rand() * TAU, this.rand() * 0.36 - 0.18)
      palace.add(slab)
    }
    const hornGeo = this.geo(new THREE.ConeGeometry(1.1, 6.5, 5))
    for (const [x, z] of [
      [-7.6, -5.4],
      [7.6, -5.4],
      [-7.6, 5.4],
      [7.6, 5.4],
    ] as const) {
      const horn = new THREE.Mesh(hornGeo, basalt)
      horn.position.set(x, 6.5, z)
      horn.rotation.z = x > 0 ? -0.26 : 0.26
      palace.add(horn)
    }
    const brazier = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(1.5, 0.9, 1.6, 8)), ember)
    brazier.position.y = 7.6
    palace.add(brazier)
    root.add(palace)

    const halo = new THREE.Mesh(this.geo(new THREE.TorusGeometry(15, 0.6, 6, 10)), blood)
    halo.position.y = 30
    halo.rotation.x = Math.PI / 2
    halo.rotation.z = 0.2
    halo.renderOrder = 2
    root.add(halo)

    const orbits: THREE.Mesh[] = []
    const slabGeo = this.geo(new THREE.BoxGeometry(0.9, 2.6, 0.9))
    for (let i = 0; i < 5; i++) {
      const shard = new THREE.Mesh(slabGeo, blood)
      shard.rotation.z = (this.rand() - 0.5) * 0.8
      shard.userData.radius = 8.8
      shard.userData.lift = 5.2 + i * 0.9
      orbits.push(shard)
      root.add(shard)
    }

    const floorRing = this.floorRing(24, '#e2685a', 0.4)
    root.add(floorRing)

    const elder = this.elder('demon')
    elder.position.set(-2.9, 0.35, 3.4)
    elder.rotation.y = 0.5
    root.add(elder)

    const light = new THREE.PointLight('#ff5a3c', 30, 88, 2)
    light.position.set(0, 7, 1.5)
    root.add(light)

    const spirits = [
      // 暗红雾：贴着水面压过来
      new SpiritFieldLayer(
        {
          count: 84,
          radius: 22,
          bottom: 0.4,
          top: 5.5,
          rise: -0.35,
          spin: -0.09,
          size: 1.55,
          opacity: 0.34,
          core: '#5a0f14',
          halo: '#2a0d12',
          additive: false,
        },
        this.sprite,
      ),
      // 黑色火苗：从崖底翻涌而上
      new SpiritFieldLayer(
        {
          count: 78,
          radius: 15,
          bottom: 1,
          top: 38,
          rise: 2.8,
          spin: 0.12,
          size: 0.72,
          opacity: 0.6,
          core: '#1a0709',
          halo: '#ff4a28',
          additive: false,
        },
        this.sprite,
      ),
    ]
    for (const spirit of spirits) root.add(spirit.points)

    this.group.add(root)
    return { group: root, spirits, halo, floorRing, sigil, elder, orbits }
  }
}

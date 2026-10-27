import * as THREE from 'three'

export interface DragonRaceRing {
  x: number
  z: number
}

const RING_PATH: DragonRaceRing[] = [
  { x: -4, z: -10 },
  { x: -18, z: -18 },
  { x: -31, z: -6 },
  { x: -30, z: 10 },
  { x: -15, z: 20 },
  { x: 2, z: 14 },
]

export const DRAGON_RACE_TIME = 60
export const DRAGON_RACE_COOLDOWN = 8

export type DragonRaceEvent = 'start' | 'finish' | 'expire'

interface RingNode {
  group: THREE.Group
  halo: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>
  disc: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>
  phase: number
}

export class DragonBoatRace {
  readonly group = new THREE.Group()
  readonly total = RING_PATH.length

  active = false
  passed = 0
  timeLeft = 0
  private cooldown = 0
  private time = 0
  private rings: RingNode[] = []
  private onEvent: (event: DragonRaceEvent, secondsLeft: number) => void

  constructor(
    scene: THREE.Scene,
    onEvent: (event: DragonRaceEvent, secondsLeft: number) => void,
  ) {
    this.onEvent = onEvent
    this.build()
    scene.add(this.group)
  }

  private build() {
    for (let i = 0; i < RING_PATH.length; i++) {
      const def = RING_PATH[i]
      const next = RING_PATH[i + 1] ?? RING_PATH[i]
      const prev = RING_PATH[i - 1] ?? def
      const yaw = Math.atan2(next.x - prev.x, next.z - prev.z)

      const ringGroup = new THREE.Group()
      ringGroup.position.set(def.x, 3.1, def.z)
      ringGroup.rotation.y = yaw

      const disc = new THREE.Mesh(
        new THREE.TorusGeometry(3.5, 0.17, 8, 48),
        new THREE.MeshBasicMaterial({
          color: '#7ff0d8',
          transparent: true,
          opacity: 0.55,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      disc.castShadow = false
      ringGroup.add(disc)

      const halo = new THREE.Mesh(
        new THREE.RingGeometry(2.9, 3.5, 48),
        new THREE.MeshBasicMaterial({
          color: '#8ff6e0',
          transparent: true,
          opacity: 0.1,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      ringGroup.add(halo)

      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.14, 2.4, 6),
        new THREE.MeshBasicMaterial({
          color: '#ffe08a',
          transparent: true,
          opacity: 0.32,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      beacon.position.y = -2.0
      ringGroup.add(beacon)

      this.group.add(ringGroup)
      this.rings.push({ group: ringGroup, disc, halo, phase: (i / RING_PATH.length) * Math.PI * 2 })
    }
    this.refreshColors()
  }

  private refreshColors() {
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i]
      const isNext = this.active && i === this.passed
      const done = this.active ? i < this.passed : this.passed > 0 && i < this.passed
      const color = done ? '#6f958d' : isNext ? '#ffd76a' : '#7ff0d8'
      ring.disc.material.color.set(color)
      ring.halo.material.color.set(color)
      ring.disc.material.opacity = done ? 0.16 : isNext ? 0.95 : 0.5
      ring.halo.material.opacity = done ? 0.03 : isNext ? 0.26 : 0.09
    }
  }

  reset() {
    this.active = false
    this.passed = 0
    this.timeLeft = 0
    this.refreshColors()
  }

  get nextRing(): DragonRaceRing | null {
    return this.active ? (RING_PATH[this.passed] ?? null) : RING_PATH[0]
  }

  update(dt: number, time: number, x: number, z: number) {
    this.time += dt
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt)

    if (!this.active && this.cooldown <= 0) {
      const first = RING_PATH[0]
      if (Math.hypot(x - first.x, z - first.z) < 9) this.start()
    }

    if (this.active) {
      this.timeLeft = Math.max(0, this.timeLeft - dt)
      const target = RING_PATH[this.passed]
      if (target && Math.hypot(x - target.x, z - target.z) < 3.9) {
        this.passed += 1
        this.refreshColors()
        if (this.passed >= this.total) {
          const left = this.timeLeft
          this.active = false
          this.passed = 0
          this.timeLeft = 0
          this.cooldown = DRAGON_RACE_COOLDOWN
          this.refreshColors()
          this.onEvent('finish', left)
          return
        }
      }
      if (this.timeLeft <= 0) {
        this.active = false
        this.passed = 0
        this.timeLeft = 0
        this.cooldown = DRAGON_RACE_COOLDOWN
        this.refreshColors()
        this.onEvent('expire', 0)
        return
      }
    }

    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i]
      const isNext = this.active && i === this.passed
      ring.group.position.y = 3.1 + Math.sin(this.time * 1.2 + ring.phase) * 0.14
      ring.group.rotation.z = Math.sin(this.time * 0.8 + ring.phase) * 0.05
      const pulse = isNext ? 1 + Math.sin(this.time * 5) * 0.05 : 1
      ring.group.scale.setScalar(pulse)
      ring.halo.rotation.z += dt * (isNext ? 0.9 : 0.25)
    }
  }

  private start() {
    this.active = true
    this.passed = 0
    this.timeLeft = DRAGON_RACE_TIME
    this.refreshColors()
    this.onEvent('start', DRAGON_RACE_TIME)
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        const material = obj.material
        if (Array.isArray(material)) material.forEach((m) => m.dispose())
        else material.dispose()
      }
    })
    this.group.removeFromParent()
  }
}

import * as THREE from 'three'
import type { Boat } from '@/game/entities/boat'
import { crewById, type CrewDef } from '@/game/crew/crew'
import { useGameStore } from '@/store/useGameStore'

interface Figure {
  def: CrewDef
  group: THREE.Group
  targetX: number
  targetZ: number
  wait: number
  phase: number
  facing: number
}

/** Low-poly crew that wanders the deck of whichever hull is equipped. */
export class CrewSystem {
  private group = new THREE.Group()
  private figures = new Map<string, Figure>()
  private applied = ''

  constructor(private boat: Boat) {
    this.boat.group.add(this.group)
    this.sync(useGameStore.getState().crew)
  }

  private build(def: CrewDef, index: number) {
    const group = new THREE.Group()
    const body = new THREE.Group()

    const cloth = new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.88,
      flatShading: true,
    })
    const accent = new THREE.MeshStandardMaterial({
      color: def.accent,
      roughness: 0.6,
      flatShading: true,
    })
    const skin = new THREE.MeshStandardMaterial({
      color: '#e0b184',
      roughness: 0.82,
      flatShading: true,
    })
    const dark = new THREE.MeshStandardMaterial({
      color: '#23302c',
      roughness: 0.9,
      flatShading: true,
    })

    const legGeo = new THREE.BoxGeometry(0.11, 0.28, 0.13)
    const legL = new THREE.Mesh(legGeo, dark)
    const legR = new THREE.Mesh(legGeo, dark)
    legL.position.set(-0.08, 0.14, 0)
    legR.position.set(0.08, 0.14, 0)

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.36, 6), cloth)
    torso.position.y = 0.46
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.05, 6), accent)
    belt.position.y = 0.3

    const armGeo = new THREE.BoxGeometry(0.07, 0.26, 0.08)
    const armL = new THREE.Mesh(armGeo, cloth)
    const armR = new THREE.Mesh(armGeo, cloth)
    armL.position.set(-0.2, 0.46, 0)
    armR.position.set(0.2, 0.46, 0)
    armL.rotation.z = 0.16
    armR.rotation.z = -0.16

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), skin)
    head.position.y = 0.72

    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.05, 8), accent)
    hat.position.y = 0.81
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 8), accent)
    crown.position.y = 0.86

    body.add(legL, legR, torso, belt, armL, armR, head, hat, crown)
    body.position.y = 0
    group.add(body)
    group.scale.setScalar(index === 0 ? 1 : 0.95)

    const deck = this.boat.deck
    const [zMin, zMax] = deck.crewZ
    group.position.set(
      (index % 2 === 0 ? -1 : 1) * deck.halfWidth * 0.42,
      deck.y,
      zMin + (zMax - zMin) * (0.3 + (index % 3) * 0.2),
    )
    this.group.add(group)
    return group
  }

  sync(ids: readonly string[]) {
    const key = ids.join(',')
    if (key === this.applied) return
    this.applied = key

    for (const [id, fig] of [...this.figures]) {
      if (!ids.includes(id)) {
        this.group.remove(fig.group)
        fig.group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose()
            ;(obj.material as THREE.Material).dispose()
          }
        })
        this.figures.delete(id)
      }
    }

    ids.forEach((id, index) => {
      if (this.figures.has(id)) return
      const def = crewById(id)
      if (!def) return
      const deck = this.boat.deck
      const [zMin, zMax] = deck.crewZ
      this.figures.set(id, {
        def,
        group: this.build(def, index),
        targetX: (Math.random() - 0.5) * deck.halfWidth * 0.85,
        targetZ: zMin + Math.random() * (zMax - zMin),
        wait: 1 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
        facing: Math.random() * Math.PI * 2,
      })
    })
  }

  update(dt: number, time: number) {
    this.sync(useGameStore.getState().crew)
    const deck = this.boat.deck
    for (const fig of this.figures.values()) {
      const group = fig.group
      const torso = group.children[0] as THREE.Group
      fig.wait -= dt

      if (fig.wait <= 0) {
        const [zMin, zMax] = deck.crewZ
        fig.targetX = (Math.random() - 0.5) * deck.halfWidth * 0.9
        fig.targetZ = zMin + Math.random() * (zMax - zMin)
        fig.wait = 2.4 + Math.random() * 3.6
      }

      const dx = fig.targetX - group.position.x
      const dz = fig.targetZ - group.position.z
      const distance = Math.hypot(dx, dz)
      const walking = distance > 0.16
      if (walking) {
        const step = Math.min(distance, dt * 0.48)
        group.position.x += (dx / distance) * step
        group.position.z += (dz / distance) * step
        fig.facing = Math.atan2(dx, dz)
      }

      const turn = Math.atan2(
        Math.sin(fig.facing - group.rotation.y),
        Math.cos(fig.facing - group.rotation.y),
      )
      group.rotation.y += turn * Math.min(1, dt * 4)
      group.position.y = deck.y + (walking ? Math.abs(Math.sin(time * 6 + fig.phase)) * 0.035 : 0)
      torso.rotation.z = walking ? Math.sin(time * 6 + fig.phase) * 0.06 : 0
      torso.rotation.x = walking ? 0.05 : Math.sin(time * 1.3 + fig.phase) * 0.02
      if (!walking) {
        torso.position.y = Math.sin(time * 1.5 + fig.phase) * 0.012
      }
    }
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        ;(obj.material as THREE.Material).dispose()
      }
    })
    this.group.removeFromParent()
    this.figures.clear()
  }
}

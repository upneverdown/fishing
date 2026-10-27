import * as THREE from 'three'
import type { Boat } from '@/game/entities/boat'
import { crewById, type CrewDef } from '@/game/crew/crew'
import { useGameStore } from '@/store/useGameStore'
import { createCatch, pickFish } from '@/game/fishing/fishTable'
import { gameEvents } from '@/game/eventBus'

const FISHING_INTERVAL = 300
const CAST_DURATION = 9

interface Figure {
  def: CrewDef
  group: THREE.Group
  rod: THREE.Group
  targetX: number
  targetZ: number
  wait: number
  phase: number
  facing: number
  state: 'idle' | 'fishing'
  timer: number
  cast: number
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

    const rod = new THREE.Group()
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.022, 0.95, 5),
      new THREE.MeshStandardMaterial({ color: '#7a5a34', roughness: 0.9, flatShading: true }),
    )
    pole.position.y = 0.45
    rod.add(pole)
    const line = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, 1.5, 3),
      new THREE.MeshBasicMaterial({ color: '#cfe9e4', transparent: true, opacity: 0.55 }),
    )
    line.position.y = -0.75
    rod.add(line)
    const float = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 6, 5),
      new THREE.MeshStandardMaterial({ color: '#e3554a', emissive: '#8a2a22', emissiveIntensity: 0.5 }),
    )
    float.position.y = -1.5
    rod.add(float)
    rod.position.set(0.24, 0.7, -0.12)
    rod.rotation.z = -0.65
    rod.visible = false
    group.add(rod)

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
      const built = this.build(def, index)
      this.figures.set(id, {
        def,
        group: built,
        rod: built.children[1] as THREE.Group,
        targetX: (Math.random() - 0.5) * deck.halfWidth * 0.85,
        targetZ: zMin + Math.random() * (zMax - zMin),
        wait: 1 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
        facing: Math.random() * Math.PI * 2,
        state: 'idle',
        timer: FISHING_INTERVAL + index * 24 + Math.random() * 20,
        cast: 0,
      })
    })
  }

  update(dt: number, time: number) {
    this.sync(useGameStore.getState().crew)
    const deck = this.boat.deck
    for (const fig of this.figures.values()) {
      const group = fig.group
      const torso = group.children[0] as THREE.Group

      if (fig.state === 'idle') {
        fig.timer -= dt
        if (fig.timer <= 0) {
          fig.state = 'fishing'
          fig.cast = CAST_DURATION
          fig.wait = 999
          fig.rod.visible = true
          const side = Math.random() > 0.5 ? 1 : -1
          fig.targetX = side * deck.halfWidth * 0.92
          fig.targetZ = deck.crewZ[0] + Math.random() * (deck.crewZ[1] - deck.crewZ[0])
        }
      }

      fig.wait -= dt
      if (fig.state === 'idle' && fig.wait <= 0) {
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
        const step = Math.min(distance, dt * (fig.state === 'fishing' ? 0.7 : 0.48))
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
      torso.rotation.x = walking
        ? 0.05
        : fig.state === 'fishing'
          ? 0.1
          : Math.sin(time * 1.3 + fig.phase) * 0.02
      if (!walking) {
        torso.position.y = Math.sin(time * 1.5 + fig.phase) * 0.012
      }

      if (fig.state === 'fishing') {
        fig.cast -= dt
        fig.rod.rotation.x = -0.1 + Math.sin(time * 2.2 + fig.phase) * 0.05
        if (fig.cast <= 0) {
          fig.state = 'idle'
          fig.timer = FISHING_INTERVAL
          fig.wait = 1.5
          fig.rod.visible = false
          this.landCatch(fig)
        }
      }
    }
  }

  private landCatch(fig: Figure) {
    const state = useGameStore.getState()
    const def = pickFish(2.4, { season: state.season })
    const caught = createCatch(def, 'rod')
    const added = state.addCatch(caught)
    state.grantMoney(20, `船员 ${fig.def.name} 的渔获分成`)
    state.showCrewCatch(
      `船员[${fig.def.name}]为你钓上了一条[${def.name}]，获得金币+20${added ? '' : '（鱼篓已满，鱼放回了海里）'}`,
    )
    gameEvents.emit('crew:catch', {
      crewName: fig.def.name,
      fishName: def.name,
      coins: 20,
    })
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

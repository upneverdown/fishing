import * as THREE from 'three'
import { npcById } from '@/game/town/npcs'

const DECK_Y = 1.2

export const CAMPFIRE_POINT = { x: 3.65, z: 42.9 }
export const CAMPFIRE_RADIUS = 7
export const NPC_TALK_RADIUS = 6

const NPC_SPOTS: { id: string; x: number; z: number; yaw: number }[] = [
  { id: 'zhou', x: 3.7, z: 36.4, yaw: Math.PI },
  { id: 'lan', x: 0.3, z: 38.8, yaw: Math.PI },
  { id: 'xiaoman', x: 3.7, z: 39.9, yaw: Math.PI },
  { id: 'che', x: 0.3, z: 44.6, yaw: Math.PI - 0.25 },
  { id: 'bo', x: 0.3, z: 34.2, yaw: Math.PI + 0.2 },
]

function canvasTexture(draw: (ctx: CanvasRenderingContext2D, size: number) => void, size = 128) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  draw(ctx, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

let markerTexture: THREE.CanvasTexture | null = null
function exclaimTexture() {
  if (markerTexture) return markerTexture
  markerTexture = canvasTexture((ctx, size) => {
    ctx.clearRect(0, 0, size, size)
    const glow = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2)
    glow.addColorStop(0, 'rgba(255,228,150,0.55)')
    glow.addColorStop(1, 'rgba(255,210,110,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = '#f2c15c'
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, 30, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#2a1a08'
    ctx.lineWidth = 6
    ctx.stroke()
    ctx.fillStyle = '#2a1a08'
    ctx.font = '800 42px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('!', size / 2, size / 2 + 2)
  })
  return markerTexture
}

const smokeTexture = canvasTexture((ctx, size) => {
  const g = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(230,235,225,0.55)')
  g.addColorStop(0.55, 'rgba(210,220,215,0.2)')
  g.addColorStop(1, 'rgba(200,215,210,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
})

interface Actor {
  id: string
  name: string
  group: THREE.Group
  body: THREE.Mesh
  head: THREE.Mesh
  armL: THREE.Group
  armR: THREE.Group
  marker: THREE.Sprite
  baseYaw: number
  phase: number
}

interface Campfire {
  group: THREE.Group
  flames: THREE.Mesh[]
  light: THREE.PointLight
  smoke: THREE.Sprite[]
  embers: THREE.Points
  emberPositions: Float32Array
  emberSeed: number[]
}

export class DockLife {
  readonly group = new THREE.Group()
  private actors: Actor[] = []
  private fire: Campfire

  constructor(scene: THREE.Scene) {
    scene.add(this.group)
    this.buildActors()
    this.fire = this.buildCampfire()
  }

  private buildActors() {
    for (const spot of NPC_SPOTS) {
      const def = npcById(spot.id)
      if (!def) continue
      const group = new THREE.Group()
      group.position.set(spot.x, DECK_Y, spot.z)
      group.rotation.y = spot.yaw

      const bodyMat = new THREE.MeshStandardMaterial({
        color: def.color,
        roughness: 0.86,
        flatShading: true,
      })
      const accentMat = new THREE.MeshStandardMaterial({
        color: def.accent,
        roughness: 0.62,
        metalness: 0.12,
        flatShading: true,
      })
      const skinMat = new THREE.MeshStandardMaterial({
        color: '#e3b98f',
        roughness: 0.8,
        flatShading: true,
      })
      const darkMat = new THREE.MeshStandardMaterial({
        color: '#2c3a3c',
        roughness: 0.9,
        flatShading: true,
      })

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.42, 1.05, 8), bodyMat)
      body.position.y = 0.72
      body.castShadow = true
      group.add(body)

      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.055, 5, 12), accentMat)
      collar.rotation.x = Math.PI / 2
      collar.position.y = 1.2
      group.add(collar)

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), skinMat)
      head.position.y = 1.45
      head.castShadow = true
      group.add(head)

      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.39, 0.3, 8), accentMat)
      hat.position.y = 1.69
      hat.castShadow = true
      group.add(hat)
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.45, 0.05, 10), accentMat)
      brim.position.y = 1.57
      group.add(brim)

      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(
          new THREE.SphereGeometry(0.026, 5, 4),
          new THREE.MeshStandardMaterial({ color: '#1b2526', roughness: 0.4 }),
        )
        eye.position.set(side * 0.08, 1.47, 0.19)
        group.add(eye)
      }

      const legGeo = new THREE.CylinderGeometry(0.075, 0.065, 0.42, 5)
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(legGeo, darkMat)
        leg.position.set(side * 0.12, 0.21, 0)
        group.add(leg)
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.26), darkMat)
        shoe.position.set(side * 0.12, 0.05, 0.05)
        group.add(shoe)
      }

      const armGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.52, 5)
      const armL = new THREE.Group()
      armL.position.set(-0.28, 1.16, 0)
      const armLMesh = new THREE.Mesh(armGeo, bodyMat)
      armLMesh.position.y = -0.26
      armL.add(armLMesh)
      group.add(armL)
      const armR = new THREE.Group()
      armR.position.set(0.28, 1.16, 0)
      const armRMesh = new THREE.Mesh(armGeo, bodyMat)
      armRMesh.position.y = -0.26
      armR.add(armRMesh)
      group.add(armR)

      const marker = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: exclaimTexture(),
          transparent: true,
          depthTest: false,
          depthWrite: false,
        }),
      )
      marker.position.set(0, 2.35, 0)
      marker.scale.set(0.62, 0.62, 1)
      marker.renderOrder = 12
      marker.visible = false
      group.add(marker)

      this.group.add(group)
      this.actors.push({
        id: def.id,
        name: def.name,
        group,
        body,
        head,
        armL,
        armR,
        marker,
        baseYaw: spot.yaw,
        phase: Math.random() * Math.PI * 2,
      })
    }
  }

  private buildCampfire(): Campfire {
    const group = new THREE.Group()
    group.position.set(CAMPFIRE_POINT.x, DECK_Y, CAMPFIRE_POINT.z)

    const stoneMat = new THREE.MeshStandardMaterial({ color: '#7a7f76', roughness: 1, flatShading: true })
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), stoneMat)
      stone.position.set(Math.cos(angle) * 0.68, 0.1, Math.sin(angle) * 0.68)
      stone.rotation.set(angle * 0.7, angle, 0)
      stone.castShadow = true
      group.add(stone)
    }

    const logMat = new THREE.MeshStandardMaterial({ color: '#53351f', roughness: 0.95, flatShading: true })
    for (let i = 0; i < 4; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.95, 5), logMat)
      const angle = (i / 4) * Math.PI * 2 + 0.3
      log.position.set(Math.cos(angle) * 0.22, 0.16, Math.sin(angle) * 0.22)
      log.rotation.set(Math.PI / 2 - 0.55, angle, 0)
      log.castShadow = true
      group.add(log)
    }

    const emberPositions = new Float32Array(40 * 3)
    const emberSeed: number[] = []
    for (let i = 0; i < 40; i++) {
      emberPositions[i * 3] = (Math.random() - 0.5) * 0.7
      emberPositions[i * 3 + 1] = Math.random() * 1.7
      emberPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.7
      emberSeed.push(Math.random() * Math.PI * 2, 0.4 + Math.random() * 0.9)
    }
    const emberGeo = new THREE.BufferGeometry()
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3))
    const embers = new THREE.Points(
      emberGeo,
      new THREE.PointsMaterial({
        size: 0.055,
        color: '#ffc061',
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    group.add(embers)

    const flames: THREE.Mesh[] = []
    const flameSpecs = [
      { color: '#ff8a2b', radius: 0.34, height: 0.95, opacity: 0.55 },
      { color: '#ffc85a', radius: 0.24, height: 0.7, opacity: 0.7 },
      { color: '#fff3c0', radius: 0.12, height: 0.45, opacity: 0.8 },
    ]
    for (const spec of flameSpecs) {
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(spec.radius, spec.height, 7),
        new THREE.MeshBasicMaterial({
          color: spec.color,
          transparent: true,
          opacity: spec.opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      flame.position.y = 0.2 + spec.height / 2
      flames.push(flame)
      group.add(flame)
    }

    const pot = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 10, 7),
      new THREE.MeshStandardMaterial({ color: '#3d4546', roughness: 0.55, metalness: 0.45, flatShading: true }),
    )
    pot.scale.set(1, 0.72, 1)
    pot.position.y = 1.35
    pot.castShadow = true
    group.add(pot)
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.025, 4, 14, Math.PI),
      new THREE.MeshStandardMaterial({ color: '#6d7776', roughness: 0.5, metalness: 0.5 }),
    )
    handle.position.y = 1.55
    handle.rotation.y = Math.PI / 2
    group.add(handle)

    const tripodMat = new THREE.MeshStandardMaterial({ color: '#4c4033', roughness: 0.9, flatShading: true })
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 2.0, 4), tripodMat)
      pole.position.set(Math.cos(angle) * 0.42, 1.0, Math.sin(angle) * 0.42)
      pole.rotation.z = Math.cos(angle) * 0.24
      pole.rotation.x = -Math.sin(angle) * 0.24
      group.add(pole)
    }

    const smoke: THREE.Sprite[] = []
    for (let i = 0; i < 4; i++) {
      const puff = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: smokeTexture,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
        }),
      )
      puff.position.set((Math.random() - 0.5) * 0.2, 1.9 + i * 0.5, (Math.random() - 0.5) * 0.2)
      const scale = 0.7 + i * 0.22
      puff.scale.set(scale, scale, 1)
      group.add(puff)
      smoke.push(puff)
    }

    const light = new THREE.PointLight('#ff9a4a', 7, 15, 2)
    light.position.y = 1.1
    group.add(light)

    this.group.add(group)
    return { group, flames, light, smoke, embers, emberPositions, emberSeed }
  }

  update(time: number, dt: number, player: THREE.Vector3) {
    for (const actor of this.actors) {
      const dx = player.x - actor.group.position.x
      const dz = player.z - actor.group.position.z
      const dist = Math.hypot(dx, dz)
      const breathe = Math.sin(time * 1.35 + actor.phase)
      actor.body.scale.set(1 + breathe * 0.012, 1 + breathe * 0.025, 1 + breathe * 0.012)
      actor.head.position.y = 1.45 + breathe * 0.022
      actor.head.rotation.z = Math.sin(time * 0.8 + actor.phase) * 0.05
      actor.armL.rotation.x = Math.sin(time * 1.05 + actor.phase) * 0.1
      actor.armR.rotation.x = Math.sin(time * 1.05 + actor.phase + 1.4) * 0.1
      actor.group.rotation.z = Math.sin(time * 0.75 + actor.phase) * 0.018

      const near = dist < NPC_TALK_RADIUS
      if (dist < 9) {
        const targetYaw = Math.atan2(dx, dz)
        let delta = targetYaw - actor.group.rotation.y
        while (delta > Math.PI) delta -= Math.PI * 2
        while (delta < -Math.PI) delta += Math.PI * 2
        actor.group.rotation.y += delta * (1 - Math.exp(-dt * (near ? 3 : 1.2)))
        actor.head.rotation.y = THREE.MathUtils.clamp(delta, -0.5, 0.5) * 0.55
      } else {
        let delta = actor.baseYaw - actor.group.rotation.y
        while (delta > Math.PI) delta -= Math.PI * 2
        while (delta < -Math.PI) delta += Math.PI * 2
        actor.group.rotation.y += delta * (1 - Math.exp(-dt * 0.8))
        actor.head.rotation.y *= 0.92
      }

      actor.marker.visible = dist < 10
      if (actor.marker.visible) {
        const pulse = near ? 1 + Math.sin(time * 5) * 0.12 : 1
        actor.marker.scale.setScalar(0.58 * pulse)
        actor.marker.position.y = 2.35 + Math.sin(time * 2.2 + actor.phase) * 0.09
        const material = actor.marker.material as THREE.SpriteMaterial
        material.opacity = near ? 1 : 0.55
      }
    }

    const fire = this.fire
    fire.flames.forEach((flame, i) => {
      const flicker = Math.sin(time * (9 + i * 2.3) + i) * 0.12 + Math.sin(time * 15 + i * 1.7) * 0.06
      flame.scale.set(1 + flicker, 1 + Math.abs(flicker) * 1.8, 1 + flicker)
      flame.rotation.y = time * (1.1 + i * 0.37)
      const material = flame.material as THREE.MeshBasicMaterial
      material.opacity = (0.5 + i * 0.12) * (0.85 + Math.abs(flicker))
    })
    fire.light.intensity = 6.2 + Math.sin(time * 11) * 1.4 + Math.sin(time * 23.7) * 0.8

    const positions = fire.embers.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < positions.count; i++) {
      const seed = i * 2
      let y = positions.getY(i) + dt * fire.emberSeed[seed + 1]
      let x = positions.getX(i) + Math.sin(time * 2.4 + fire.emberSeed[seed]) * dt * 0.22
      let z = positions.getZ(i) + Math.cos(time * 2.1 + fire.emberSeed[seed]) * dt * 0.18
      if (y > 2.0) {
        y = 0.2
        x = (Math.random() - 0.5) * 0.5
        z = (Math.random() - 0.5) * 0.5
      }
      positions.setXYZ(i, x, y, z)
    }
    positions.needsUpdate = true

    fire.smoke.forEach((puff, i) => {
      puff.position.y += dt * (0.24 + i * 0.05)
      puff.position.x += Math.sin(time * 0.9 + i * 1.7) * dt * 0.12
      const material = puff.material as THREE.SpriteMaterial
      material.opacity = 0.22 * Math.max(0.15, 1 - (puff.position.y - 1.9) / 3.4)
      material.rotation = Math.sin(time * 0.5 + i) * 0.4
      if (puff.position.y > 4.6) puff.position.y = 1.9
    })
  }

  nearestNpc(origin: THREE.Vector3, maxDistance = NPC_TALK_RADIUS) {
    let best: { id: string; name: string; distance: number } | null = null
    for (const actor of this.actors) {
      const distance = Math.hypot(
        actor.group.position.x - origin.x,
        actor.group.position.z - origin.z,
      )
      if (distance > maxDistance) continue
      if (!best || distance < best.distance) {
        best = { id: actor.id, name: actor.name, distance }
      }
    }
    return best
  }

  campfireDistance(origin: THREE.Vector3) {
    return Math.hypot(origin.x - CAMPFIRE_POINT.x, origin.z - CAMPFIRE_POINT.z)
  }

  npcPositions() {
    return this.actors.map((actor) => ({
      id: actor.id,
      x: actor.group.position.x,
      z: actor.group.position.z,
    }))
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.group)
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry.dispose()
        const material = obj.material as THREE.Material
        material.dispose()
      } else if (obj instanceof THREE.Sprite) {
        obj.material.dispose()
      }
    })
    markerTexture?.dispose()
    markerTexture = null
  }
}

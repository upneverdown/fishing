import * as THREE from 'three'
import type { SeasonId } from '@/types'
import type { World } from '@/game/world/world'

const COUNT = 44
const SPREAD = 24
const PALETTE = ['#b9a24b', '#c98f3e', '#9aa64f', '#8f6f3a', '#d4b05c']

const SEASON_PALETTE: Record<SeasonId, string[] | null> = {
  spring: ['#f3b6c6', '#f7c9d4', '#e8a2b6', '#ffe1e8'],
  summer: ['#5b9550', '#6aa55b', '#4a8247', '#7dab5c'],
  autumn: PALETTE,
  winter: null,
}

interface LeafState {
  phase: number
  spin: number
  drift: number
  scale: number
}

export class FloatingLeaves {
  private mesh: THREE.InstancedMesh
  private states: LeafState[] = []
  private dummy = new THREE.Object3D()
  private spots: THREE.Vector3[] = []
  private color = new THREE.Color()
  private seasonVisible = true
  private hidden = false

  constructor(
    private scene: THREE.Scene,
    private world: World,
  ) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [0, 0.2, 0, 0.115, 0.03, 0, 0, -0.17, 0, -0.115, 0.03, 0],
        3,
      ),
    )
    geo.setIndex([0, 1, 2, 0, 2, 3])
    geo.computeVertexNormals()

    const mat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.82,
      metalness: 0,
      side: THREE.DoubleSide,
    })

    this.mesh = new THREE.InstancedMesh(geo, mat, COUNT)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.mesh.frustumCulled = false

    for (let i = 0; i < COUNT; i++) {
      this.states.push({
        phase: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.25,
        drift: 0.55 + Math.random() * 0.9,
        scale: 1.1 + Math.random() * 1.0,
      })
      this.spots.push(new THREE.Vector3())
      this.color.set(PALETTE[i % PALETTE.length])
      this.mesh.setColorAt(i, this.color)
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
    scene.add(this.mesh)
  }

  update(time: number, dt: number, center: THREE.Vector3) {
    const windX = 0.055 + Math.sin(time * 0.07) * 0.03
    const windZ = 0.022 + Math.cos(time * 0.05) * 0.02

    for (let i = 0; i < COUNT; i++) {
      const s = this.states[i]
      const spot = this.spots[i]

      if (spot.lengthSq() === 0) {
        const angle = Math.random() * Math.PI * 2
        const radius = 3 + Math.sqrt(Math.random()) * SPREAD
        spot.set(center.x + Math.cos(angle) * radius, 0, center.z + Math.sin(angle) * radius)
      } else {
        spot.x += windX * s.drift * dt
        spot.z += windZ * s.drift * dt
      }

      const dx = spot.x - center.x
      const dz = spot.z - center.z
      if (dx * dx + dz * dz > SPREAD * SPREAD) {
        const angle = Math.atan2(dz, dx) + Math.PI + (Math.random() - 0.5) * 0.8
        const radius = SPREAD * (0.72 + Math.random() * 0.28)
        spot.set(center.x + Math.cos(angle) * radius, 0, center.z + Math.sin(angle) * radius)
      }
      if (Math.hypot(dx, dz) < 1.9) {
        spot.x += dx / Math.max(0.6, Math.hypot(dx, dz)) * 0.9
        spot.z += dz / Math.max(0.6, Math.hypot(dx, dz)) * 0.9
      }

      const bob = this.world.waveHeight(spot.x, spot.z, time)
      const tilt = Math.sin(time * 1.3 + s.phase) * 0.09
      const yaw = s.phase + time * s.spin

      this.dummy.position.set(spot.x, bob + 0.035, spot.z)
      this.dummy.rotation.set(-Math.PI / 2 + tilt, yaw, tilt * 0.6, 'YXZ')
      this.dummy.scale.setScalar(s.scale)
      this.dummy.updateMatrix()
      this.mesh.setMatrixAt(i, this.dummy.matrix)
    }
    this.mesh.instanceMatrix.needsUpdate = true
  }

  setSeason(season: SeasonId) {
    const palette = SEASON_PALETTE[season]
    this.seasonVisible = palette !== null
    this.mesh.visible = this.seasonVisible && !this.hidden
    if (!palette) return
    for (let i = 0; i < COUNT; i++) {
      this.color.set(palette[i % palette.length])
      this.mesh.setColorAt(i, this.color)
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
  }

  setVisible(visible: boolean) {
    this.hidden = !visible
    this.mesh.visible = visible && this.seasonVisible
  }

  dispose() {
    this.scene.remove(this.mesh)
    this.mesh.geometry.dispose()
    const material = this.mesh.material as THREE.Material
    material.dispose()
    this.mesh.dispose()
  }
}

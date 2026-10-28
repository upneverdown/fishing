import * as THREE from 'three'
import type { FactionDef } from '@/game/cultivation/factions'

const MAX = 160
const RADIUS = 2.6

function softSprite() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.4, 'rgba(255,255,255,0.62)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** 阵营气运：仙道金青浮升、魔道赤黑沉坠，只动粒子与材质色 */
export class FactionAura {
  private points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  private positions = new Float32Array(MAX * 3)
  private angles = new Float32Array(MAX)
  private radii = new Float32Array(MAX)
  private speeds = new Float32Array(MAX)
  private band = new Float32Array(MAX)
  private rise = 1
  private spin = 0.22
  private active = false

  constructor(scene: THREE.Scene) {
    const geometry = new THREE.BufferGeometry()
    const colors = new Float32Array(MAX * 3)
    for (let i = 0; i < MAX; i++) {
      this.angles[i] = Math.random() * Math.PI * 2
      this.radii[i] = 0.9 + Math.random() * RADIUS
      this.speeds[i] = 0.7 + Math.random() * 1.5
      this.band[i] = Math.random()
      colors[i * 3] = 1
      colors[i * 3 + 1] = 1
      colors[i * 3 + 2] = 1
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 0.34,
      map: softSprite(),
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      opacity: 0.7,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    })

    this.points = new THREE.Points(geometry, material)
    this.points.frustumCulled = false
    this.points.renderOrder = 4
    this.points.visible = false
    scene.add(this.points)
  }

  setFaction(faction: FactionDef | null) {
    this.active = Boolean(faction)
    this.points.visible = this.active
    if (!faction) return
    this.rise = faction.aura.rise
    this.spin = faction.aura.spin
    const material = this.points.material
    material.size = faction.aura.size
    material.opacity = faction.aura.opacity
    // 仙气要发光所以叠加，魔气是黑烟所以直接压暗背景
    material.blending = faction.aura.rise < 0 ? THREE.NormalBlending : THREE.AdditiveBlending
    material.needsUpdate = true

    const colorAttr = this.points.geometry.getAttribute('color') as THREE.BufferAttribute
    const colors = colorAttr.array as Float32Array
    const core = new THREE.Color(faction.aura.core)
    const halo = new THREE.Color(faction.aura.halo)
    const mix = new THREE.Color()
    for (let i = 0; i < MAX; i++) {
      mix.copy(core).lerp(halo, (i % 5) / 5)
      colors[i * 3] = mix.r
      colors[i * 3 + 1] = mix.g
      colors[i * 3 + 2] = mix.b
    }
    colorAttr.needsUpdate = true
  }

  update(time: number, dt: number, center: THREE.Vector3) {
    if (!this.active) return
    this.points.position.copy(center)
    for (let i = 0; i < MAX; i++) {
      const x = i * 3
      const y = x + 1
      const z = x + 2
      this.angles[i] += this.spin * this.speeds[i] * dt
      const wobble = Math.sin(time * 1.1 + i * 2.7) * 0.16
      const r = this.radii[i] + wobble
      this.positions[x] = Math.cos(this.angles[i]) * r
      this.positions[z] = Math.sin(this.angles[i]) * r
      this.positions[y] += this.rise * this.speeds[i] * 0.9 * dt
      // 仙气升到头顶回落，魔气沉到水面再浮起，形成无尽循环
      if (this.rise > 0 && this.positions[y] > 3.4) this.positions[y] = -0.6
      else if (this.rise > 0 && this.positions[y] < -0.8) this.positions[y] = 0.2
      else if (this.rise < 0 && this.positions[y] < -1.4) this.positions[y] = 3.1
      else if (this.rise < 0 && this.positions[y] > 3.2) this.positions[y] = 0.4
    }
    ;(this.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
  }

  dispose() {
    this.points.geometry.dispose()
    this.points.material.map?.dispose()
    this.points.material.dispose()
    this.points.removeFromParent()
  }
}

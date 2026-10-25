import * as THREE from 'three'
import type { ParticleProfile } from '@/game/world/seasons'

const COUNT = 320
const SPREAD = 34

function softSprite() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.7)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export class SeasonFx {
  private points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  private positions: Float32Array
  private seeds: Float32Array
  private kind: ParticleProfile['kind'] = 'petal'
  private fall = 0.35
  private drift = 0.5

  constructor(scene: THREE.Scene) {
    const geometry = new THREE.BufferGeometry()
    this.positions = new Float32Array(COUNT * 3)
    this.seeds = new Float32Array(COUNT * 2)
    const colors = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      this.positions[i * 3] = (Math.random() * 2 - 1) * SPREAD
      this.positions[i * 3 + 1] = 0.4 + Math.random() * 16
      this.positions[i * 3 + 2] = (Math.random() * 2 - 1) * SPREAD
      this.seeds[i * 2] = Math.random() * Math.PI * 2
      this.seeds[i * 2 + 1] = 0.55 + Math.random() * 0.9
      colors[i * 3] = 1
      colors[i * 3 + 1] = 1
      colors[i * 3 + 2] = 1
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 0.32,
      map: softSprite(),
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      opacity: 0.85,
      sizeAttenuation: true,
      blending: THREE.NormalBlending,
    })

    this.points = new THREE.Points(geometry, material)
    this.points.frustumCulled = false
    this.points.renderOrder = 3
    scene.add(this.points)
  }

  setSeason(profile: ParticleProfile) {
    this.kind = profile.kind
    this.fall = profile.fall
    this.drift = profile.drift
    const material = this.points.material
    material.size = profile.size
    material.opacity = profile.opacity
    material.blending = profile.additive ? THREE.AdditiveBlending : THREE.NormalBlending
    material.needsUpdate = true

    const colorAttr = this.points.geometry.getAttribute('color') as THREE.BufferAttribute
    const colors = colorAttr.array as Float32Array
    const color = new THREE.Color()
    for (let i = 0; i < COUNT; i++) {
      color.set(profile.colors[i % profile.colors.length])
      const shift = Math.sin(i * 7.31) * 0.04
      color.offsetHSL(0, 0, shift)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }
    colorAttr.needsUpdate = true
  }

  update(time: number, dt: number, center: THREE.Vector3) {
    this.points.position.set(center.x, 0, center.z)
    const firefly = this.kind === 'firefly'
    for (let i = 0; i < COUNT; i++) {
      const seed = this.seeds[i * 2]
      const speed = this.seeds[i * 2 + 1]
      const x = i * 3
      const y = i * 3 + 1
      const z = i * 3 + 2

      this.positions[x] += (this.drift * 0.55 + Math.sin(time * 0.6 + seed) * 0.35) * speed * dt
      this.positions[z] += Math.cos(time * 0.43 + seed * 1.7) * 0.25 * dt
      if (firefly) {
        this.positions[y] += Math.sin(time * 1.3 + seed) * 0.22 * dt
      } else {
        this.positions[y] -= this.fall * speed * dt
      }

      if (firefly && (this.positions[y] > 5.5 || this.positions[y] < 0.25)) {
        this.positions[y] = 0.5 + Math.random() * 4
      }

      if (
        this.positions[y] < 0.05 ||
        Math.abs(this.positions[x]) > SPREAD ||
        Math.abs(this.positions[z]) > SPREAD
      ) {
        this.positions[x] = (Math.random() * 2 - 1) * SPREAD
        this.positions[z] = (Math.random() * 2 - 1) * SPREAD
        this.positions[y] = firefly ? 0.5 + Math.random() * 4 : 10 + Math.random() * 18
      }
    }
    ;(this.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
  }

  setVisible(visible: boolean) {
    this.points.visible = visible
  }

  dispose() {
    this.points.geometry.dispose()
    this.points.material.map?.dispose()
    this.points.material.dispose()
    this.points.removeFromParent()
  }
}

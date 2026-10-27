import * as THREE from 'three'

const MAX = 260

function sprayTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,0.95)')
  grad.addColorStop(0.35, 'rgba(196,246,255,0.72)')
  grad.addColorStop(1, 'rgba(120,220,235,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 64, 64)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export class WakeSpray {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>

  private positions: Float32Array
  private colors: Float32Array
  private velocities: Float32Array
  private life: Float32Array
  private maxLife: Float32Array
  private cursor = 0
  private emitTimer = 0

  constructor() {
    const geometry = new THREE.BufferGeometry()
    this.positions = new Float32Array(MAX * 3)
    this.colors = new Float32Array(MAX * 3)
    this.velocities = new Float32Array(MAX * 3)
    this.life = new Float32Array(MAX)
    this.maxLife = new Float32Array(MAX)
    for (let i = 0; i < MAX; i++) this.positions[i * 3 + 1] = -999
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))

    const material = new THREE.PointsMaterial({
      size: 0.62,
      map: sprayTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      sizeAttenuation: true,
    })
    this.points = new THREE.Points(geometry, material)
    this.points.frustumCulled = false
    this.points.renderOrder = 4
  }

  emit(
    stern: THREE.Vector3,
    forward: THREE.Vector3,
    right: THREE.Vector3,
    speed: number,
    boosting: boolean,
    dt: number,
  ) {
    if (speed < 1.1) return
    this.emitTimer += dt * (boosting ? 70 : 22) * Math.min(1, speed / 6)
    const count = Math.floor(this.emitTimer)
    this.emitTimer -= count
    for (let n = 0; n < count; n++) {
      const i = this.cursor
      this.cursor = (this.cursor + 1) % MAX
      const lateral = (Math.random() - 0.5) * (boosting ? 1.5 : 0.8)
      this.positions[i * 3] = stern.x + right.x * lateral
      this.positions[i * 3 + 1] = stern.y + 0.05 + Math.random() * 0.12
      this.positions[i * 3 + 2] = stern.z + right.z * lateral
      const back = (boosting ? 2.6 : 1.5) + Math.random() * 1.4
      this.velocities[i * 3] = -forward.x * back + right.x * lateral * 1.6 + (Math.random() - 0.5) * 0.8
      this.velocities[i * 3 + 1] = (boosting ? 1.6 : 0.9) + Math.random() * 1.1
      this.velocities[i * 3 + 2] = -forward.z * back + right.z * lateral * 1.6 + (Math.random() - 0.5) * 0.8
      const life = (boosting ? 0.9 : 0.55) + Math.random() * 0.5
      this.life[i] = life
      this.maxLife[i] = life
      this.colors[i * 3] = 0.78
      this.colors[i * 3 + 1] = 0.98
      this.colors[i * 3 + 2] = 1
    }
  }

  update(dt: number) {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue
      this.life[i] -= dt
      if (this.life[i] <= 0) {
        this.positions[i * 3 + 1] = -999
        this.colors[i * 3] = 0
        this.colors[i * 3 + 1] = 0
        this.colors[i * 3 + 2] = 0
        continue
      }
      this.positions[i * 3] += this.velocities[i * 3] * dt
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt
      this.velocities[i * 3 + 1] -= 4.6 * dt
      this.velocities[i * 3] *= Math.exp(-1.9 * dt)
      this.velocities[i * 3 + 2] *= Math.exp(-1.9 * dt)
      const k = this.life[i] / this.maxLife[i]
      this.colors[i * 3] = 0.55 * k
      this.colors[i * 3 + 1] = 0.92 * k
      this.colors[i * 3 + 2] = k
    }
    const geo = this.points.geometry
    ;(geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    ;(geo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true
  }

  dispose() {
    const material = this.points.material as THREE.PointsMaterial
    material.map?.dispose()
    material.dispose()
    this.points.geometry.dispose()
  }
}

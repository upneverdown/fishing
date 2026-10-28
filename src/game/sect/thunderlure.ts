import * as THREE from 'three'

const TAU = Math.PI * 2
const MAX_BOLTS = 12
const MAX_WAVES = 5

function boltTexture() {
  const w = 128
  const h = 512
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, w, h)
  ctx.strokeStyle = '#eaf6ff'
  ctx.shadowColor = '#7ed4ff'
  ctx.shadowBlur = 24
  ctx.lineWidth = 11
  ctx.lineJoin = 'round'
  ctx.beginPath()
  let x = w / 2
  ctx.moveTo(x, 6)
  for (let y = 32; y <= h - 6; y += 32) {
    x += (Math.random() - 0.5) * 66
    x = Math.max(12, Math.min(w - 12, x))
    ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.shadowBlur = 6
  ctx.lineWidth = 3
  ctx.strokeStyle = '#ffffff'
  ctx.stroke()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function ringTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.4, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.62, 'rgba(190,236,255,0.85)')
  g.addColorStop(0.88, 'rgba(126,212,255,0.35)')
  g.addColorStop(1, 'rgba(126,212,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

interface Bolt {
  sprite: THREE.Sprite
  age: number
  life: number
}

interface Wave {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  age: number
  life: number
}

/** 《天雷引》的雷柱与雷域：只做特效，渔获结算由调用方处理 */
export class ThunderLure {
  readonly group = new THREE.Group()

  private bolts: (Bolt | undefined)[] = []
  private waves: Wave[] = []
  private sheet = boltTexture()
  private ring = ringTexture()
  private cursor = 0
  /** 全场只挂一盏灯：动态增删点光源会让所有材质重编译 */
  private flash = new THREE.PointLight('#bfe8ff', 0, 78, 2)
  private flashAge = 99

  constructor(scene: THREE.Scene) {
    this.flash.castShadow = false
    this.group.add(this.flash)
    scene.add(this.group)
  }

  /** 在 center 落下雷击，radius 为雷域半径 */
  strike(center: THREE.Vector3, radius: number, bolts = 3) {
    const count = Math.max(1, Math.min(bolts, MAX_BOLTS))
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * TAU + Math.random() * 0.8
      const reach = i === 0 ? 0 : radius * (0.25 + Math.random() * 0.6)
      this.spawnBolt(center.x + Math.cos(angle) * reach, center.z + Math.sin(angle) * reach)
    }
    this.spawnWave(center, radius)
    this.flash.position.set(center.x, 5, center.z)
    this.flashAge = 0
  }

  private spawnBolt(x: number, z: number) {
    const slot = this.cursor % MAX_BOLTS
    this.cursor += 1
    this.disposeBolt(this.bolts[slot])

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.sheet,
        color: '#dff2ff',
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    sprite.position.set(x, 26, z)
    sprite.scale.set(7, 52, 1)
    sprite.renderOrder = 6
    this.group.add(sprite)
    this.bolts[slot] = { sprite, age: 0, life: 0.5 }
  }

  private spawnWave(center: THREE.Vector3, radius: number) {
    if (this.waves.length >= MAX_WAVES) this.disposeWave(this.waves.shift())
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 2, radius * 2),
      new THREE.MeshBasicMaterial({
        map: this.ring,
        color: '#9fe4ff',
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      }),
    )
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(center.x, 0.35, center.z)
    mesh.scale.setScalar(0.2)
    mesh.renderOrder = 5
    this.group.add(mesh)
    this.waves.push({ mesh, age: 0, life: 0.6 })
  }

  private disposeBolt(bolt?: Bolt) {
    if (!bolt) return
    this.group.remove(bolt.sprite)
    bolt.sprite.material.dispose()
  }

  private disposeWave(wave?: Wave) {
    if (!wave) return
    this.group.remove(wave.mesh)
    wave.mesh.geometry.dispose()
    wave.mesh.material.dispose()
  }

  update(dt: number) {
    for (let i = 0; i < this.bolts.length; i++) {
      const bolt = this.bolts[i]
      if (!bolt) continue
      bolt.age += dt
      const k = bolt.age / bolt.life
      if (k >= 1) {
        this.disposeBolt(bolt)
        this.bolts[i] = undefined
        continue
      }
      bolt.sprite.material.opacity = 1 - k * k
      bolt.sprite.scale.set(7 + k * 5, 52 - k * 6, 1)
    }
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const wave = this.waves[i]
      wave.age += dt
      const k = wave.age / wave.life
      if (k >= 1) {
        this.waves.splice(i, 1)
        this.disposeWave(wave)
        continue
      }
      wave.mesh.scale.setScalar(0.2 + k * 1.05)
      wave.mesh.material.opacity = 0.9 * (1 - k)
    }
    this.flashAge += dt
    this.flash.intensity = Math.max(0, (1 - this.flashAge / 0.45) * 700)
  }

  dispose() {
    for (const bolt of this.bolts) this.disposeBolt(bolt)
    for (const wave of this.waves) this.disposeWave(wave)
    this.bolts = []
    this.waves = []
    this.sheet.dispose()
    this.ring.dispose()
    this.group.removeFromParent()
  }
}

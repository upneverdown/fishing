import * as THREE from 'three'

interface Particle {
  mesh: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>
  velocity: THREE.Vector3
  life: number
  maxLife: number
  baseScale: number
  drag: number
}

interface Ripple {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>
  x: number
  z: number
  life: number
  maxLife: number
  power: number
}

const geometry = new THREE.CircleGeometry(1, 10)
geometry.rotateX(-Math.PI / 2)

const ringGeometry = new THREE.RingGeometry(0.84, 1, 40)
ringGeometry.rotateX(-Math.PI / 2)

export class Foam {
  private particles: Particle[] = []
  private ripples: Ripple[] = []
  private cursor = 0
  private rippleCursor = 0

  constructor(
    scene: THREE.Scene,
    private waveHeight: (x: number, z: number) => number,
    count = 80,
    rippleCount = 18,
  ) {
    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: '#f4fffb',
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.visible = false
      mesh.renderOrder = 3
      mesh.position.y = 0.05
      scene.add(mesh)
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        baseScale: 0.4,
        drag: 2,
      })
    }

    for (let i = 0; i < rippleCount; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: '#e8f8f2',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(ringGeometry, material)
      mesh.visible = false
      mesh.renderOrder = 4
      scene.add(mesh)
      this.ripples.push({ mesh, x: 0, z: 0, life: 0, maxLife: 1, power: 1 })
    }
  }

  private next() {
    const particle = this.particles[this.cursor]
    this.cursor = (this.cursor + 1) % this.particles.length
    return particle
  }

  splash(x: number, z: number, amount = 8, power = 1) {
    for (let i = 0; i < amount; i++) {
      const p = this.next()
      const angle = Math.random() * Math.PI * 2
      const speed = (0.7 + Math.random() * 1.6) * power
      p.velocity.set(Math.cos(angle) * speed, 0, Math.sin(angle) * speed)
      p.mesh.position.set(x + Math.cos(angle) * 0.1, this.waveHeight(x, z) + 0.05, z + Math.sin(angle) * 0.1)
      p.mesh.visible = true
      p.life = 0.55 + Math.random() * 0.5
      p.maxLife = p.life
      p.baseScale = (0.16 + Math.random() * 0.18) * power
      p.mesh.scale.setScalar(p.baseScale)
      p.drag = 3.2
    }
  }

  wake(x: number, z: number, spread = 1) {
    const p = this.next()
    p.velocity.set((Math.random() - 0.5) * spread, 0, (Math.random() - 0.5) * spread)
    p.mesh.position.set(x, this.waveHeight(x, z) + 0.05, z)
    p.mesh.visible = true
    p.life = 0.9 + Math.random() * 0.6
    p.maxLife = p.life
    p.baseScale = 0.22 + Math.random() * 0.22
    p.mesh.scale.setScalar(p.baseScale)
    p.drag = 1.6
  }

  ripple(x: number, z: number, power = 1) {
    const r = this.ripples[this.rippleCursor]
    this.rippleCursor = (this.rippleCursor + 1) % this.ripples.length
    r.x = x
    r.z = z
    r.power = power
    r.life = 1.15 + Math.random() * 0.55
    r.maxLife = r.life
    r.mesh.position.set(x, this.waveHeight(x, z) + 0.035, z)
    r.mesh.scale.setScalar(0.3 * power)
    r.mesh.material.opacity = 0.46
    r.mesh.visible = true
  }

  update(dt: number) {
    for (const p of this.particles) {
      if (!p.mesh.visible) continue
      p.life -= dt
      if (p.life <= 0) {
        p.mesh.visible = false
        p.mesh.material.opacity = 0
        continue
      }
      const t = 1 - p.life / p.maxLife
      p.mesh.position.x += p.velocity.x * dt
      p.mesh.position.z += p.velocity.z * dt
      p.mesh.position.y = this.waveHeight(p.mesh.position.x, p.mesh.position.z) + 0.05
      p.velocity.multiplyScalar(Math.exp(-p.drag * dt))
      const scale = p.baseScale * (1 + t * 2.4)
      p.mesh.scale.setScalar(scale)
      p.mesh.material.opacity = (1 - t) * 0.62
    }

    for (const r of this.ripples) {
      if (!r.mesh.visible) continue
      r.life -= dt
      if (r.life <= 0) {
        r.mesh.visible = false
        r.mesh.material.opacity = 0
        continue
      }
      const t = 1 - r.life / r.maxLife
      r.mesh.scale.setScalar((0.3 + t * 2.6) * r.power)
      r.mesh.position.y = this.waveHeight(r.x, r.z) + 0.035
      r.mesh.material.opacity = Math.pow(1 - t, 1.7) * 0.46
    }
  }
}

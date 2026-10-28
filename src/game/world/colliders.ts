export interface CircleCollider {
  x: number
  z: number
  r: number
}

export interface BoxCollider {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface ColliderSink {
  addCircle: (x: number, z: number, r: number) => void
  addBox: (minX: number, maxX: number, minZ: number, maxZ: number) => void
}

/** Static collision shapes for rocks, piers and other solid props. */
export class CollisionWorld implements ColliderSink {
  readonly circles: CircleCollider[] = []
  readonly boxes: BoxCollider[] = []
  /** 天界海域没有凡间礁石与码头 */
  enabled = true

  addCircle(x: number, z: number, r: number) {
    if (r <= 0) return
    this.circles.push({ x, z, r })
  }

  addBox(minX: number, maxX: number, minZ: number, maxZ: number) {
    this.boxes.push({ minX, maxX, minZ, maxZ })
  }

  circleBlocked(x: number, z: number, radius: number) {
    if (!this.enabled) return false
    for (const circle of this.circles) {
      const reach = circle.r + radius
      const dx = x - circle.x
      const dz = z - circle.z
      if (dx * dx + dz * dz < reach * reach) return true
    }
    for (const box of this.boxes) {
      const cx = Math.max(box.minX, Math.min(x, box.maxX))
      const cz = Math.max(box.minZ, Math.min(z, box.maxZ))
      const dx = x - cx
      const dz = z - cz
      if (dx * dx + dz * dz < radius * radius) return true
    }
    return false
  }

  boatBlocked(
    x: number,
    z: number,
    heading: number,
    halfLength: number,
    halfWidth: number,
  ) {
    if (this.circles.length === 0 && this.boxes.length === 0) return false
    const fx = -Math.sin(heading)
    const fz = -Math.cos(heading)
    const radius = Math.max(0.55, halfWidth * 0.82)
    const centers = Math.max(0, halfLength - radius)
    for (let i = -1; i <= 1; i++) {
      const t = centers * 0.62 * i
      if (this.circleBlocked(x + fx * t, z + fz * t, radius)) return true
    }
    return false
  }

  clear() {
    this.circles.length = 0
    this.boxes.length = 0
  }
}
